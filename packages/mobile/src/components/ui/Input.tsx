import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
} from "react-native";
import { colors, radius, fontSize, spacing } from "@/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, style, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, error ? styles.inputError : styles.inputNormal, style]}
        placeholderTextColor={colors.slate400}
        autoCapitalize="none"
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.slate700,
  },
  input: {
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputNormal: { borderColor: colors.border },
  inputError:  { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  error: { fontSize: fontSize.xs, color: colors.danger },
  hint:  { fontSize: fontSize.xs, color: colors.textMuted },
});
