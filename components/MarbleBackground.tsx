import { LinearGradient } from "expo-linear-gradient";
import type { LinearGradientProps } from "expo-linear-gradient";
import { useMemo, type PropsWithChildren } from "react";
import {
  StyleSheet,
  type StyleProp,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";

type MarbleBackgroundProps = PropsWithChildren<{
  colors?: LinearGradientProps["colors"];
  style?: StyleProp<ViewStyle>;
}>;

const DEFAULT_COLORS = ["#070b14", "#121826", "#211322"] as const;

export default function MarbleBackground({
  children,
  colors = DEFAULT_COLORS,
  style,
}: MarbleBackgroundProps) {
  const { width } = useWindowDimensions();
  const dynamicStyles = useMemo(() => createDynamicStyles(width), [width]);

  return (
    <LinearGradient colors={colors} style={[styles.container, style]}>
      <View pointerEvents="none" style={styles.effects}>
        <LinearGradient
          colors={["rgba(255,255,255,0.055)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.marbleSheet, dynamicStyles.marbleSheetOne]}
        />
        <LinearGradient
          colors={["rgba(233,69,96,0.12)", "rgba(233,69,96,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.marbleSheet, dynamicStyles.marbleSheetTwo]}
        />
        <LinearGradient
          colors={["rgba(15,52,96,0.24)", "rgba(15,52,96,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.marbleSheet, dynamicStyles.marbleSheetThree]}
        />
        <View style={[styles.marbleVein, dynamicStyles.marbleVeinOne]} />
        <View style={[styles.marbleVein, dynamicStyles.marbleVeinTwo]} />
        <View style={[styles.marbleVein, dynamicStyles.marbleVeinThree]} />
        <View style={[styles.marbleVein, dynamicStyles.marbleVeinFour]} />
      </View>

      {children}
    </LinearGradient>
  );
}

const createDynamicStyles = (width: number) =>
  StyleSheet.create({
    marbleSheetOne: {
      height: 118,
      top: 72,
      left: -width * 0.44,
      transform: [{ rotate: "-24deg" }],
      width: width * 1.6,
    },
    marbleSheetTwo: {
      height: 92,
      top: 250,
      right: -width * 0.48,
      transform: [{ rotate: "18deg" }],
      width: width * 1.6,
    },
    marbleSheetThree: {
      bottom: 28,
      height: 130,
      left: -width * 0.28,
      transform: [{ rotate: "-14deg" }],
      width: width * 1.6,
    },
    marbleVeinOne: {
      left: -width * 0.18,
      top: 150,
      transform: [{ rotate: "-19deg" }],
      width: width * 1.35,
    },
    marbleVeinTwo: {
      opacity: 0.7,
      right: -width * 0.24,
      top: 210,
      transform: [{ rotate: "22deg" }],
      width: width * 1.35,
    },
    marbleVeinThree: {
      backgroundColor: "rgba(233,69,96,0.18)",
      left: -width * 0.34,
      top: 392,
      transform: [{ rotate: "-12deg" }],
      width: width * 1.35,
    },
    marbleVeinFour: {
      bottom: 122,
      opacity: 0.65,
      right: -width * 0.32,
      transform: [{ rotate: "16deg" }],
      width: width * 1.35,
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  effects: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  marbleSheet: {
    borderRadius: 80,
    position: "absolute",
  },
  marbleVein: {
    backgroundColor: "rgba(255,255,255,0.13)",
    height: 1,
    position: "absolute",
  },
});
