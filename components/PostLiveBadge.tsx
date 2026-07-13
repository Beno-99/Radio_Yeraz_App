import { PostLiveStatus } from "@/types/api";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

type LiveBadgeState = Exclude<PostLiveStatus, "UNKNOWN" | "NOT_LIVE">;

type Props = {
  liveStatus?: string | null;
  isLive?: boolean | null;
  style?: StyleProp<ViewStyle>;
};

function getBadgeState(
  liveStatus?: string | null,
  isLive?: boolean | null,
): LiveBadgeState | null {
  switch (liveStatus) {
    case "LIVE":
      return "LIVE";
    case "UPCOMING":
      return "UPCOMING";
    case "WAS_LIVE":
      return "WAS_LIVE";
    case undefined:
    case null:
    case "":
      return isLive ? "LIVE" : null;
    default:
      return null;
  }
}

export default function PostLiveBadge({ liveStatus, isLive, style }: Props) {
  const badgeState = getBadgeState(liveStatus, isLive);
  if (!badgeState) return null;

  const label =
    badgeState === "LIVE"
      ? "LIVE"
      : badgeState === "UPCOMING"
        ? "Upcoming"
        : "Was Live";

  return (
    <View style={[styles.badge, styles[badgeState], style]}>
      {badgeState === "LIVE" ? <View style={styles.liveDot} /> : null}
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  LIVE: {
    backgroundColor: "rgba(239, 68, 68, 0.92)",
  },
  UPCOMING: {
    backgroundColor: "rgba(245, 158, 11, 0.92)",
  },
  WAS_LIVE: {
    backgroundColor: "rgba(71, 85, 105, 0.92)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  text: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
});
