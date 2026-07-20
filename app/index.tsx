// app/index.tsx
import MarbleBackground from "@/components/MarbleBackground";
import { hasRecentNotificationOpenIntent } from "@/utils/notificationOpenIntent";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

type RingAnimationConfig = {
  delay: number;
  opacity: Animated.Value;
  scale: Animated.Value;
  targetOpacity: number;
  targetScale: number;
};

export default function IntroScreen() {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring3Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(15)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const dot1Opacity = useRef(new Animated.Value(0)).current;
  const dot2Scale = useRef(new Animated.Value(1)).current;
  const dot3Opacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const liveBadgeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    const runningAnimations: Animated.CompositeAnimation[] = [];

    const startAnimation = (animation: Animated.CompositeAnimation) => {
      runningAnimations.push(animation);
      animation.start();
    };

    // Continuous rotation
    startAnimation(
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 6000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
    );

    // 1. Logo bounces in
    startAnimation(
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.spring(logoScale, {
            toValue: 1,
            tension: 40,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    // 2. Rings expand
    const ringAnimations: RingAnimationConfig[] = [
      {
        delay: 600,
        opacity: ring1Opacity,
        scale: ring1Scale,
        targetOpacity: 0.7,
        targetScale: 1.6,
      },
      {
        delay: 850,
        opacity: ring2Opacity,
        scale: ring2Scale,
        targetOpacity: 0.45,
        targetScale: 2.2,
      },
      {
        delay: 1100,
        opacity: ring3Opacity,
        scale: ring3Scale,
        targetOpacity: 0.25,
        targetScale: 2.9,
      },
    ];

    ringAnimations.forEach(
      ({ delay, opacity, scale, targetOpacity, targetScale }) => {
        startAnimation(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(scale, {
                toValue: targetScale,
                duration: 900,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(opacity, {
                toValue: targetOpacity,
                duration: 500,
                useNativeDriver: true,
              }),
            ]),
          ]),
        );
      },
    );

    // 3. Live badge
    startAnimation(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(liveBadgeOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    );

    // 4. Line draws
    startAnimation(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(lineWidth, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );

    // 5. Title
    startAnimation(
      Animated.sequence([
        Animated.delay(950),
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(titleY, {
            toValue: 0,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    // 6. Subtitle
    startAnimation(
      Animated.sequence([
        Animated.delay(1200),
        Animated.parallel([
          Animated.timing(subtitleOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(subtitleY, {
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    // 7. Tagline
    startAnimation(
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(tagOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );

    // 8. Dots
    startAnimation(
      Animated.sequence([
        Animated.delay(1600),
        Animated.parallel([
          Animated.timing(dot1Opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(dot2Scale, {
            toValue: 1.4,
            tension: 60,
            friction: 5,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    // 9. Handoff while the intro is still visible.
    const handoffAnimation = Animated.sequence([
      Animated.delay(2700),
      Animated.timing(screenOpacity, {
        toValue: 0.96,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    runningAnimations.push(handoffAnimation);
    handoffAnimation.start(({ finished }) => {
      if (finished && isMounted) {
        if (hasRecentNotificationOpenIntent()) return;
        router.replace("/(tabs)/stream");
      }
    });

    return () => {
      isMounted = false;
      runningAnimations.forEach((animation) => animation.stop());
    };
  }, [
    dot1Opacity,
    dot2Scale,
    dot3Opacity,
    lineWidth,
    liveBadgeOpacity,
    logoOpacity,
    logoScale,
    ring1Opacity,
    ring1Scale,
    ring2Opacity,
    ring2Scale,
    ring3Opacity,
    ring3Scale,
    rotateAnim,
    screenOpacity,
    subtitleOpacity,
    subtitleY,
    tagOpacity,
    titleOpacity,
    titleY,
  ]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const lineInterpolated = lineWidth.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 80],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <MarbleBackground style={StyleSheet.absoluteFill} />

      {/* Background glow */}
      <View style={styles.radialGlow} />

      {/* Particles */}
      <View
        style={[styles.particle, { top: height * 0.15, left: width * 0.1 }]}
      />
      <View
        style={[styles.particle, { top: height * 0.2, right: width * 0.12 }]}
      />
      <View
        style={[styles.particle, { top: height * 0.75, left: width * 0.2 }]}
      />
      <View
        style={[styles.particle, { top: height * 0.8, right: width * 0.15 }]}
      />
      <View
        style={[
          styles.particleLarge,
          { top: height * 0.12, right: width * 0.3 },
        ]}
      />
      <View
        style={[
          styles.particleLarge,
          { top: height * 0.82, left: width * 0.35 },
        ]}
      />

      {/* Logo section */}
      <View style={styles.logoSection}>
        <Animated.View
          style={[
            styles.ring,
            styles.ring3,
            { opacity: ring3Opacity, transform: [{ scale: ring3Scale }] },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            styles.ring2,
            { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            styles.ring1,
            { opacity: ring1Opacity, transform: [{ scale: ring1Scale }] },
          ]}
        />
        <Animated.View
          style={[styles.rotatingRing, { transform: [{ rotate: spin }] }]}
        />

        <Animated.View
          style={[
            styles.logoWrapper,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <Image
            source={require("@/assets/images/radioLogo.jpg")}
            style={styles.logo}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(233,69,96,0.15)"]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View
          style={[styles.liveBadge, { opacity: liveBadgeOpacity }]}
        >
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </Animated.View>
      </View>

      {/* Text section */}
      <View style={styles.textSection}>
        <View style={styles.lineContainer}>
          <Animated.View style={[styles.line, { width: lineInterpolated }]} />
        </View>

        <Animated.Text
          style={[
            styles.title,
            { opacity: titleOpacity, transform: [{ translateY: titleY }] },
          ]}
        >
          RADIO YERAZ
        </Animated.Text>

        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleY }],
            },
          ]}
        >
          Armenian music, culture, and voice 24/7
        </Animated.Text>

        <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
          Armenian Music - Syria - World
        </Animated.Text>
      </View>

      {/* Bottom dots */}
      <View style={styles.bottomSection}>
        <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
        <Animated.View
          style={[styles.dotActive, { transform: [{ scale: dot2Scale }] }]}
        />
        <Animated.View style={[styles.dot, { opacity: dot3Opacity }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#070b14",
    justifyContent: "center",
  },

  radialGlow: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "rgba(233,69,96,0.07)",
    top: "50%",
    left: "50%",
    marginTop: -280,
    marginLeft: -200,
  },

  particle: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(233,69,96,0.35)",
  },

  particleLarge: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  logoSection: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 50,
  },

  ring: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
  },

  ring1: {
    width: 170,
    height: 170,
    borderColor: "rgba(233,69,96,0.6)",
  },

  ring2: {
    width: 170,
    height: 170,
    borderColor: "rgba(233,69,96,0.35)",
  },

  ring3: {
    width: 170,
    height: 170,
    borderColor: "rgba(233,69,96,0.18)",
  },

  rotatingRing: {
    position: "absolute",
    width: 155,
    height: 155,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "transparent",
    borderTopColor: "rgba(233,69,96,0.8)",
    borderRightColor: "rgba(233,69,96,0.2)",
  },

  logoWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: "rgba(233,69,96,0.5)",
    shadowColor: "#e94560",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 12,
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  liveBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(233,69,96,0.15)",
    borderWidth: 1,
    borderColor: "rgba(233,69,96,0.4)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e94560",
  },

  liveText: {
    color: "#e94560",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  textSection: {
    alignItems: "center",
    gap: 10,
  },

  lineContainer: {
    height: 1,
    marginBottom: 6,
    alignItems: "center",
  },

  line: {
    height: 1,
    backgroundColor: "rgba(233,69,96,0.5)",
  },

  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 8,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1.5,
    textAlign: "center",
  },

  tagline: {
    fontSize: 11,
    color: "rgba(233,69,96,0.7)",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 4,
  },

  bottomSection: {
    position: "absolute",
    bottom: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  dotActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e94560",
    shadowColor: "#e94560",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
});
