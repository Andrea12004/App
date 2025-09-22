// services/KeypointsProcessor.js - OPTIMIZADO PARA EXPO SDK 54
import { PROCESSING_CONFIG } from '../models';

export class KeypointsProcessor {
  constructor() {
    this.sequenceBuffer = [];
    this.previousKp = null;
    this.staticCounter = 0;
    this.cooldownCounter = 0;
    this.handsPresent = false;
    this.handsWerePresent = false;
    
    // Constantes optimizadas
    this.MOVEMENT_THRESHOLD = PROCESSING_CONFIG.MOVEMENT_THRESHOLD;
    this.STATIC_FRAMES_REQUIRED = PROCESSING_CONFIG.STATIC_FRAMES_REQUIRED;
    this.PREDICTION_COOLDOWN = PROCESSING_CONFIG.PREDICTION_COOLDOWN;
    this.DYNAMIC_MIN_FRAMES = Math.max(5, PROCESSING_CONFIG.MIN_LENGTH_FRAMES / 2);
    
    console.log('🔧 KeypointsProcessor inicializado');
  }

  // Extraer keypoints completos de MediaPipe Hands (SOLO MANOS)
  extractKeypoints(hands) {
    // Para esta versión simplificada, solo usamos las manos
    // 2 manos × 21 puntos × 3 coordenadas = 126 valores
    let keypoints = new Array(258).fill(0);
    
    try {
      // Mano izquierda (primeros 63 valores)
      const leftHand = hands.find(h => h.handedness === 'Left');
      if (leftHand && leftHand.keypoints) {
        leftHand.keypoints.slice(0, 21).forEach((point, i) => {
          const baseIndex = i * 3;
          keypoints[baseIndex] = point.x || 0;
          keypoints[baseIndex + 1] = point.y || 0;
          keypoints[baseIndex + 2] = point.z || 0;
        });
      }
      
      // Mano derecha (últimos 63 valores)
      const rightHand = hands.find(h => h.handedness === 'Right');
      if (rightHand && rightHand.keypoints) {
        rightHand.keypoints.slice(0, 21).forEach((point, i) => {
          const baseIndex = 63 + (i * 3);
          keypoints[baseIndex] = point.x || 0;
          keypoints[baseIndex + 1] = point.y || 0;
          keypoints[baseIndex + 2] = point.z || 0;
        });
      }
      
    } catch (error) {
      console.warn('⚠️ Error extrayendo keypoints:', error.message);
    }
    
    return keypoints;
  }

  // Extraer keypoints para modelo estático (una sola mano)
  extractHandKeypointsStatic(handsData) {
    try {
      // Buscar mano derecha primero
      const rightHand = handsData.find(h => h.handedness === 'Right');
      if (rightHand && rightHand.keypoints) {
        const keypoints = [];
        rightHand.keypoints.slice(0, 21).forEach((point) => {
          keypoints.push(point.x || 0, point.y || 0, point.z || 0);
        });
        return new Float32Array(keypoints);
      }
      
      // Si no hay derecha, usar izquierda con espejo
      const leftHand = handsData.find(h => h.handedness === 'Left');
      if (leftHand && leftHand.keypoints) {
        const keypoints = [];
        leftHand.keypoints.slice(0, 21).forEach((point) => {
          keypoints.push(-(point.x || 0), point.y || 0, point.z || 0); // Espejo en X
        });
        return new Float32Array(keypoints);
      }
      
    } catch (error) {
      console.warn('⚠️ Error en keypoints estáticos:', error.message);
    }
    
    // Sin manos detectadas
    return new Float32Array(63);
  }

