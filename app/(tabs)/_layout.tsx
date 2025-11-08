import { Tabs } from "expo-router";
import { Ticket, UserCircle2, MapIcon, UsersRound, CheckSquare } from "lucide-react-native";
import React, { useState, useEffect, useCallback } from "react";
import { AppState } from "react-native";
import { useAppStore } from "@/store/useAppStore";
import { LocationGate } from "@/src/components/LocationGate";
import { useAuthStore } from "@/store/authStore";
import { startBackgroundLocation } from "@/services/backgroundLocation";

export default function TabLayout() {
  const { currentUser } = useAppStore();
  const { user, signOut } = useAuthStore();
  const [locationGranted, setLocationGranted] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(true);
  const [gateKey, setGateKey] = useState(0);
  
  const isOfficeUser = currentUser?.userType === "oficina";
  const isFieldUser = currentUser?.userType === "campo";

  console.log("[TabLayout] Current user type:", currentUser?.userType);
  console.log("[TabLayout] Is office user:", isOfficeUser);
  console.log("[TabLayout] Is field user:", isFieldUser);

  useEffect(() => {
    if (isOfficeUser || !isFieldUser) {
      console.log('[TabLayout] Usuario OFICINA o no identificado, omitir gate');
      setLocationGranted(true);
      setCheckingLocation(false);
    } else {
      console.log('[TabLayout] Usuario CAMPO, verificar permisos de ubicación');
      setCheckingLocation(false);
    }
  }, [isOfficeUser, isFieldUser]);

  useEffect(() => {
    if (!isFieldUser) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && !locationGranted) {
        console.log('[TabLayout] App volvió a primer plano, re-verificando permisos');
        setGateKey((prev) => prev + 1);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isFieldUser, locationGranted]);

  const handlePermissionsGranted = useCallback(async () => {
    console.log('[TabLayout] ✅ Permisos concedidos, iniciando tracking');
    setLocationGranted(true);
    
    if (user?.id) {
      console.log('[TabLayout] 🚀 Iniciando tracking en background para cuadrilla:', user.id);
      const result = await startBackgroundLocation(user.id);
      if (result.success) {
        console.log('[TabLayout] ✅ Tracking iniciado exitosamente');
      } else {
        console.error('[TabLayout] ❌ Error iniciando tracking:', result.error);
      }
    }
  }, [user]);

  const handleLogout = useCallback(async () => {
    console.log('[TabLayout] Cerrando sesión desde LocationGate');
    setLocationGranted(false);
    setCheckingLocation(true);
    await signOut();
  }, [signOut]);

  if (isFieldUser && !checkingLocation && !locationGranted) {
    console.log('[TabLayout] 🚨 Mostrando LocationGate');
    return (
      <LocationGate
        key={gateKey}
        onPermissionsGranted={handlePermissionsGranted}
        onLogout={handleLogout}
      />
    );
  }

  console.log('[TabLayout] 🎯 Renderizando tabs normalmente');
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#9CA3AF",
        headerShown: true,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
        },
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <UserCircle2 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: isOfficeUser ? "Tickets" : "Mis Tickets",
          tabBarIcon: ({ color }) => <Ticket size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="cuadrillas"
        options={{
          href: isOfficeUser ? undefined : null,
          title: "Cuadrillas",
          tabBarIcon: ({ color }) => <UsersRound size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="full-map"
        options={{
          href: isOfficeUser ? undefined : null,
          title: "Mapa",
          tabBarIcon: ({ color }) => <MapIcon size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          href: isOfficeUser ? undefined : null,
          title: "Validar",
          tabBarIcon: ({ color }) => <CheckSquare size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create-ticket"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="create-site"
        options={{
          href: null,
        }}
      />

    </Tabs>
  );
}
