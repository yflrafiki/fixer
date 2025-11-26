import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../utils/supabase";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // ❌ WRONG: /auth/login  
    // if (!user) return router.replace("/auth/login");

    // ✅ CORRECT: /login
    if (!user) return router.replace("/login");

    async function checkRole() {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (data?.role === "customer") router.replace("/customer/home");
      if (data?.role === "mechanic") router.replace("/mechanic/dashboard");
    }

    checkRole();
  }, [user, loading]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
