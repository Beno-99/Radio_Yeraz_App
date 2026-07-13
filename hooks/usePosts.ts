// hooks/usePosts.ts
import { NetworkContext } from "@/components/NetworkProvider";
import {
  extractApiArray,
  getApiErrorMessage,
  isCancelledApiError,
  MobileApiError,
  mobileApi,
} from "@/services/mobileApi";
import { eventReminderService } from "@/services/eventReminder.service";
import { socketService } from "@/services/socket.service";
import { useFavoritePostsStore } from "@/stores/favoritePostsStore";
import { ApiPaginatedResponse, Post } from "@/types/api";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

const REFETCH_INTERVAL = 10 * 60 * 1000;
const INITIAL_NETWORK_RETRY_DELAY_MS = 1200;

const isExpired = (post: Post) => {
  if (!post.expiresAt) return false;
  const expiresAt = new Date(post.expiresAt).getTime();
  return Number.isFinite(expiresAt) ? expiresAt < Date.now() : false;
};

const isVisiblePost = (post: Post) =>
  post.isPublished === true && post.status === "published" && !isExpired(post);

const getNotificationType = (data: unknown) => {
  if (!data || typeof data !== "object") return "";
  const record = data as {
    type?: unknown;
    notificationType?: unknown;
    entityType?: unknown;
  };
  return String(record.type || record.notificationType || record.entityType || "")
    .trim()
    .toUpperCase();
};

const shouldRefreshPosts = (data: unknown) => {
  const type = getNotificationType(data);
  return type.includes("POST");
};

export function usePosts() {
  const { networkStatus } = useContext(NetworkContext);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const abortRef = useRef<AbortController | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const fetchPosts = useCallback(async (silent = false, retryCount = 0) => {
    if (networkStatus !== "online") {
      if (networkStatus === "offline") {
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }

    clearRetryTimer();
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
        useFavoritePostsStore.getState().syncPosts(activePosts);
        setPosts(activePosts);
        void eventReminderService.checkEventReminders(activePosts);
      }
    } catch (err) {
      if (!isCancelledApiError(err) && !controller.signal.aborted) {
        const isTransientNetworkError =
          err instanceof MobileApiError &&
          (err.code === "network" || err.code === "timeout");

        if (isTransientNetworkError && retryCount === 0 && posts.length === 0) {
          retryTimerRef.current = setTimeout(() => {
            fetchPosts(silent, retryCount + 1);
            retryTimerRef.current = null;
          }, INITIAL_NETWORK_RETRY_DELAY_MS);
          return;
        }

        setError(getApiErrorMessage(err));
      }
    } finally {
      if (!controller.signal.aborted) {
        if (!retryTimerRef.current) setLoading(false);
        setRefreshing(false);
      }
    }
  }, [clearRetryTimer, networkStatus, posts.length]);

  useEffect(() => {
    if (networkStatus !== "online") return;

    fetchPosts();
    const interval = setInterval(() => fetchPosts(true), REFETCH_INTERVAL);

    const appStateSub = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (
          state === "active" &&
          appStateRef.current !== "active" &&
          networkStatus === "online"
        ) {
          fetchPosts(true);
        }
        appStateRef.current = state;
      },
    );

    return () => {
      abortRef.current?.abort();
      clearRetryTimer();
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [clearRetryTimer, fetchPosts, networkStatus]);

  useEffect(() => {
    if (networkStatus !== "online") return;

    const handlePostChange = (data: unknown) => {
      if (shouldRefreshPosts(data)) {
        fetchPosts(true);
      }
    };

    socketService.connect();
    socketService.on("admin_notification", handlePostChange);
    socketService.on("new_notification", handlePostChange);

    return () => {
      socketService.off("admin_notification", handlePostChange);
      socketService.off("new_notification", handlePostChange);
      socketService.disconnect();
    };
  }, [fetchPosts, networkStatus]);

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