  // Extraer keypoints para modelo dinámico (ambas manos)
  extractKeypointsDynamic(handsData) {
    try {
      const keypoints = [];
      
      // Mano izquierda
      const leftHand = handsData.find(h => h.handedness === 'Left');
      if (leftHand && leftHand.keypoints) {
        leftHand.keypoints.slice(0, 21).forEach((point) => {
          keypoints.push(point.x || 0, point.y || 0, point.z || 0);
        });
      } else {
        keypoints.push(...new Array(63).fill(0));
      }
      
      // Mano derecha  
      const rightHand = handsData.find(h => h.handedness === 'Right');
      if (rightHand && rightHand.keypoints) {
        rightHand.keypoints.slice(0, 21).forEach((point) => {
          keypoints.push(point.x || 0, point.y || 0, point.z || 0);
        });
      } else {
        keypoints.push(...new Array(63).fill(0));
      }
      
      return keypoints; // 126 valores (63 + 63)
      
    } catch (error) {
      console.warn('⚠️ Error en keypoints dinámicos:', error.message);
      return new Array(126).fill(0);
    }
  }

  // Calcular movimiento entre frames
  calculateMovement(kpCurrent, kpPrevious) {
    if (!kpPrevious || kpCurrent.length !== kpPrevious.length) return 0.0;
    
    try {
      let totalDiff = 0;
      for (let i = 0; i < kpCurrent.length; i++) {
        totalDiff += Math.abs(kpCurrent[i] - kpPrevious[i]);
      }
      return totalDiff / kpCurrent.length;
    } catch (error) {
      console.warn('⚠️ Error calculando movimiento:', error.message);
      return 0.0;
    }
  }

  // Normalizar secuencia de keypoints
  normalizeSequence(sequence, targetLength = PROCESSING_CONFIG.MODEL_FRAMES) {
    const currentLength = sequence.length;
    
    if (currentLength === targetLength) {
      return sequence;
    }
    
    if (currentLength < targetLength) {
      // Interpolación lineal
      const result = [];
      for (let i = 0; i < targetLength; i++) {
        const index = (i * (currentLength - 1)) / (targetLength - 1);
        const lowerIdx = Math.floor(index);
        const upperIdx = Math.min(Math.ceil(index), currentLength - 1);
        const weight = index - lowerIdx;
        
        if (lowerIdx === upperIdx) {
          result.push([...sequence[lowerIdx]]);
        } else {
          const interpolated = [];
          for (let j = 0; j < sequence[lowerIdx].length; j++) {
            const val = sequence[lowerIdx][j] + (sequence[upperIdx][j] - sequence[lowerIdx][j]) * weight;
            interpolated.push(val);
          }
          result.push(interpolated);
        }
      }
      return result;
    } else {
      // Submuestreo
      const step = currentLength / targetLength;
      const result = [];
      for (let i = 0; i < targetLength; i++) {
        const index = Math.floor(i * step);
        result.push([...sequence[Math.min(index, currentLength - 1)]]);
      }
      return result;
    }
  }

  // Procesar frame actual
  processFrame(hands) {
    const handsPresent = hands && hands.length > 0;
    
    // Reducir cooldown
    if (this.cooldownCounter > 0) {
      this.cooldownCounter--;
    }
    
    if (handsPresent) {
      // HAY MANOS DETECTADAS
      this.handsWerePresent = true;
      
      // Extraer keypoints del frame
      const kpFrame = this.extractKeypoints(hands);
      this.sequenceBuffer.push(kpFrame);
      
      // Calcular movimiento
      const movement = this.calculateMovement(kpFrame, this.previousKp);
      this.previousKp = [...kpFrame];
      
      // Contar frames estáticos
      if (movement < this.MOVEMENT_THRESHOLD) {
        this.staticCounter++;
      } else {
        this.staticCounter = 0;
      }
      
      this.handsPresent = true;
      
    } else {
      // NO HAY MANOS
      this.staticCounter = 0;
      this.previousKp = null;  
      this.handsPresent = false;
    }
  }

  // Verificar si puede hacer predicción estática
  canPredictStatic() {
    return (
      this.handsPresent && 
      this.staticCounter >= this.STATIC_FRAMES_REQUIRED && 
      this.cooldownCounter === 0
    );
  }

