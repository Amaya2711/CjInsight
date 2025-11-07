import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator, Text } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { healthCheckSupabase } from "@/utils/supabase";

export default function Index() {
  const user = useAuthStore(state => state.user);
  const authLoading = useAuthStore(state => state.loading);
  const hydrate = useAuthStore(state => state.hydrate);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        console.log('[Index] Starting hydration...');
        await hydrate();
        console.log('[Index] Hydration complete');
        await healthCheckSupabase();
        console.log('[Index] Health check complete');
        if (mounted) {
          setInitialized(true);
        }
      } catch (error: any) {
        console.error('[Index] Error during initialization:', error);
        if (mounted) {
          setError(error?.message || 'Error de inicialización');
          setInitialized(true);
        }
      }
    };
    init();
    return () => { mounted = false; };
  }, [hydrate]);

  if (!initialized || authLoading) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center", backgroundColor: "#F9FAFB" }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 16, color: "#6B7280" }}>Cargando...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center", backgroundColor: "#F9FAFB", padding: 20 }}>
        <Text style={{ color: "#DC2626", fontSize: 16, textAlign: "center" }}>Error: {error}</Text>
        <Text style={{ color: "#6B7280", marginTop: 8 }}>Intenta reiniciar la app</Text>
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)/tickets" />;
}
