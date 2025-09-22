import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import styled from 'styled-components/native';

export default function Principal() {
  const router = useRouter();

  return (
    <Container>
      <Header>
        <Titulo>SeñasCol</Titulo>
        <Subtitulo>Traductor de Lengua de Señas Colombiano</Subtitulo>
      </Header>

      <Content>
      <CardGradient
        colors={['#1E3A8A','#00C0C7', '#FFD700']} 
      >
        <Card onPress={() => router.push('/(tabs)/texto')}>
          <IconRow>
            <MaterialCommunityIcons name="file-document-outline" size={40} color="#fff" />
            <MaterialCommunityIcons name="arrow-right" size={36} color="#fff" />
            <MaterialCommunityIcons name="hand-wave" size={40} color="#fff" />
          </IconRow>
          <CardTitle>Texto a Señas</CardTitle>
          <CardDescription>
            Convierte texto escrito en representaciones visuales de lengua de señas colombiana
          </CardDescription>
        </Card>
      </CardGradient>

      <CardGradient
        colors={['#FFD700','#87CEEB', '#1E3A8A']} 

      >
        <Card onPress={() => router.push('/sena')}>
          <IconRow>
            <MaterialCommunityIcons name="hand-wave" size={40} color="#fff" />
            <MaterialCommunityIcons name="arrow-right" size={36} color="#fff" />
            <MaterialCommunityIcons name="file-document-outline" size={40} color="#fff" />
          </IconRow>
          <CardTitle>Señas a Texto</CardTitle>
          <CardDescription>
            Reconoce gestos de lengua de señas y los traduce a texto escrito
          </CardDescription>
        </Card>
      </CardGradient>
      </Content>
    </Container>
  );
}

// ======= ESTILOS =======
const Container = styled.View`
  flex: 1;
  background-color: #f8fafc;
  padding: 30px;
`;
const Content = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;


const Header = styled.View`
  align-items: center;
  margin-bottom: 25px;
`;

const Titulo = styled.Text`
  font-size: 26px;
  font-weight: bold;
  color: #1E3A8A;
`;

const Subtitulo = styled.Text`
  font-size: 14px;
  color: #475569;
  text-align: center;
`;

const CardGradient = styled(LinearGradient)`
  border-radius: 16px;
  margin-bottom: 20px;
  elevation: 4;
`;

const Card = styled.TouchableOpacity`
  padding: 20px;
  border-radius: 16px;
`;

const IconRow = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
`;

const CardTitle = styled.Text`
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  text-align: center;
`;

const CardDescription = styled.Text`
  font-size: 14px;
  color: #f0f0f0;
  text-align: center;
  margin-top: 5px;
`;