  // Verificar si puede hacer predicción dinámica
  canPredictDynamic() {
    return (
      !this.handsPresent && 
      this.handsWerePresent && 
      this.sequenceBuffer.length >= this.DYNAMIC_MIN_FRAMES && 
      this.cooldownCounter === 0
    );
  }

  // Obtener datos para predicción estática
  getStaticPredictionData(hands) {
    if (!hands || hands.length === 0) return null;
    
    try {
      const handKeypoints = this.extractHandKeypointsStatic(hands);
      
      // Verificar si hay datos válidos
      const maxVal = Math.max(...handKeypoints);
      if (maxVal <= 0) return null;
      
      // Normalizar
      const normalized = Array.from(handKeypoints).map(val => val / maxVal);
      return normalized;
      
    } catch (error) {
      console.error('❌ Error en datos estáticos:', error);
      return null;
    }
  }

  // Obtener datos para predicción dinámica
  getDynamicPredictionData() {
    if (this.sequenceBuffer.length < this.DYNAMIC_MIN_FRAMES) return null;
    
    try {
      // Convertir buffer a secuencia de keypoints dinámicos
      const dynamicSequence = this.sequenceBuffer.map(frame => 
        this.extractKeypointsDynamic([]) // Simplificado por ahora
      );
      
      // Normalizar longitud de secuencia
      const normalized = this.normalizeSequence(dynamicSequence, PROCESSING_CONFIG.MODEL_FRAMES);
      
      console.log(`📊 Secuencia dinámica: ${normalized.length} frames × ${normalized[0]?.length || 0} keypoints`);
      return normalized;
      
    } catch (error) {
      console.error('❌ Error en datos dinámicos:', error);
      return null;
    }
  }

  // Activar cooldown
  activateCooldown() {
    this.cooldownCounter = this.PREDICTION_COOLDOWN;
    if (!this.handsPresent && this.handsWerePresent) {
      this.resetDynamicState();
    }
    if (this.handsPresent) {
      this.staticCounter = 0;
    }
  }

  // Resetear estado dinámico
  resetDynamicState() {
    this.handsWerePresent = false;
    this.sequenceBuffer = [];
  }

  // Obtener estado del sistema
  getSystemState() {
    if (this.cooldownCounter > 0) {
      return {
        mode: 'COOLDOWN',
        color: [100, 100, 255],
        details: `Esperando ${this.cooldownCounter} frames...`
      };
    }

    if (this.handsPresent) {
      if (this.staticCounter >= this.STATIC_FRAMES_REQUIRED) {
        return {
          mode: 'LISTO_ESTATICA',
          color: [0, 255, 0],
          details: `Frames estáticos: ${this.staticCounter} - LISTO PARA PREDICCIÓN`
        };
      } else {
        return {
          mode: 'ACUMULANDO',
          color: [255, 255, 0],
          details: `Buffer: ${this.sequenceBuffer.length} | Estáticos: ${this.staticCounter}/${this.STATIC_FRAMES_REQUIRED}`
        };
      }
    } else {
      if (this.handsWerePresent && this.sequenceBuffer.length >= this.DYNAMIC_MIN_FRAMES) {
        return {
          mode: 'LISTO_DINAMICA',
          color: [255, 0, 0],
          details: `Secuencia de ${this.sequenceBuffer.length} frames - EVALUANDO`
        };
      } else {
        return {
          mode: 'ESPERANDO',
          color: [128, 128, 128],
          details: 'Muestra tus manos para comenzar...'
        };
      }
    }
  }

  // Limpiar todo
  clearAll() {
    this.sequenceBuffer = [];
    this.previousKp = null;
    this.staticCounter = 0;
    this.cooldownCounter = 0;
    this.handsPresent = false;
    this.handsWerePresent = false;
    console.log('🧹 Processor limpiado');
  }
}