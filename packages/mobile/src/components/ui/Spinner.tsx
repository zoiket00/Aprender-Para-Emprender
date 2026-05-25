import { ActivityIndicator, View, StyleSheet } from "react-native";
import { colors } from "@/theme";

interface SpinnerProps {
  size?: "small" | "large";
  fullScreen?: boolean;
}

export function Spinner({ size = "large", fullScreen }: SpinnerProps) {
  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size={size} color={colors.brand} />
      </View>
    );
  }
  return <ActivityIndicator size={size} color={colors.brand} />;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});
