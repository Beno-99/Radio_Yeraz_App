// hooks/usePosts.ts
import { mobileApi } from "@/services/mobileApi";
import { eventReminderService } from "@/services/eventReminder.service";
import { socketService } from "@/services/socket.service";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

const REFETCH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function usePosts() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  const fetchPosts = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await mobileApi.get("/posts", {
        params: { limit: 50 },
      });
      const payload =
        res?.data?.data ?? res?.data?.posts ?? res?.data?.items ?? res?.data;

      const allPosts = Array.isArray(payload) ? payload : [];

      // Only show published posts
      const publishedPosts = allPosts.filter(
        (post: any) => post.isPublished === true,
      );

      console.log(
        `Total: ${allPosts.length}, Published: ${publishedPosts.length}`,
      );

      setPosts(publishedPosts);

      // ← Schedule event reminders for tomorrow's events
      try {
        await eventReminderService.checkEventReminders(publishedPosts);
      } catch (e: any) {
        console.log("Event reminder error:", e?.message);
      }
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

    const handleNewPost = () => {
      fetchPosts(true);
    };

    const handleAdminNotification = (data: any) => {
      if (
        data?.type === "POST_DELETED" ||
        data?.type === "POST_UPDATED" ||
        data?.type === "POST_PUBLISHED" ||
        data?.type === "AD_TOGGLED" ||
        data?.type === "AD_DELETED"
      ) {
        fetchPosts(true);
      }
    };

    socketService.on("new_notification", handleNewPost);
    socketService.on("admin_notification", handleAdminNotification);

    return () => {
      clearInterval(interval);
      appStateSub.remove();
      socketService.off("new_notification", handleNewPost);
      socketService.off("admin_notification", handleAdminNotification);
    };
  }, [fetchPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, [fetchPosts]);

  return { posts, loading, refreshing, onRefresh, refetch: fetchPosts };
}
