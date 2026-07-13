// components/EmptyState.tsx - Watermark Logo Style
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  logoSource?: { uri: string } | number;
  logoSize?: number;
}

const FALLBACK_LOGO = require("@/assets/images/radioLogoOrg.png");

export default function EmptyState({
  title = "No Posts Yet",
  subtitle = "Pull down to refresh or check back later",
  logoSource,
  logoSize = 120,
}: EmptyStateProps) {
  const finalLogoSource = logoSource || FALLBACK_LOGO;
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const logoDimension = Math.min(
    logoSize * (isLandscape ? 1.55 : 2.2),
    width * (isLandscape ? 0.24 : 0.5),
    height * (isLandscape ? 0.46 : 0.38),
  );

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
      <View
        style={[
          styles.logoContainer,
          isLandscape && styles.logoContainerLandscape,
        ]}
      >
        <Image
          source={finalLogoSource}
          style={[
            styles.watermarkLogo,
            {
              width: logoDimension,
              height: logoDimension,
            },
          ]}
          resizeMode="contain"
        />
      </View>

      {/* Clean text content */}
      <View style={[styles.content, isLandscape && styles.contentLandscape]}>
        <Text style={[styles.title, isLandscape && styles.titleLandscape]}>
          {title}
        </Text>
        <Text
          style={[
            styles.subtitle,
            isLandscape && styles.subtitleLandscape,
            { maxWidth: Math.min(width * 0.8, 520) },
          ]}
        >
          {subtitle}
        </Text>
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
  logoContainerLandscape: {
    top: "10%",
    right: 0,
  },
  watermarkLogo: {
    opacity: 0.2, // Subtle watermark effect
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 80,
    gap: 16,
  },
  contentLandscape: {
    paddingVertical: 36,
    gap: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#f8fafc",
    textAlign: "center",
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  titleLandscape: {
    fontSize: 24,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#cbd5e1",
    textAlign: "center",
    lineHeight: 24,
  },
  subtitleLandscape: {
    fontSize: 14,
    lineHeight: 20,
  },
});
