// models.js (en la raíz del proyecto, junto con app.json)
import * as tf from "@tensorflow/tfjs";
import { bundleResourceIO } from "@tensorflow/tfjs-react-native";

// 🔄 Función para cargar modelos locales
export const loadLocalModels = async () => {
  console.log("🔄 Cargando modelos desde archivos locales...");

  try {
    // Modelo de letras estáticas
    console.log("📝 Cargando modelo de letras...");
    const staticModel = await tf.loadLayersModel(
      bundleResourceIO(
        require("./assets/models/static_letters_tfjs/model.json"),
        require("./assets/models/static_letters_tfjs/group1-shard1of1.bin")
      )
    );
    console.log("✅ Modelo estático cargado");

    // Modelo de palabras dinámicas
    console.log("🎬 Cargando modelo de palabras...");
    const dynamicModel = await tf.loadLayersModel(
      bundleResourceIO(
        require("./assets/models/actions_40_tfjs/model.json"),
        require("./assets/models/actions_40_tfjs/group1-shard1of1.bin")
      )
    );
    console.log("✅ Modelo dinámico cargado");

    console.log("🎉 Todos los modelos cargados exitosamente");
    return { staticModel, dynamicModel };

  } catch (error) {
    console.error("❌ Error cargando modelos locales:", error);
    throw new Error(`Error cargando modelos: ${error.message}`);
  }
};

// 📊 Configuración de procesamiento
export const PROCESSING_CONFIG = {
  STATIC_CLASSES: [
    "A", "B", "C", "D", "E", "F", "I", "L", "M",
    "N", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "K",
  ],

  DYNAMIC_CLASSES: [
    "gracias",
    "como_estas", 
    "hola",
    "Buenos_dias",
    "Buenas_tardes",
    "Buenas_noches",
  ],

  WORDS_TEXT: {
    gracias: "GRACIAS",
    hola: "HOLA",
    como_estas: "¿CÓMO ESTÁS?",
    Buenos_dias: "BUENOS DÍAS",
    Buenas_tardes: "BUENAS TARDES",
    Buenas_noches: "BUENAS NOCHES",
    A: "A", B: "B", C: "C", D: "D", E: "E", F: "F",
    I: "I", L: "L", M: "M", N: "N", O: "O", P: "P",
    Q: "Q", R: "R", T: "T", U: "U", V: "V", W: "W",
    X: "X", Y: "Y", K: "K",
  },

  STATIC_THRESHOLD: 0.8,
  DYNAMIC_THRESHOLD: 0.7,
  STATIC_FRAMES_REQUIRED: 15,
  PREDICTION_COOLDOWN: 30,
  DYNAMIC_SEQUENCE_LENGTH: 40,

  STATIC_INPUT_SHAPE: [1, 63],       // Modelo de letras
  DYNAMIC_INPUT_SHAPE: [1, 40, 258], // Modelo de palabras
};