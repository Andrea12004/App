import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from 'expo-router';

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#00C0C7", 
        tabBarInactiveTintColor: "#c8c5c5ff", 
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#FFD700",  
        },
        headerBackground: () => (
          <LinearGradient
            colors={["#1E3A8A", "#00C0C7"]}
            style={{ flex: 1 }}
          />
        ),
        headerTintColor: "#fff",   
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Tabs.Screen
        name="principal"
        options={{
          title: "Inicio",
          headerTitle: "",  
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="texto"
        options={{
          title: "Texto",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="file-document-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sena"
        options={{
          title: "Seña",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="hand-wave" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
