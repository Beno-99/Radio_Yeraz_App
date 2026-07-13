import React, { memo, useEffect } from "react";
import {
  Dimensions,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const FALLBACK_WAVEFORM_BARS = [
  5, 8, 14, 24, 34, 42, 30, 24, 38, 54, 64, 70, 66, 58, 44, 34, 28, 38, 54,
  66, 70, 62, 48, 36, 44, 58, 52, 40, 34, 42, 56, 70, 50, 28, 14, 8, 5,
];
const BAR_WIDTH = 4;
const BAR_GAP = 2;
const MIN_BAR_HEIGHT = 3;
const ACTIVE_BAR_SCALE = 0.34;
const IDLE_BAR_SCALE = 0.24;
const SCREEN_WIDTH = Dimensions.get("window").width;
const WAVEFORM_WIDTH = Math.min(320, SCREEN_WIDTH * 0.78);
const WAVEFORM_INNER_WIDTH = WAVEFORM_WIDTH - 20;
const IDLE_BAR_COUNT = Math.floor(
  (WAVEFORM_INNER_WIDTH + BAR_GAP) / (BAR_WIDTH + BAR_GAP),
);
const IDLE_WAVEFORM_BARS = Array.from({
  length: Math.ceil(IDLE_BAR_COUNT / FALLBACK_WAVEFORM_BARS.length) + 1,
})
  .flatMap(() => FALLBACK_WAVEFORM_BARS)
  .slice(0, IDLE_BAR_COUNT);
const WAVEFORM_LOOP = Array.from({ length: 6 }).flatMap(
  () => FALLBACK_WAVEFORM_BARS,
);
const WAVEFORM_PATTERN_OFFSET =
  FALLBACK_WAVEFORM_BARS.length * (BAR_WIDTH + BAR_GAP);
const WAVEFORM_LOOP_WIDTH =
  WAVEFORM_LOOP.length * BAR_WIDTH + (WAVEFORM_LOOP.length - 1) * BAR_GAP;
const WAVEFORM_DRIFT_DURATION_MS = 11000;
const WAVEFORM_PLAY_TRANSITION_MS = 260;
const WAVEFORM_STOP_TRANSITION_MS = 180;

type StreamWaveformProps = {
  active: boolean;
  style?: StyleProp<ViewStyle>;
};

type WaveformBarProps = {
  height: number;
  disabled?: boolean;
};

function WaveformBar({ height, disabled = false }: WaveformBarProps) {
  return (
    <View style={styles.barTrack}>
      {disabled ? (
        <View
          style={[
            styles.disabledBarBlur,
            {
              height: Math.max(MIN_BAR_HEIGHT, height * IDLE_BAR_SCALE) + 4,
            },
          ]}
        />
      ) : null}
      <View
        style={[
          styles.bar,
          disabled ? styles.disabledBar : styles.activeBar,
          {
            height: Math.max(
              MIN_BAR_HEIGHT,
              height * (disabled ? IDLE_BAR_SCALE : ACTIVE_BAR_SCALE),
            ),
          },
        ]}
      />
    </View>
  );
}

function StreamWaveform({ active, style }: StreamWaveformProps) {
  const drift = useSharedValue(0);
  const activeProgress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withTiming(active ? 1 : 0, {
      duration: active ? WAVEFORM_PLAY_TRANSITION_MS : WAVEFORM_STOP_TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, activeProgress]);

  useEffect(() => {
    if (active) {
      drift.value = 0;
      drift.value = withRepeat(
        withTiming(1, {
          duration: WAVEFORM_DRIFT_DURATION_MS,
          easing: Easing.linear,
        }),
        -1,
        false,
      );

      return () => {
        cancelAnimation(drift);
      };
    }

    cancelAnimation(drift);
    drift.value = 0;

    return () => {
      cancelAnimation(drift);
    };
  }, [active, drift]);

  const animatedDriftStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: -drift.value * WAVEFORM_PATTERN_OFFSET,
        },
      ],
    };
  });

  const animatedActiveLayerStyle = useAnimatedStyle(() => {
    return {
      opacity: activeProgress.value,
      transform: [
        {
          scaleY: 0.82 + activeProgress.value * 0.18,
        },
      ],
    };
  });

  const animatedIdleLayerStyle = useAnimatedStyle(() => {
    const idleProgress = 1 - activeProgress.value;

    return {
      opacity: idleProgress,
      transform: [
        {
          scaleY: 0.94 + idleProgress * 0.06,
        },
      ],
    };
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.waveWindow}>
        <Animated.View
          style={[styles.waveLayer, animatedActiveLayerStyle]}
        >
          <Animated.View style={[styles.bars, animatedDriftStyle]}>
            {WAVEFORM_LOOP.map((height, index) => (
              <WaveformBar key={`${height}-${index}`} height={height} />
            ))}
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.waveLayer, animatedIdleLayerStyle]}>
          <View style={styles.idleWave}>
            <View style={styles.idleWaveHaze} />
            <View style={styles.idleBars}>
              {IDLE_WAVEFORM_BARS.map((height, index) => (
                <WaveformBar
                  key={`idle-${height}-${index}`}
                  height={height}
                  disabled
                />
              ))}
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

export default memo(StreamWaveform);

const styles = StyleSheet.create({
  container: {
    width: WAVEFORM_WIDTH,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  waveWindow: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
    paddingHorizontal: 10,
  },
  waveLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  bars: {
    width: WAVEFORM_LOOP_WIDTH,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: BAR_GAP,
  },
  barTrack: {
    width: BAR_WIDTH,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 999,
  },
  activeBar: {
    backgroundColor: "#34b7f1",
  },
  idleWave: {
    width: WAVEFORM_INNER_WIDTH,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  idleWaveHaze: {
    position: "absolute",
    width: "100%",
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(2, 6, 23, 0.42)",
  },
  idleBars: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: BAR_GAP,
    opacity: 0.78,
  },
  disabledBar: {
    backgroundColor: "rgba(82, 95, 113, 0.72)",
  },
  disabledBarBlur: {
    position: "absolute",
    width: BAR_WIDTH + 3,
    borderRadius: 999,
    backgroundColor: "rgba(2, 6, 23, 0.42)",
  },
});
