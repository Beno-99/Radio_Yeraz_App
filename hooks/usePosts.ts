// hooks/usePosts.ts
import {
  extractApiArray,
  getApiErrorMessage,
  isCancelledApiError,
  mobileApi,
} from "@/services/mobileApi";
import { ApiPaginatedResponse, Post } from "@/types/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

const REFETCH_INTERVAL = 10 * 60 * 1000;

const isExpired = (post: Post) => {
  if (!post.expiresAt) return false;
  const expiresAt = new Date(post.expiresAt).getTime();
  return Number.isFinite(expiresAt) ? expiresAt < Date.now() : false;
};

const isVisiblePost = (post: Post) =>
  post.isPublished === true && post.status === "published" && !isExpired(post);

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPosts = useCallback(async (silent = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (!silent) setLoading(true);
      setError(null);

      const res = await mobileApi.get<ApiPaginatedResponse<Post>>("/posts", {
        params: {
          isPublished: true,
          limit: 50,
          sortBy: "postedDate",
          sortOrder: "desc",
        },
        signal: controller.signal,
      });

      const activePosts = extractApiArray<Post>(res.data).filter(isVisiblePost);

      if (!controller.signal.aborted) {
        setPosts(activePosts);
      }
    } catch (err) {
      if (!isCancelledApiError(err) && !controller.signal.aborted) {
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
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
      abortRef.current?.abort();
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [fetchPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    loading,
    refreshing,
    error,
    onRefresh,
    refetch: fetchPosts,
  };
}
