import { router } from "expo-router";
import { Alert } from "react-native";
import type { UserType } from "@/types";

export function checkOfficeOnly(userType: UserType | undefined): boolean {
  if (userType !== "oficina") {
    Alert.alert(
      "Acceso Denegado",
      "Esta funcionalidad es solo para usuarios de oficina"
    );
    return false;
  }
  return true;
}

export function checkCampoOnly(userType: UserType | undefined): boolean {
  if (userType !== "campo") {
    Alert.alert(
      "Acceso Denegado",
      "Esta funcionalidad es solo para usuarios de campo"
    );
    return false;
  }
  return true;
}

export function redirectToLogin() {
  router.replace("/login");
}

export function isOfficeUser(userType: UserType | undefined): boolean {
  return userType === "oficina";
}

export function isCampoUser(userType: UserType | undefined): boolean {
  return userType === "campo";
}
