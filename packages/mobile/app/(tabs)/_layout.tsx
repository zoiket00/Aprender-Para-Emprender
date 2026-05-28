import { Tabs, router } from "expo-router";
import { useEffect } from "react";
import { Text } from "react-native";
import { useAuthStore } from "@/store/auth";
import { colors } from "@/theme";

function Icon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { user, initialized } = useAuthStore();

  useEffect(() => {
    if (initialized && !user) router.replace("/login");
  }, [initialized, user]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.slate400,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Inicio", tabBarIcon: () => <Icon emoji="🏠" /> }}
      />
      <Tabs.Screen
        name="asistencia"
        options={{ title: "Asistencia", tabBarIcon: () => <Icon emoji="📋" /> }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Dashboard", tabBarIcon: () => <Icon emoji="📊" /> }}
      />
      <Tabs.Screen
        name="participantes"
        options={{ title: "Participantes", tabBarIcon: () => <Icon emoji="👶" /> }}
      />
      <Tabs.Screen
        name="historial"
        options={{ title: "Historial", tabBarIcon: () => <Icon emoji="🕐" /> }}
      />
    </Tabs>
  );
}
