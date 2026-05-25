import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth";
import { Button, Input } from "@/components/ui";
import { colors, spacing, fontSize, radius } from "@/theme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signIn, loading } = useAuthStore();

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Completa todos los campos");
      return;
    }
    try {
      await signIn(email, password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>A</Text>
          </View>
          <Text style={styles.appName}>Aprender Para Emprender</Text>
          <Text style={styles.subtitle}>Fundación Juanfe · Control de Asistencia</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Input
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@correo.com"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
          />
          <Input
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="current-password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            label="Iniciar sesión"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.mt4}
          />
        </View>

        <Text style={styles.footer}>Acceso restringido — solo personal autorizado</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: colors.bg },
  container:   { flexGrow: 1, justifyContent: "center", padding: spacing["3xl"] },
  logoSection: { alignItems: "center", marginBottom: spacing["3xl"] },
  logoCircle:  {
    width: 64, height: 64, borderRadius: radius.xl,
    backgroundColor: colors.brand, alignItems: "center", justifyContent: "center",
    marginBottom: spacing.lg,
  },
  logoText:  { color: "#fff", fontSize: 28, fontWeight: "700" },
  appName:   { fontSize: fontSize.xl, fontWeight: "700", color: colors.text, textAlign: "center" },
  subtitle:  { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs, textAlign: "center" },
  card:      {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing["2xl"], gap: spacing.lg,
  },
  errorBox:  {
    backgroundColor: colors.dangerLight, borderRadius: radius.md,
    borderWidth: 1, borderColor: "#FECACA", padding: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: fontSize.sm },
  mt4:       { marginTop: spacing.xs },
  footer:    { textAlign: "center", marginTop: spacing["2xl"], fontSize: fontSize.xs, color: colors.slate400 },
});
