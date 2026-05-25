import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth";
import { colors, spacing, fontSize, radius } from "@/theme";

const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"] as const;

const DIA_CONFIG = {
  Lunes:     { bg: "#F5F3FF", border: "#DDD6FE", text: "#5B21B6", dot: "#7C3AED" },
  Martes:    { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", dot: "#2563EB" },
  Miercoles: { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46", dot: "#059669" },
  Jueves:    { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", dot: "#D97706" },
  Viernes:   { bg: "#FFF1F2", border: "#FECDD3", text: "#9F1239", dot: "#E11D48" },
} as const;

export default function Bienvenida() {
  const { user } = useAuthStore();
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  const nombre = user?.email?.split("@")[0] ?? "profesora";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.saludo}>{saludo} 👋</Text>
          <Text style={styles.nombre}>{nombre}</Text>
          <Text style={styles.pregunta}>¿Qué día vas a registrar hoy?</Text>
        </View>

        {/* Días */}
        {DIAS.map((dia) => {
          const cfg = DIA_CONFIG[dia];
          return (
            <TouchableOpacity
              key={dia}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: "/(tabs)/asistencia", params: { dia } })}
              style={[styles.diaCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
            >
              <View style={[styles.dot, { backgroundColor: cfg.dot }]} />
              <View style={styles.diaInfo}>
                <Text style={[styles.diaNombre, { color: cfg.text }]}>{dia}</Text>
                <Text style={[styles.diaSubtitle, { color: cfg.text, opacity: 0.65 }]}>
                  Registrar asistencia
                </Text>
              </View>
              <Text style={[styles.arrow, { color: cfg.text, opacity: 0.5 }]}>›</Text>
            </TouchableOpacity>
          );
        })}

        {/* Accesos rápidos */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/dashboard")}
          >
            <Text style={styles.quickEmoji}>📊</Text>
            <Text style={styles.quickTitle}>Dashboard</Text>
            <Text style={styles.quickSub}>Ver estadísticas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/participantes")}
          >
            <Text style={styles.quickEmoji}>👶</Text>
            <Text style={styles.quickTitle}>Participantes</Text>
            <Text style={styles.quickSub}>Gestionar catálogo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  container:   { padding: spacing["2xl"], gap: spacing.md },
  header:      { marginBottom: spacing.sm },
  saludo:      { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: 2 },
  nombre:      { fontSize: fontSize["2xl"], fontWeight: "700", color: colors.text, textTransform: "capitalize" },
  pregunta:    { fontSize: fontSize.base, color: colors.textMuted, marginTop: 4 },
  diaCard:     {
    flexDirection: "row", alignItems: "center", gap: spacing.lg,
    padding: spacing.lg, borderRadius: radius.xl, borderWidth: 2,
  },
  dot:         { width: 10, height: 10, borderRadius: radius.full },
  diaInfo:     { flex: 1 },
  diaNombre:   { fontSize: fontSize.lg, fontWeight: "600" },
  diaSubtitle: { fontSize: fontSize.xs, marginTop: 2 },
  arrow:       { fontSize: 24, fontWeight: "300" },
  quickRow:    { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  quickCard:   {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  quickEmoji:  { fontSize: 28, marginBottom: spacing.sm },
  quickTitle:  { fontSize: fontSize.sm, fontWeight: "600", color: colors.text },
  quickSub:    { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
});
