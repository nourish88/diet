import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import api from "@/core/api/client";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  private expoPushToken: string | null = null;

  // Register for push notifications
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.log("📱 Push notifications only work on physical devices");
        return null;
      }

      // Request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("❌ Push notification permission denied");
        return null;
      }

      // Get Expo Push Token
      // Note: projectId is required for push notifications
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: "ad7183f3-4069-4359-a20e-9f99d46f6318",
        });

        this.expoPushToken = tokenData.data;
        console.log("✅ Expo Push Token:", this.expoPushToken);
      } catch (tokenError: any) {
        console.error("❌ Failed to get push token:", tokenError);
        
        // If projectId issue, provide helpful message
        if (tokenError.message?.includes("projectId")) {
          console.log("\n📝 To fix this:");
          console.log("1. Create Expo account: npx expo login");
          console.log("2. Initialize project: eas init");
          console.log("3. Update app.json with real projectId");
          console.log("\nFor now, push notifications won't work.");
        }
        
        return null;
      }

      // Save token to backend
      await this.savePushToken(this.expoPushToken);

      // Configure Android notification channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      return this.expoPushToken;
    } catch (error) {
      console.error("❌ Error registering for push notifications:", error);
      return null;
    }
  }

  // Save push token to backend
  async savePushToken(token: string): Promise<void> {
    try {
      console.log("💾 Saving push token to backend...");
      await api.post("/api/push-token", { pushToken: token });
      console.log("✅ Push token saved to backend");
    } catch (error) {
      console.error("❌ Error saving push token:", error);
    }
  }

  // Remove push token on logout
  async removePushToken(): Promise<void> {
    try {
      console.log("🗑️ Removing push token from backend...");
      await api.delete("/api/push-token");
      this.expoPushToken = null;
      console.log("✅ Push token removed from backend");
    } catch (error) {
      console.error("❌ Error removing push token:", error);
    }
  }

  // Setup notification listeners
  setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationTapped?: (response: Notifications.NotificationResponse) => void
  ) {
    // Listener for notifications received while app is in foreground
    const receivedListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("🔔 Notification received:", notification);
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      }
    );

    // Listener for notification tapped (app in background/killed)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("👆 Notification tapped:", response);
        if (onNotificationTapped) {
          onNotificationTapped(response);
        }
      }
    );

    // Return cleanup function
    return () => {
      receivedListener.remove();
      responseListener.remove();
    };
  }

  getToken(): string | null {
    return this.expoPushToken;
  }
}

// Singleton instance
export const pushNotificationService = new PushNotificationService();

