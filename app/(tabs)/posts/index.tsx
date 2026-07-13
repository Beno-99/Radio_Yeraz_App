import EmptyState from "@/components/EmptyState";
import MarbleBackground from "@/components/MarbleBackground";
import PageHeader from "@/components/PageHeader";
import PostCard from "@/components/PostCard";
import { usePosts } from "@/hooks/usePosts";
import { useNavigationStore } from "@/stores/navigationStore";
import { Post } from "@/types/api";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export default function Posts() {
  const { posts, loading, refreshing, error, onRefresh, refetch } = usePosts();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const flatListRef = useRef<FlatList>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { targetPostId, setTargetPostId } = useNavigationStore();
  const [isScrolling, setIsScrolling] = useState(false);
  const isEmptyState = !loading && !error && posts?.length === 0;

  const params = useLocalSearchParams<{
    returnPostId?: string;
    returnVideoTime?: string;
  }>();

  useFocusEffect(
    useCallback(() => {
      refetch(true);
    }, [refetch]),
  );

  useEffect(() => {
    if (!targetPostId || posts.length === 0) return;

    const index = posts.findIndex(
      (p) =>
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

  const getPostKey = useCallback((item?: Post | null) => {
    return String(item?._id || item?.id || "");
  }, []);

  const openMedia = useCallback((_item: Post) => {}, []);

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
    ({ item }: { item: Post }) => {
      return (
        <PostCard
          item={item}
          openMedia={openMedia}
          isScrolling={isScrolling}
          returnVideoTime={
            params.returnPostId === String(item._id)
              ? Number(params.returnVideoTime || 0)
              : 0
          }
        />
      );
    },
    [openMedia, isScrolling, params.returnPostId, params.returnVideoTime],
  );

  const keyExtractor = useCallback(
    (item: Post, index: number) =>
      item?._id?.toString() || item?.id?.toString() || index.toString(),
    [],
  );

  const scrollToPost = useCallback(
    (postId: string) => {
      const index = posts.findIndex(
        (p) =>
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
    <MarbleBackground style={styles.container}>
      <PageHeader onNotificationPress={scrollToPost} />

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#e94560"
          style={{ marginTop: 40 }}
        />
      ) : error && posts.length === 0 ? (
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>Could not load posts</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
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
          contentContainerStyle={[
            styles.listContent,
            isLandscape && styles.listContentLandscape,
          ]}
          removeClippedSubviews={false}
          maxToRenderPerBatch={4}
          windowSize={5}
          initialNumToRender={3}
          updateCellsBatchingPeriod={50}
        />
      )}
    </MarbleBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  errorTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtitle: {
    color: "#cbd5e1",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
    textAlign: "center",
  },
  retryButton: {
    minWidth: 132,
    alignItems: "center",
    backgroundColor: "#e94560",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  listContent: {
    paddingBottom: 100,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  listContentLandscape: {
    paddingBottom: 72,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
});
