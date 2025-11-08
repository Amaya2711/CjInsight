import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator, LogBox } from "react-native";
import { useAppStore } from "@/store/useAppStore";
import { healthCheckSupabase } from "@/utils/supabase";
import { probeSchema } from "@/services/health";
import { repairAsyncStorage } from "@/utils/asyncStorageHelper";

SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs([
  'Deep imports from the \'react-native\' package are deprecated',
  'Unable to resolve manifest assets',
  'Cannot read properties of null',
  'vmHelpers.proxyToVM',
  'source.uri should not be an empty string',
]);

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Atrás" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="ticket/[id]"
        options={{
          headerShown: true,
          title: "Detalle del Ticket",
          headerBackTitle: "Atrás",
        }}
      />
      <Stack.Screen
        name="evidence/[ticketId]"
        options={{
          presentation: "modal",
          headerShown: true,
          title: "Capturar Evidencia",
        }}
      />
      <Stack.Screen
        name="hse/list"
        options={{
          headerShown: true,
          title: "Permisos HSE",
        }}
      />
      <Stack.Screen
        name="map-office"
        options={{
          headerShown: true,
          title: "Mapa de Oficina",
        }}
      />
      <Stack.Screen
        name="rutas-cuadrillas"
        options={{
          headerShown: false,
          title: "Rutas de Cuadrillas",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const initializeStore = useAppStore((state) => state.initializeStore);

  useEffect(() => {
    const init = async () => {
      try {
        console.log("[RootLayout] Repairing AsyncStorage...");
        await repairAsyncStorage();
        console.log("[RootLayout] Initializing store...");
        await healthCheckSupabase();
        await probeSchema();
        await initializeStore();
        console.log("[RootLayout] Store initialized successfully");
        setIsReady(true);
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error("[RootLayout] Error initializing:", error);
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    };
    init();
  }, [initializeStore]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootLayoutNav />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
