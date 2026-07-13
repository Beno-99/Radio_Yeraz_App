import React from "react";
import { StyleSheet, View } from "react-native";
import { ImageZoom } from "@likashefqet/react-native-image-zoom";

type Props = {
  uri: string;
};

export default function ZoomableImage({ uri }: Props) {
  return (
    <View style={styles.flex}>
      <ImageZoom
        uri={uri}
        minScale={1}
        maxScale={4}
        doubleTapScale={2.5}
        isPanEnabled
        isPinchEnabled
        isDoubleTapEnabled
        resizeMode="contain"
        style={styles.viewerImage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerImage: {
    width: "100%",
    height: "100%",
  },
});
