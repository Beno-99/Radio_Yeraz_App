import EmptyState from "@/components/EmptyState";
import MarbleBackground from "@/components/MarbleBackground";
import PageHeader from "@/components/PageHeader";
import PostCard from "@/components/PostCard";
import {
  FavoritePostEntry,
  getPostFavoriteId,
  useFavoritePostsStore,
} from "@/stores/favoritePostsStore";
import {
  extractApiItem,
  getApiErrorMessage,
  isCancelledApiError,
  MobileApiError,
  mobileApi,
} from "@/services/mobileApi";
import { ApiItemResponse, MobilePublicPost, Post } from "@/types/api";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export default function Favorites() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const favorites = useFavoritePostsStore((state) => state.favorites);
  const removeFavorite = useFavoritePostsStore((state) => state.removeFavorite);
  const syncPosts = useFavoritePostsStore((state) => state.syncPosts);
  const markUnavailable = useFavoritePostsStore(
    (state) => state.markUnavailable,
  );
  const flatListRef = useRef<FlatList>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const favoriteEntries = useMemo(
    () =>
      Object.values(favorites).sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
      ),
    [favorites],
  );

  const getPostKey = useCallback((item?: Post | MobilePublicPost | null) => {
    return String(item?._id || item?.id || "");
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

  const refreshFavorites = useCallback(async () => {
    if (favoriteEntries.length === 0 || refreshing) return;

    setRefreshing(true);
    setRefreshError(null);

    try {
      const settled = await Promise.allSettled(
        favoriteEntries.map(async (entry) => {
          const postId = getPostFavoriteId(entry.post);
          if (!postId) return;

          try {
            const response = await mobileApi.get<ApiItemResponse<Post>>(
              `/posts/${postId}`,
            );
            const post = extractApiItem<Post>(response.data, ["post"]);

            if (post) {
              syncPosts([post]);
              return;
            }

            markUnavailable(postId);
          } catch (error) {
            if (isCancelledApiError(error)) return;

            if (error instanceof MobileApiError && error.status === 404) {
              markUnavailable(postId);
              return;
            }

            throw error;
          }
        }),
      );

      const rejected = settled.find((result) => result.status === "rejected");
      if (rejected && rejected.status === "rejected") {
        setRefreshError(getApiErrorMessage(rejected.reason));
      }
    } finally {
      setRefreshing(false);
    }
  }, [favoriteEntries, markUnavailable, refreshing, syncPosts]);

  const renderItem = useCallback(
    ({ item }: { item: FavoritePostEntry }) => {
      const itemKey = getPostKey(item.post);

      if (item.unavailableAt) {
        return (
          <View style={styles.unavailableCard}>
            <View style={styles.unavailableIcon}>
              <Ionicons name="alert-circle-outline" size={24} color="#fda4af" />
            </View>
            <View style={styles.unavailableTextWrap}>
              <Text style={styles.unavailableTitle} numberOfLines={2}>
                {item.post.title || "Saved post"}
              </Text>
              <Text style={styles.unavailableText}>
                This post is no longer available. It may have been removed by
                Radio Yeraz.
              </Text>
              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.removeButton}
                onPress={() => removeFavorite(itemKey)}
              >
                <Text style={styles.removeButtonText}>
                  Remove from Favorites
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      return <PostCard item={item.post} isScrolling={isScrolling} />;
    },
    [getPostKey, isScrolling, removeFavorite],
  );

  const keyExtractor = useCallback(
    (item: FavoritePostEntry, index: number) =>
      item.post?._id?.toString() ||
      item.post?.id?.toString() ||
      index.toString(),
    [],
  );

  return (
    <MarbleBackground style={styles.container}>
      <PageHeader title="Favorites" />

      {favoriteEntries.length === 0 ? (
        <EmptyState
          title="No Favorites Yet"
          subtitle="Your saved Radio Yeraz posts will appear here"
          logoSize={90}
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={favoriteEntries}
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
              onRefresh={refreshFavorites}
              tintColor="#e94560"
            />
          }
          ListHeaderComponent={
            refreshError ? (
              <View style={styles.refreshMessage}>
                <Text style={styles.refreshMessageText}>{refreshError}</Text>
              </View>
            ) : null
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
  refreshMessage: {
    marginBottom: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.28)",
  },
  refreshMessageText: {
    color: "#fde68a",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  unavailableCard: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(9,14,28,0.9)",
    borderWidth: 1,
    borderColor: "rgba(251,113,133,0.28)",
  },
  unavailableIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(233,69,96,0.13)",
  },
  unavailableTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  unavailableTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  unavailableText: {
    marginTop: 6,
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
  },
  removeButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: "#e94560",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
});
