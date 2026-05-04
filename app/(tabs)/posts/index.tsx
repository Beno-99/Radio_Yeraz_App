import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import PostCard from "@/components/PostCard";
import { usePosts } from "@/hooks/usePosts";
import { useNavigationStore } from "@/stores/navigationStore";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

export default function Posts() {
  const { posts, loading, refreshing, onRefresh } = usePosts();
  const flatListRef = useRef<FlatList>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { targetPostId, setTargetPostId } = useNavigationStore();
  const [isScrolling, setIsScrolling] = useState(false);
  const isEmptyState = !loading && posts?.length === 0;

  useEffect(() => {
    if (!targetPostId || posts.length === 0) return;

    const index = posts.findIndex(
      (p: any) =>
        String(p._id) === String(targetPostId) ||
        String(p.id) === String(targetPostId),
    );

    if (index !== -1) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0,
        });
        setTargetPostId(null);
      }, 500);
    } else {
      setTargetPostId(null);
    }
  }, [targetPostId, posts, setTargetPostId]);

  const openMedia = useCallback((item: any) => {
    console.log("open media", item);
  }, []);

  const handleScrollStart = useCallback(() => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  const handleScrollStop = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <PostCard
        item={item}
        openMedia={openMedia}
        isScrolling={isScrolling}
        isRefreshing={refreshing}
      />
    ),
    [openMedia, isScrolling],
  );

  const keyExtractor = useCallback(
    (item: any, index: number) =>
      item?._id?.toString() || item?.id?.toString() || index.toString(),
    [],
  );

  const scrollToPost = useCallback(
    (postId: string) => {
      const index = posts.findIndex(
        (p: any) =>
          String(p._id) === String(postId) || String(p.id) === String(postId),
      );
      if (index !== -1 && flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0,
        });
      }
    },
    [posts],
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0a0e17", "#111827", "#0f172a"]}
        style={StyleSheet.absoluteFill}
      />

      <PageHeader onNotificationPress={scrollToPost} />

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#e94560"
          style={{ marginTop: 40 }}
        />
      ) : isEmptyState ? (
        <EmptyState
          title="No Posts Yet"
          subtitle="Tune in later for updates"
          logoSource={{
            uri: "https://www.radioyeraz.com/radioLogoOrg-1024.png",
          }}
          logoSize={90}
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onScrollBeginDrag={handleScrollStart}
          onMomentumScrollBegin={handleScrollStart}
          onScrollEndDrag={handleScrollStop}
          onMomentumScrollEnd={handleScrollStop}
          onScrollToIndexFailed={(info) => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#e94560"
            />
          }
          contentContainerStyle={styles.listContent}
          removeClippedSubviews
          maxToRenderPerBatch={4}
          windowSize={5}
          initialNumToRender={3}
          updateCellsBatchingPeriod={50}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    paddingBottom: 100,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
});
