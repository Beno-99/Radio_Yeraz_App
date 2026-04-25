// services/eventReminder.service.ts

class EventReminderService {
  private lastCheckedDate: string | null = null;

  async checkEventReminders(posts: any[]) {
    try {
      // Only run once per day
      const today = new Date().toDateString();
      if (this.lastCheckedDate === today) {
        return;
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setHours(23, 59, 59, 999);

      const tomorrowEvents = posts.filter((post) => {
        if (!post.eventDate) return false;
        const eventDate = new Date(post.eventDate);

        return eventDate >= tomorrow && eventDate <= dayAfterTomorrow;
      });

      if (tomorrowEvents.length === 0) {
        console.log("✅ No events tomorrow");
        this.lastCheckedDate = today;
        return;
      }

      console.log(`📅 Found ${tomorrowEvents.length} events tomorrow`);

      // Import store directly
      const { useNotificationStore } =
        await import("@/stores/notificationStore");
      const { addNotification } = useNotificationStore.getState();

      for (const post of tomorrowEvents) {
        const eventDate = new Date(post.eventDate);

        const formattedDate = eventDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
        addNotification({
          id: `reminder-${post._id || post.id}-${today}`,
          title: post.title,
          message: `🎉 Don't miss this event! It's happening tomorrow, ${formattedDate}`,
          type: "EVENT_REMINDER",
          data: { postId: post._id || post.id },
          createdAt: new Date().toISOString(),
          isRead: false,
        });

        console.log(`✅ Reminder added to bell for: ${post.title}`);
      }

      this.lastCheckedDate = today;
    } catch (e: any) {
      console.log("⚠️ Event reminder error:", e?.message);
    }
  }
}

export const eventReminderService = new EventReminderService();
