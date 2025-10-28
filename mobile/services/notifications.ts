import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface MealReminder {
  id: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
}

class NotificationService {
  private scheduledNotifications: string[] = [];

  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Notification permissions not granted");
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("meal-reminders", {
        name: "Meal Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    return true;
  }

  async scheduleMealReminders(
    meals: Array<{
      id: number;
      name: string;
      time: string;
      items: Array<{ besin: { name: string } }>;
    }>
  ) {
    // Cancel existing notifications
    await this.cancelAllMealReminders();

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log("Cannot schedule notifications without permission");
      return;
    }

    for (const meal of meals) {
      try {
        const [hours, minutes] = meal.time.split(":").map(Number);

        // Schedule notification 30 minutes before meal time
        const reminderTime = new Date();
        reminderTime.setHours(hours, minutes - 30, 0, 0);

        // If the reminder time is in the past, schedule for tomorrow
        if (reminderTime < new Date()) {
          reminderTime.setDate(reminderTime.getDate() + 1);
        }

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `${meal.name} zamanı yaklaşıyor!`,
            body: `30 dakika sonra: ${meal.items
              .map((item) => item.besin.name)
              .join(", ")}`,
            sound: true,
          },
          trigger: {
            hour: reminderTime.getHours(),
            minute: reminderTime.getMinutes(),
            repeats: true,
          },
        });

        this.scheduledNotifications.push(notificationId);
        console.log(
          `Scheduled notification for ${
            meal.name
          } at ${reminderTime.toLocaleTimeString()}`
        );
      } catch (error) {
        console.error(`Error scheduling notification for ${meal.name}:`, error);
      }
    }
  }

  async cancelAllMealReminders() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.scheduledNotifications = [];
      console.log("Cancelled all meal reminders");
    } catch (error) {
      console.error("Error cancelling notifications:", error);
    }
  }

  async scheduleTestNotification() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log("Cannot schedule test notification without permission");
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification",
        body: "This is a test notification from Diet App",
        sound: true,
      },
      trigger: {
        seconds: 5,
      },
    });
  }

  async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Listen for notification events
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }
}

export const notificationService = new NotificationService();

// Helper function for scheduling notifications from diet data
export async function scheduleNotifications(
  meals: Array<{ id: number; title: string; body: string; time: string }>
) {
  const hasPermission = await notificationService.requestPermissions();
  if (!hasPermission) {
    throw new Error("Notification permissions not granted");
  }

  await notificationService.cancelAllMealReminders();

  for (const meal of meals) {
    try {
      const [hours, minutes] = meal.time.split(":").map(Number);

      // Schedule notification 30 minutes before meal time
      const reminderTime = new Date();
      reminderTime.setHours(hours, minutes - 30, 0, 0);

      // If the reminder time is in the past, schedule for tomorrow
      if (reminderTime < new Date()) {
        reminderTime.setDate(reminderTime.getDate() + 1);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: meal.title,
          body: meal.body,
          sound: true,
        },
        trigger: {
          hour: reminderTime.getHours(),
          minute: reminderTime.getMinutes(),
          repeats: true,
        },
      });

      console.log(
        `Scheduled notification for ${
          meal.title
        } at ${reminderTime.toLocaleTimeString()}`
      );
    } catch (error) {
      console.error(`Error scheduling notification for ${meal.title}:`, error);
    }
  }
}
