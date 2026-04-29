// hooks/usePosts.ts
import { mobileApi } from "@/services/mobileApi";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

const REFETCH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function usePosts() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  const isExpired = (post: any) => {
    if (!post?.expiresAt) return false;
    const expiresAt = new Date(post.expiresAt).getTime();
    return Number.isFinite(expiresAt) ? expiresAt < Date.now() : false;
  };

  const fetchPosts = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const res = await mobileApi.get("/posts", {
        params: { limit: 50 },
      });

      const payload =
        res?.data?.data ?? res?.data?.posts ?? res?.data?.items ?? res?.data;

      const allPosts = Array.isArray(payload) ? payload : [];

      const activePosts = allPosts.filter((post: any) => {
        const isPublished = post.isPublished === true;
        const statusPublished = post.status === "published";
        const expired = isExpired(post);

        return isPublished && statusPublished && !expired;
      });

      console.log(`Total: ${allPosts.length}, Active: ${activePosts.length}`);

      setPosts(activePosts);

    } catch (error: any) {
      console.log("Posts fetch error:", error?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();

    const interval = setInterval(() => fetchPosts(true), REFETCH_INTERVAL);

    const appStateSub = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active" && appStateRef.current !== "active") {
          fetchPosts(true);
        }
        appStateRef.current = state;
      },
    );

    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [fetchPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, [fetchPosts]);

  return { posts, loading, refreshing, onRefresh, refetch: fetchPosts };
}
