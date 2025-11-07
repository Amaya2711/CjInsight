import React from "react";
import { Image, ImageStyle, StyleProp, View, StyleSheet } from "react-native";
import { ImageIcon } from "lucide-react-native";

interface SafeImageProps {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
}

export default function SafeImage({ uri, style, resizeMode = "cover" }: SafeImageProps) {
  const isValidUri = uri && typeof uri === "string" && uri.trim().length > 0;

  if (!isValidUri) {
    return (
      <View style={[styles.placeholder, style]}>
        <ImageIcon size={48} color="#9CA3AF" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: uri.trim() }}
      style={style}
      resizeMode={resizeMode}
      onError={(error) => {
        console.warn('[SafeImage] Error loading image:', uri, error.nativeEvent.error);
      }}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "solid",
  },
});
