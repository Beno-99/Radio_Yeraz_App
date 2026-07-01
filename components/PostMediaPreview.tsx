import {
  getAbsoluteMediaUrl,
  getPostMediaType,
  getYouTubeThumbnail,
  getYouTubeVideoId,
} from "@/utils/media";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Image,
  ImageResizeMode,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

type MediaPost = Parameters<typeof getPostMediaType>[0];

type Props = {
  post: MediaPost;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
};

export default function PostMediaPreview({
  post,
  onPress,
  style,
  resizeMode = "cover",
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const mediaType = getPostMediaType(post);

  const mediaUri = useMemo(() => {
    if (mediaType === "youtube") {
      const videoId = getYouTubeVideoId(post?.youtubeVideoId, post?.youtubeUrl);
      return getYouTubeThumbnail(videoId);
    }

    if (mediaType === "image") {
      return getAbsoluteMediaUrl(post?.mainImage);
    }

    return undefined;
  }, [mediaType, post?.mainImage, post?.youtubeUrl, post?.youtubeVideoId]);

  const content = (() => {
    if ((mediaType === "image" || mediaType === "youtube") && mediaUri && !imageFailed) {
      return (
        <>
          <Image
            source={{ uri: mediaUri }}
            style={styles.image}
            resizeMode={resizeMode}
            onError={() => setImageFailed(true)}
          />
          {mediaType === "youtube" ? (
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={28} color="#fff" />
              </View>
            </View>
          ) : null}
        </>
      );
    }

    if (mediaType === "facebook") {
      return (
        <View style={styles.placeholder}>
          <Ionicons name="logo-facebook" size={34} color="#93c5fd" />
          <Text style={styles.placeholderText}>Facebook Video</Text>
        </View>
      );
    }

    return (
      <View style={styles.placeholder}>
        <Ionicons name="image-outline" size={34} color="#94a3b8" />
        <Text style={styles.placeholderText}>Media unavailable</Text>
      </View>
    );
  })();

  if (mediaType === "none") return null;

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[styles.container, style]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#0f172a",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.16)",
  },
  playButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(233, 69, 96, 0.9)",
  },
  placeholder: {
    flex: 1,
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
  },
  placeholderText: {
    color: "#dbeafe",
    fontSize: 13,
    fontWeight: "700",
  },
});
