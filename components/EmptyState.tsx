// components/EmptyState.tsx - Watermark Logo Style
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Dimensions, Image, StyleSheet, Text, View } from "react-native";

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  logoSource?: { uri: string } | number;
  logoSize?: number;
}

const { width: screenWidth } = Dimensions.get("window");

const FALLBACK_LOGO = require("@/assets/images/radioLogoOrg.png");

export default function EmptyState({
  title = "No Posts Yet",
  subtitle = "Pull down to refresh or check back later",
  logoSource,
  logoSize = 120,
}: EmptyStateProps) {
  const finalLogoSource = logoSource || FALLBACK_LOGO;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          "rgba(14, 17, 23, 0.9)",
          "rgba(17, 24, 39, 0.95)",
          "rgba(15, 23, 42, 0.9)",
        ]}
        style={StyleSheet.absoluteFill}
      />

      {/* Large watermark logo - center & subtle */}
      <View style={styles.logoContainer}>
        <Image
          source={finalLogoSource}
          style={styles.watermarkLogo}
          resizeMode="contain"
        />
      </View>

      {/* Clean text content */}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    position: "absolute",
    top: "20%",
    left: 0,
    right: 20,
    alignItems: "center",
  },
  watermarkLogo: {
    width: screenWidth * 0.5,
    height: screenWidth * 0.5,
    opacity: 0.2, // Subtle watermark effect
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 80,
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#f8fafc",
    textAlign: "center",
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#cbd5e1",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: screenWidth * 0.8,
  },
});
