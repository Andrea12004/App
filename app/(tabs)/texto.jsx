import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from "axios";
import { Audio, Video } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import styled from "styled-components/native";

const ASSEMBLYAI_API_KEY = "e670ffe4ed9c4437b7640bc70bb10dfd"; 

export default function Texto() {
  const [frase, setFrase] = useState("");
  const [videos, setVideos] = useState([]);
  const [actual, setActual] = useState(0);
  const [cargando, setCargando] = useState(false);
  const videoRef = useRef(null);

  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  // 🎤 Iniciar grabación
  const startRecording = async () => {
    try {
      console.log("Solicitando permisos...");
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Se requieren permisos para grabar audio");
        return;
      }

      console.log("Iniciando grabación...");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      console.log("Grabando...");
    } catch (err) {
      console.error("Error al iniciar grabación:", err);
    }
  };

  // ⏹️ Detener grabación y enviar a AssemblyAI
  const stopRecording = async () => {
    console.log("Deteniendo grabación...");
    setRecording(undefined);
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log("Archivo grabado en:", uri);

    // Subir archivo a AssemblyAI
    const audioData = await fetch(uri);
    const blob = await audioData.blob();

    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        authorization: ASSEMBLYAI_API_KEY,
        "content-type": "application/octet-stream",
      },
      body: blob,
    });

    const uploadJson = await uploadRes.json();
    console.log("Subida AssemblyAI:", uploadJson);

    // Crear transcripción
    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: ASSEMBLYAI_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ audio_url: uploadJson.upload_url }),
    });

    const transcriptJson = await transcriptRes.json();
    console.log("Transcripción creada:", transcriptJson);

    // Polling hasta que termine
    let transcript = transcriptJson;
    while (transcript.status !== "completed") {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcript.id}`,
        {
          headers: { authorization: ASSEMBLYAI_API_KEY },
        }
      );
      transcript = await res.json();
      console.log("Estado:", transcript.status);
    }

    setFrase(transcript.text);
  };

  const enviarFrase = async () => {
    Keyboard.dismiss();
    setCargando(true);
    setVideos([]);
    setActual(0);
    try {
      const res = await axios.post("https://traductor-texto.onrender.com/procesar", {
        texto: frase,
      });

      const lista = res.data.videos;
      setVideos(lista);
    } catch (error) {
      console.log("Error:", error);
    }
    setCargando(false);
  };

  const avanzarVideo = () => {
    if (actual + 1 < videos.length) {
      setActual(actual + 1);
    } else {
      setVideos([]);
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.stopAsync().then(() => {
        videoRef.current.playAsync();
      });
    }
  }, [actual]);

  return (
    <Container>
      <CardGradient colors={["#1E3A8A", "#00C0C7"]}>
        <HeaderTitle>SeñasCol</HeaderTitle>
        <HeaderSubtitle>Texto a Señas</HeaderSubtitle>
      </CardGradient>

      <View>
        <InputContainer>
          <InputLabel>📝 Escribe tu mensaje</InputLabel>
          <StyledTextInput
            placeholder="Ej: Hola, ¿cómo estás?"
            value={frase}
            onChangeText={setFrase}
            multiline
            maxLength={100}
            placeholderTextColor="#6C757D"
          />
          <MicButton onPress={isRecording ? stopRecording : startRecording}>
            {isRecording ? (
              <MaterialCommunityIcons name="stop-circle" size={28} color="#000000ff" />
            ) : (
              <MaterialCommunityIcons name="microphone" size={28} color="#000000ff" />
            )}
            <MicText>{isRecording ? " Detener" : " Grabar"}</MicText>
         </MicButton>
          <CharacterCount>{frase.length}/100</CharacterCount>

        </InputContainer>


        <TranslateButton
          loading={cargando}
          onPress={enviarFrase}
          disabled={cargando}
        >
          <ButtonText>
            {cargando ? "Traduciendo..." : "Traducir a Señas"}
          </ButtonText>
        </TranslateButton>

        {cargando && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

        {videos.length > 0 && actual < videos.length && (
          <VideoWrapper>
            <StyledVideo
              ref={videoRef}
              source={{
                uri: `https://traductor-texto.onrender.com/videos/${videos[actual].id}.mp4`,
              }}
              resizeMode="contain"
              shouldPlay
              onPlaybackStatusUpdate={(status) => {
                if (status.didJustFinish) {
                  avanzarVideo();
                }
              }}
            />
          </VideoWrapper>
        )}
      </View>
    </Container>
  );
}

// === STYLES ===
const Container = styled.View`
  flex: 1;
  background-color: #f0f8ff;
  padding: 20px;
`;
const HeaderTitle = styled.Text`
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 5px;
  text-align: center;
`;
const HeaderSubtitle = styled.Text`
  font-size: 14px;
  color: #ffffffff;
  text-align: center;
`;
const CardGradient = styled(LinearGradient)`
  border-radius: 16px;
  margin: 20px;
  elevation: 4;
`;
const InputContainer = styled.View`
  background-color: #ffffff;
  border-radius: 5px;
  margin-bottom: 15px;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.1;
  shadow-radius: 8px;
  elevation: 5;
`;
const InputLabel = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: #003566;
  padding: 15px 15px;
`;
const StyledTextInput = styled(TextInput)`
  padding: 10px 15px;
  font-size: 16px;
  color: #003566;
  min-height: 40px;
  border-radius: 15px;
`;
const CharacterCount = styled.Text`
  font-size: 12px;
  color: #6c757d;
  text-align: right;
  padding: 5px 15px 15px;
`;
const TranslateButton = styled.TouchableOpacity`
  background-color: #00b4d8;
  border-radius: 12px;
  padding: 14px;
  align-items: center;
  margin-top: 10px;
`;
const ButtonText = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
`;
const VideoWrapper = styled.View`
  background-color: #ffffff;
  border-radius: 20px;
  margin-bottom: 25px;
  shadow-color: #000;
  shadow-offset: 0px 6px;
  shadow-opacity: 0.1;
  shadow-radius: 12px;
  elevation: 8;
  margin: 10px;
`;
const StyledVideo = styled(Video)`
  width: 100%;
  height: 400px;
`;
const MicButton = styled(TouchableOpacity)`
  border-radius: 5px;
  padding: 5px;
  align-items: center;
  margin-top: 5px;
`;
const MicText = styled(Text)`
  color: #ffffffff;
  font-size: 5px;
`;
