// Expo Push Notification Helper
export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: any;
  sound?: "default" | null;
  badge?: number;
  priority?: "default" | "normal" | "high";
  categoryId?: string;
}

export async function sendExpoPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: any
): Promise<boolean> {
  try {
    // Validate Expo Push Token format
    if (!pushToken.startsWith("ExponentPushToken[")) {
      console.error("❌ Invalid Expo Push Token format:", pushToken);
      return false;
    }

    const message: ExpoPushMessage = {
      to: pushToken,
      title,
      body,
      data: data || {},
      sound: "default",
      priority: "high",
    };

    console.log(`📤 Sending push notification to ${pushToken.substring(0, 30)}...`);
    console.log(`   Title: ${title}`);
    console.log(`   Body: ${body}`);

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    if (result.data && result.data[0].status === "ok") {
      console.log(`✅ Push notification sent successfully`);
      return true;
    } else {
      console.error("❌ Push notification failed:", result);
      return false;
    }
  } catch (error) {
    console.error("❌ Error sending push notification:", error);
    return false;
  }
}

export async function sendExpoPushNotifications(
  messages: ExpoPushMessage[]
): Promise<void> {
  try {
    console.log(`📤 Sending ${messages.length} push notifications...`);

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log("📬 Batch push notification result:", result);
  } catch (error) {
    console.error("❌ Error sending batch push notifications:", error);
  }
}

