import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
} from "react-native";
import { colors, radius, fontSize, spacing } from "@/theme";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends TouchableOpacityProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  label: string;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  label,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled ?? loading;
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[variant],
        styles[size],
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" || variant === "danger" ? "#fff" : colors.brand}
        />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], styles[`label_${size}`]]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
  },
  disabled: { opacity: 0.5 },

  primary:   { backgroundColor: colors.brand },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  danger:    { backgroundColor: colors.danger },
  ghost:     { backgroundColor: "transparent" },

  sm: { height: 34, paddingHorizontal: spacing.md },
  md: { height: 42, paddingHorizontal: spacing.lg },
  lg: { height: 50, paddingHorizontal: spacing.xl },

  label:           { fontWeight: "600" },
  label_primary:   { color: "#fff" },
  label_secondary: { color: colors.slate700 },
  label_danger:    { color: "#fff" },
  label_ghost:     { color: colors.brand },
  label_sm:        { fontSize: fontSize.xs },
  label_md:        { fontSize: fontSize.sm },
  label_lg:        { fontSize: fontSize.base },
});
