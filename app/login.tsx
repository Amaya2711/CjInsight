import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { LogIn } from "lucide-react-native";
import { startBackgroundLocation } from "@/services/backgroundLocation";
import * as Location from "expo-location";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, loading } = useAuthStore();
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [claveUsuario, setClaveUsuario] = useState("");

  async function onSubmit() {
    try {
      if (!nombreUsuario.trim() || !claveUsuario) {
        Alert.alert("Completa usuario y contraseña");
        return;
      }
      await signIn(nombreUsuario.trim(), claveUsuario);
      
      const { user } = useAuthStore.getState();
      if (user && user.tipo_usuario?.toLowerCase() === "campo" && user.id) {
        console.log("[Login] Usuario de CAMPO detectado - solicitando permisos de ubicación...");
        
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus === "granted") {
          console.log("[Login] ✅ Permiso de ubicación en primer plano concedido");
          
          if (Platform.OS !== "web") {
            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            if (backgroundStatus === "granted") {
              console.log("[Login] ✅ Permiso de ubicación en segundo plano concedido");
            } else {
              console.log("[Login] ⚠️  Permiso de segundo plano denegado - el seguimiento funcionará solo con la app abierta");
              Alert.alert(
                "Seguimiento Limitado",
                "El seguimiento de ubicación funcionará solo cuando la app esté abierta. Puedes activar el permiso de segundo plano desde Configuración."
              );
            }
          }
          
          const result = await startBackgroundLocation(user.id);
          if (result.success) {
            console.log("[Login] ✅ Seguimiento de ubicación activado automáticamente");
            if (result.usingForeground) {
              console.log("[Login] ℹ️", result.error);
            }
          } else {
            console.error("[Login] ❌ Error activando seguimiento:", result.error);
          }
        } else {
          console.log("[Login] ⚠️  Permiso de ubicación denegado - el usuario puede activarlo manualmente desde Perfil");
          Alert.alert(
            "Permiso de Ubicación",
            "Para usar el seguimiento de ubicación, puedes activarlo desde la pantalla de Perfil."
          );
        }
      }
      
      router.replace("/(tabs)/tickets");
    } catch (e: any) {
      Alert.alert("No se pudo iniciar sesión", e?.message ?? "Error");
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <ScrollView 
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <LogIn size={48} color="#2563EB" strokeWidth={2} />
          </View>
          <Text style={styles.title}>CJ Insight Mobile</Text>
          <Text style={styles.subtitle}>Sistema de Gestión de Tickets</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Usuario</Text>
          <TextInput
            value={nombreUsuario}
            onChangeText={setNombreUsuario}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Nombre de usuario"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            editable={!loading}
            pointerEvents="auto"
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            value={claveUsuario}
            onChangeText={setClaveUsuario}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            editable={!loading}
            pointerEvents="auto"
          />

          <Pressable
            onPress={onSubmit}
            disabled={loading || !nombreUsuario.trim() || !claveUsuario}
            style={[styles.button, (loading || !nombreUsuario.trim() || !claveUsuario) && styles.buttonDisabled]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Ingresar</Text>}
          </Pressable>
        </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    minHeight: 600,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600" as const,
  },
});
