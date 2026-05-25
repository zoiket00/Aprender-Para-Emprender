import { Tabs, router } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { colors } from "@/theme";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, { active: string; inactive: string }> = {
    index:          { active: "🏠", inactive: "🏠" },
    asistencia:     { active: "📋", inactive: "📋" },
    dashboard:      { active: "📊", inactive: "📊" },
    participantes:  { active: "👶", inactive: "👶" },
  };
  return null; // usamos emoji en tabBarLabel
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
        options={{ title: "Inicio", tabBarIcon: ({ focused }) => null }}
      />
      <Tabs.Screen
        name="asistencia"
        options={{ title: "Asistencia", tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Dashboard", tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="participantes"
        options={{ title: "Participantes", tabBarIcon: () => null }}
      />
    </Tabs>
  );
}
