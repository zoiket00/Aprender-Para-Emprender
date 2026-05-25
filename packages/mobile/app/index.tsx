import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth";
import { Spinner } from "@/components/ui";

export default function Index() {
  const { user, initialized } = useAuthStore();
  if (!initialized) return <Spinner fullScreen />;
  return <Redirect href={user ? "/(tabs)" : "/login"} />;
}
