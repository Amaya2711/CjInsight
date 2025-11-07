import { create } from "zustand";
import { getUsuarioGuardado, loginConUsuarioClave, logoutUsuario } from "@/services/auth";
import type { Usuario, Cuadrilla } from "@/services/auth";
import { useAppStore } from "./useAppStore";
import type { User } from "@/types";
import { stopBackgroundLocation, isTrackingLocation } from "@/services/backgroundLocation";

type State = {
  user: Usuario | null;
  cuadrilla: Cuadrilla | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  signIn: (nombreUsuario: string, claveUsuario: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<State>((set) => ({
  user: null,
  cuadrilla: null,
  loading: true,
  hydrate: async () => {
    console.log("[authStore] Hydrating...");
    set({ loading: true });
    try {
      const u = await getUsuarioGuardado();
      console.log("[authStore] Usuario cargado desde storage:", u ? u.nombre_usuario : "ninguno");
      if (u) {
        console.log("[authStore] ✅ Variable global USUARIO-ID (ID Cuadrilla):", u.id);
      }
      set({ user: u, loading: false });
      
      if (u) {
        const tipoUsuarioNormalizado = (u.tipo_usuario || "").toLowerCase().trim();
        const esOficina = tipoUsuarioNormalizado === "oficina" || tipoUsuarioNormalizado === "admin";
        console.log("[authStore] Tipo de usuario raw:", u.tipo_usuario);
        console.log("[authStore] Tipo normalizado:", tipoUsuarioNormalizado);
        console.log("[authStore] Es oficina:", esOficina);
        
        const appUser: User = {
          id: u.id_usuario,
          name: u.nombre_usuario,
          role: "admin",
          userType: esOficina ? "oficina" : "campo",
          email: "",
          phone: null,
          zone: null,
          crewId: u.id ? String(u.id) : null,
          status: "active",
        };
        useAppStore.getState().setCurrentUser(appUser);
        console.log("[authStore] Usuario sincronizado con useAppStore:", appUser);
        console.log("[authStore] ℹ️  Tracking será gestionado por LocationGate en hydrate");
      }
    } catch (error) {
      console.error("[authStore] Error en hydrate:", error);
      set({ user: null, loading: false });
    }
  },
  signIn: async (nombreUsuario, claveUsuario) => {
    console.log("[authStore] Iniciando signIn...");
    set({ loading: true });
    try {
      const { usuario, cuadrilla } = await loginConUsuarioClave(nombreUsuario, claveUsuario);
      console.log("[authStore] SignIn exitoso:", usuario.nombre_usuario);
      console.log("[authStore] ✅ Variable global almacenada - USUARIO-ID (ID Cuadrilla):", usuario.id);
      console.log("[authStore] Cuadrilla:", cuadrilla?.nombre || "ninguna");
      
      set({ user: usuario, cuadrilla, loading: false });
      
      const tipoUsuarioNormalizado = (usuario.tipo_usuario || "").toLowerCase().trim();
      const esOficina = tipoUsuarioNormalizado === "oficina" || tipoUsuarioNormalizado === "admin";
      console.log("[authStore] Tipo de usuario raw:", usuario.tipo_usuario);
      console.log("[authStore] Tipo normalizado:", tipoUsuarioNormalizado);
      console.log("[authStore] Es oficina:", esOficina);
      
      const appUser: User = {
        id: usuario.id_usuario,
        name: usuario.nombre_usuario,
        role: "admin",
        userType: esOficina ? "oficina" : "campo",
        email: "",
        phone: null,
        zone: null,
        crewId: usuario.id ? String(usuario.id) : null,
        status: "active",
      };
      useAppStore.getState().setCurrentUser(appUser);
      console.log("[authStore] Usuario sincronizado con useAppStore:", appUser);
      console.log("[authStore] ℹ️  Tracking será gestionado por LocationGate");
    } catch (error) {
      console.error("[authStore] Error en signIn:", error);
      set({ loading: false });
      throw error;
    }
  },
  signOut: async () => {
    console.log("[authStore] Cerrando sesión...");
    set({ loading: true });
    
    const tracking = await isTrackingLocation();
    if (tracking) {
      console.log("[authStore] Deteniendo seguimiento de ubicación...");
      await stopBackgroundLocation();
    }
    
    await logoutUsuario();
    useAppStore.getState().setCurrentUser(null);
    console.log("[authStore] Sesión cerrada");
    set({ user: null, cuadrilla: null, loading: false });
  },
}));
