// app/(tabs)/sena.jsx - VERSIÓN CORREGIDA PARA MODELOS LOCALES
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// TensorFlow.js imports para React Native
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

// Servicios locales - IMPORTACIÓN DESDE LA RAÍZ
import { loadLocalModels, PROCESSING_CONFIG } from '../../models';

export default function Sena() {
  // Estados principales
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sentence, setSentence] = useState([]);
  const [systemState, setSystemState] = useState({ 
    mode: 'INICIANDO', 
    color: [128, 128, 128], 
    details: 'Inicializando sistema...' 
  });
  
  // Estados de modelos
  const [tfReady, setTfReady] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [models, setModels] = useState({
    staticModel: null,
    dynamicModel: null
  });
  
  // Estados de detección
  const [frameData, setFrameData] = useState(null);
  const [handsDetected, setHandsDetected] = useState(false);
  const [staticFrameCount, setStaticFrameCount] = useState(0);
  const [sequenceBuffer, setSequenceBuffer] = useState([]);
  const [cooldownCounter, setCooldownCounter] = useState(0);
  
  // Referencias
  const cameraRef = useRef(null);
  const processingRef = useRef(false);
  const intervalRef = useRef(null);

  // Inicializar TensorFlow.js
  useEffect(() => {
    const initTensorFlow = async () => {
      try {
        console.log('🔄 Inicializando TensorFlow.js...');
        
        // Asegurar que TensorFlow está listo para React Native
        await tf.ready();
        
        console.log(`✅ TensorFlow.js listo! Backend: ${tf.getBackend()}`);
        setTfReady(true);
        
        setSystemState({
          mode: 'TF_READY',
          color: [0, 255, 0],
          details: 'TensorFlow listo. Cargando modelos locales...'
        });
        
      } catch (error) {
        console.error('❌ Error inicializando TensorFlow:', error);
        setSystemState({
          mode: 'ERROR_TF',
          color: [255, 0, 0],
          details: `Error TF: ${error.message}`
        });
        
        Alert.alert('Error TensorFlow', `Error inicializando TensorFlow.js: ${error.message}`);
      }
    };
    
    initTensorFlow();
  }, []);

  // Cargar modelos LOCALES - USANDO LA FUNCIÓN CORRECTA
  useEffect(() => {
    if (!tfReady) return;
    
    const loadModelsAsync = async () => {
      try {
        console.log('🔄 Cargando modelos desde archivos locales...');
        
        setSystemState({
          mode: 'CARGANDO_MODELOS',
          color: [255, 255, 0],
          details: 'Cargando modelos locales...'
        });

        // Usar la función loadLocalModels del config
        const { staticModel, dynamicModel } = await loadLocalModels();

        setModels({ staticModel, dynamicModel });
        setModelsLoaded(true);
        console.log('🎉 Todos los modelos cargados exitosamente desde archivos locales!');
        
        setSystemState({
          mode: 'LISTO',
          color: [0, 255, 0],
          details: '¡Todo listo! Presiona INICIAR para comenzar.'
        });
        
      } catch (error) {
        console.error('💥 Error cargando modelos locales:', error);
        setSystemState({
          mode: 'ERROR_MODELOS',
          color: [255, 0, 0],
          details: `Error cargando modelos: ${error.message}`
        });
        
        Alert.alert(
          'Error Crítico', 
          `No se pudieron cargar los modelos locales:\n\n${error.message}\n\n¿Tienes los archivos model.json y .bin en la carpeta assets/models?`
        );
      }
    };

    loadModelsAsync();
  }, [tfReady]);

  // Generar keypoints simulados
  const generateMockKeypoints = () => {
    // Generar datos más realistas para la simulación
    return new Array(63).fill(0).map((_, idx) => {
      // Simular coordenadas normalizadas entre -1 y 1
      return (Math.random() - 0.5) * 2;
    });
  };

  // Simular detección de manos - MEJORADO CON MEJOR TIMING
  const simulateHandDetection = () => {
    if (!isRecording || !modelsLoaded) return;
    
    const currentTime = Date.now();
    const cycleTime = (currentTime / 100) % 120; // Ciclo de 12 segundos (120 * 100ms)
    
    console.log(`Ciclo: ${(cycleTime / 10).toFixed(1)}s`);
    
    if (cycleTime < 30) {
      // Primeros 3 segundos: simular manos estáticas (letra)
      setHandsDetected(true);
      setStaticFrameCount(prev => prev + 1);
      
      if (staticFrameCount >= PROCESSING_CONFIG.STATIC_FRAMES_REQUIRED && cooldownCounter === 0) {
        predictStaticLetter();
      }
      
    } else if (cycleTime < 80) {
      // Segundos 3-8: simular movimiento (palabra dinámica)
      setHandsDetected(true);
      setStaticFrameCount(0);
      
      // Acumular frames para secuencia dinámica
      setSequenceBuffer(prev => {
        const newBuffer = [...prev, generateMockKeypoints()];
        return newBuffer.slice(-PROCESSING_CONFIG.DYNAMIC_SEQUENCE_LENGTH);
      });
      
    } else if (cycleTime < 85) {
      // Segundo 8-8.5: manos salen, activar predicción dinámica
      setHandsDetected(false);
      setStaticFrameCount(0);
      
      if (sequenceBuffer.length >= 20 && cooldownCounter === 0) {
        predictDynamicWord();
      }
      
    } else {
      // Resto del tiempo: sin manos
      setHandsDetected(false);
      setStaticFrameCount(0);
      setSequenceBuffer([]);
    }
  };

  // Predicción de letra estática
  const predictStaticLetter = async () => {
    try {
      console.log('🔤 Prediciendo letra estática...');
      
      // Generar datos simulados más realistas
      const mockData = generateMockKeypoints();
      
      // Crear tensor de entrada
      const inputTensor = tf.tensor2d([mockData], [1, 63]);
      
      // Hacer predicción
      const predictions = await models.staticModel.predict(inputTensor);
      const probabilities = await predictions.data();
      
      // Limpiar tensores para evitar memory leaks
      inputTensor.dispose();
      predictions.dispose();

      // Encontrar la clase con mayor probabilidad
      const predIdx = probabilities.indexOf(Math.max(...probabilities));
      const confidence = probabilities[predIdx];
      
      const letters = PROCESSING_CONFIG.STATIC_CLASSES;
      const letterPredicted = letters[predIdx] || 'A';
      
      console.log(`[ESTÁTICA] ${letterPredicted} (${(confidence * 100).toFixed(2)}%)`);
      
      // Solo agregar si pasa el threshold
      if (confidence >= PROCESSING_CONFIG.STATIC_THRESHOLD) {
        setSentence(prev => [letterPredicted, ...prev.slice(0, 9)]);
        
        // Text-to-speech
        Speech.speak(letterPredicted, {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.8,
        });
        
        // Activar cooldown
        setCooldownCounter(PROCESSING_CONFIG.PREDICTION_COOLDOWN);
        setStaticFrameCount(0);
      }
      
    } catch (error) {
      console.error('❌ Error en predicción estática:', error);
    }
  };

  // Predicción de palabra dinámica
  const predictDynamicWord = async () => {
    try {
      console.log('🎬 Prediciendo palabra dinámica...');
      
      // Preparar secuencia de 40 frames
      let normalizedSequence = [...sequenceBuffer];
      
      // Rellenar o truncar a exactamente 40 frames
      if (normalizedSequence.length < PROCESSING_CONFIG.DYNAMIC_SEQUENCE_LENGTH) {
        // Repetir la última secuencia para llegar a 40
        const lastFrame = normalizedSequence[normalizedSequence.length - 1] || generateMockKeypoints();
        while (normalizedSequence.length < PROCESSING_CONFIG.DYNAMIC_SEQUENCE_LENGTH) {
          normalizedSequence.push([...lastFrame]);
        }
      } else {
        normalizedSequence = normalizedSequence.slice(-PROCESSING_CONFIG.DYNAMIC_SEQUENCE_LENGTH);
      }
      
      // Expandir de 63 a 126 dimensiones (ambas manos)
      const expandedSequence = normalizedSequence.map(frame => [
        ...frame, // mano derecha (63)
        ...new Array(63).fill(0) // mano izquierda vacía (63)
      ]);
      
      // Crear tensor 3D para el modelo dinámico
      const inputTensor = tf.tensor3d([expandedSequence], [1, PROCESSING_CONFIG.DYNAMIC_SEQUENCE_LENGTH, 126]);
      
      // Hacer predicción
      const predictions = await models.dynamicModel.predict(inputTensor);
      const probabilities = await predictions.data();
      
      // Limpiar tensores
      inputTensor.dispose();
      predictions.dispose();

      // Encontrar la palabra con mayor probabilidad
      const predIdx = probabilities.indexOf(Math.max(...probabilities));
      const confidence = probabilities[predIdx];
      
      const words = PROCESSING_CONFIG.DYNAMIC_CLASSES;
      const wordPredicted = words[predIdx] || 'hola';
      const displayText = PROCESSING_CONFIG.WORDS_TEXT[wordPredicted] || wordPredicted.toUpperCase();
      
      console.log(`[DINÁMICA] ${displayText} (${(confidence * 100).toFixed(2)}%)`);
      
      // Solo agregar si pasa el threshold
      if (confidence >= PROCESSING_CONFIG.DYNAMIC_THRESHOLD) {
        setSentence(prev => [displayText, ...prev.slice(0, 9)]);
        
        // Text-to-speech
        Speech.speak(displayText, {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.8,
        });
        
        setCooldownCounter(PROCESSING_CONFIG.PREDICTION_COOLDOWN);
      }
      
      setSequenceBuffer([]); // Limpiar buffer después de la predicción
      
    } catch (error) {
      console.error('❌ Error en predicción dinámica:', error);
    }
  };

  // Actualizar estado del sistema
  useEffect(() => {
    if (cooldownCounter > 0) {
      setSystemState({
        mode: 'COOLDOWN',
        color: [100, 100, 255],
        details: `Esperando ${cooldownCounter} frames...`
      });
    } else if (handsDetected) {
      if (staticFrameCount > 15) {
        setSystemState({
          mode: 'DETECTANDO_LETRA',
          color: [0, 255, 0],
          details: `Letra detectada - Frames: ${staticFrameCount}`
        });
      } else {
        setSystemState({
          mode: 'MANOS_DETECTADAS',
          color: [255, 255, 0],
          details: `Acumulando frames: ${staticFrameCount} | Buffer: ${sequenceBuffer.length}`
        });
      }
    } else {
      if (sequenceBuffer.length > 10) {
        setSystemState({
          mode: 'DETECTANDO_PALABRA',
          color: [255, 0, 0],
          details: `Analizando secuencia de ${sequenceBuffer.length} frames`
        });
      } else {
        setSystemState({
          mode: 'ESPERANDO',
          color: [128, 128, 128],
          details: 'Muestra tus manos para comenzar...'
        });
      }
    }
  }, [handsDetected, staticFrameCount, sequenceBuffer.length, cooldownCounter]);

  // Procesar frames continuamente
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        simulateHandDetection();
        if (cooldownCounter > 0) {
          setCooldownCounter(prev => prev - 1);
        }
      }, 100); // Cada 100ms
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, staticFrameCount, sequenceBuffer.length, cooldownCounter, modelsLoaded]);

  // Controles
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setHandsDetected(false);
      setStaticFrameCount(0);
      setSequenceBuffer([]);
      setCooldownCounter(0);
      console.log('⏹️ Detección detenida');
    } else {
      setIsRecording(true);
      console.log('▶️ ¡Detección de señas iniciada!');
    }
  };

  const clearSentence = () => {
    setSentence([]);
    console.log("🧹 Oración limpiada");
  };

  const speakFullSentence = () => {
    if (sentence.length > 0) {
      const fullText = sentence.slice().reverse().join(' ');
      Speech.speak(fullText, {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.8,
      });
      console.log('🔊 Reproduciendo oración completa:', fullText);
    }
  };

  // Función para convertir color array a string CSS
  const colorToRgb = (colorArray) => {
    return `rgb(${colorArray[0]}, ${colorArray[1]}, ${colorArray[2]})`;
  };

  // UI States
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusText}>Solicitando permisos...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusText}>Se necesitan permisos de cámara</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Conceder Permisos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cámara */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="front"
        ref={cameraRef}
        onCameraReady={() => {
          setCameraReady(true);
          console.log('📷 Cámara lista para detección de señas');
        }}
      >
        {/* Overlay principal */}
        <View style={[styles.mainOverlay, { backgroundColor: colorToRgb(systemState.color) }]}>
          <Text style={styles.sentenceText}>
            {sentence.length > 0 ? sentence.slice(0, 4).join(' | ') : 'Esperando señas...'}
          </Text>
          
          <Text style={styles.modeText}>
            {systemState.mode.replace(/_/g, ' ')}
          </Text>
          
          <Text style={styles.detailText}>
            {systemState.details}
          </Text>
          
          {cooldownCounter > 0 && (
            <Text style={styles.cooldownText}>
              Cooldown: {cooldownCounter}
            </Text>
          )}
        </View>

        {/* Estado del sistema */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            TF: {tfReady ? '✅' : '⏳'} | 
            Modelos: {modelsLoaded ? '✅' : '⏳'} |
            Cámara: {isCameraReady ? '✅' : '⏳'} |
            {isRecording ? ' 🔴 DETECTANDO' : ' ⚫ DETENIDO'}
          </Text>
          <Text style={styles.statusText}>
            Manos: {handsDetected ? '👐 SÍ' : '❌ NO'} | 
            Estáticos: {staticFrameCount} | 
            Buffer: {sequenceBuffer.length}
          </Text>
        </View>

        {/* Indicador visual de detección */}
        {handsDetected && (
          <View style={styles.detectionIndicator}>
            <Text style={styles.detectionText}>🤟 MANOS DETECTADAS</Text>
          </View>
        )}
      </CameraView>

      {/* Controles */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.recordButton, 
            isRecording && styles.recordButtonActive,
            (!isCameraReady || !modelsLoaded) && styles.recordButtonDisabled
          ]}
          onPress={toggleRecording}
          disabled={!isCameraReady || !modelsLoaded}
        >
          <Text style={styles.recordButtonText}>
            {isRecording ? 'DETENER' : 'INICIAR'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={clearSentence}>
          <Text style={styles.controlButtonText}>LIMPIAR</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, sentence.length === 0 && styles.controlButtonDisabled]} 
          onPress={speakFullSentence}
          disabled={sentence.length === 0}
        >
          <Text style={styles.controlButtonText}>🔊 LEER</Text>
        </TouchableOpacity>
      </View>

      {/* Oración completa */}
      <View style={styles.fullSentenceContainer}>
        <Text style={styles.fullSentenceLabel}>Palabras detectadas:</Text>
        <Text style={styles.fullSentenceText}>
          {sentence.length > 0 ? sentence.slice().reverse().join(' ') : 'Haz señas frente a la cámara para detectar palabras y letras'}
        </Text>
      </View>
    </View>
  );
}

// ESTILOS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mainOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    padding: 15,
    justifyContent: 'center',
    opacity: 0.85,
  },
  sentenceText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  modeText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 5,
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  detailText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    textAlign: 'center',
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cooldownText: {
    position: 'absolute',
    top: 15,
    right: 15,
    color: 'yellow',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  statusContainer: {
    position: 'absolute',
    top: 150,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    textAlign: 'center',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  detectionIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -25 }],
    backgroundColor: 'rgba(0, 255, 0, 0.8)',
    padding: 10,
    borderRadius: 10,
  },
  detectionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  recordButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 120,
    elevation: 3,
  },
  recordButtonActive: {
    backgroundColor: '#f44336',
  },
  recordButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  controlButton: {
    backgroundColor: '#666',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 2,
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  fullSentenceContainer: {
    padding: 20,
    backgroundColor: '#222',
    borderTopWidth: 1,
    borderTopColor: '#444',
    maxHeight: 120,
  },
  fullSentenceLabel: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  fullSentenceText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  permissionButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});