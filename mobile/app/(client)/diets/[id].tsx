import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../../hooks/useAuth";
import { apiClient } from "../../../services/api";
import { uploadImage } from "../../../services/storage";
import { scheduleNotifications } from "../../../services/notifications";

export default function ClientDietDetailScreen() {
  const { id } = useLocalSearchParams();
  const dietId = parseInt(id as string);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [selectedOgunId, setSelectedOgunId] = useState<number | null>(null);

  const { data: dietData, isLoading } = useQuery({
    queryKey: ["diet", dietId],
    queryFn: () => apiClient.getDiet(dietId),
  });

  const { data: commentsData } = useQuery({
    queryKey: ["comments", dietId],
    queryFn: () => apiClient.getComments(dietId),
  });

  const { data: photosData } = useQuery({
    queryKey: ["meal-photos", dietId],
    queryFn: () => apiClient.getMealPhotos(dietId),
  });

  const createCommentMutation = useMutation({
    mutationFn: (data: { content: string; ogunId?: number }) =>
      apiClient.createComment({
        content: data.content,
        userId: user!.id,
        dietId,
        ogunId: data.ogunId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", dietId] });
      setComment("");
      setSelectedOgunId(null);
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: (data: { imageData: string; ogunId: number }) =>
      apiClient.createMealPhoto({
        imageData: data.imageData,
        dietId,
        ogunId: data.ogunId,
        clientId: user!.client!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-photos", dietId] });
      Alert.alert("Success", "Photo uploaded successfully");
    },
  });

  const diet = dietData?.diet;
  const comments = commentsData?.comments || [];
  const photos = photosData?.photos || [];

  const handleAddComment = () => {
    if (!comment.trim()) {
      Alert.alert("Error", "Please enter a comment");
      return;
    }

    createCommentMutation.mutate({
      content: comment,
      ogunId: selectedOgunId || undefined,
    });
  };

  const handleUploadPhoto = async (ogunId: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photos");
      return;
    }

    const result = await ImagePicker.launchImagePickerAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const imageData = await uploadImage(result.assets[0].uri);
      uploadPhotoMutation.mutate({ imageData, ogunId });
    }
  };

  const handleScheduleReminders = () => {
    if (!diet?.oguns) return;

    scheduleNotifications(
      diet.oguns.map((ogun: any) => ({
        id: ogun.id,
        title: `Meal Time: ${ogun.name}`,
        body: `Time for ${ogun.name}`,
        time: ogun.time,
      }))
    );

    Alert.alert("Success", "Meal reminders scheduled!");
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!diet) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Diet not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Diet Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {diet.tarih ? new Date(diet.tarih).toLocaleDateString() : "Diet Plan"}
        </Text>
        {diet.hedef && (
          <View style={styles.goalCard}>
            <Text style={styles.goalLabel}>Goal:</Text>
            <Text style={styles.goalText}>{diet.hedef}</Text>
          </View>
        )}
      </View>

      {/* Schedule Reminders Button */}
      <TouchableOpacity
        style={styles.reminderButton}
        onPress={handleScheduleReminders}
      >
        <Text style={styles.reminderButtonText}>
          🔔 Schedule Meal Reminders
        </Text>
      </TouchableOpacity>

      {/* Meals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meals</Text>
        {diet.oguns?.map((ogun: any) => (
          <View key={ogun.id} style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <View>
                <Text style={styles.mealName}>{ogun.name}</Text>
                <Text style={styles.mealTime}>{ogun.time}</Text>
              </View>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => handleUploadPhoto(ogun.id)}
              >
                <Text style={styles.photoButtonText}>📷 Photo</Text>
              </TouchableOpacity>
            </View>

            {ogun.detail && (
              <Text style={styles.mealDetail}>{ogun.detail}</Text>
            )}

            {/* Menu Items */}
            {ogun.items?.map((item: any) => (
              <View key={item.id} style={styles.menuItem}>
                <Text style={styles.menuItemName}>{item.besin?.name}</Text>
                <Text style={styles.menuItemAmount}>
                  {item.miktar} {item.birim?.name}
                </Text>
              </View>
            ))}

            {/* Meal Photos */}
            {photos
              .filter((photo: any) => photo.ogunId === ogun.id)
              .map((photo: any) => (
                <Image
                  key={photo.id}
                  source={{ uri: `data:image/jpeg;base64,${photo.imageData}` }}
                  style={styles.mealPhoto}
                />
              ))}

            {/* Add Comment for this meal */}
            <TouchableOpacity
              style={styles.commentMealButton}
              onPress={() => setSelectedOgunId(ogun.id)}
            >
              <Text style={styles.commentMealButtonText}>
                💬 Comment on this meal
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Comments Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comments</Text>

        {/* Add Comment */}
        <View style={styles.commentInputCard}>
          {selectedOgunId && (
            <View style={styles.commentTarget}>
              <Text style={styles.commentTargetText}>
                Commenting on:{" "}
                {diet.oguns?.find((o: any) => o.id === selectedOgunId)?.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedOgunId(null)}>
                <Text style={styles.commentTargetClear}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <TouchableOpacity
            style={styles.commentButton}
            onPress={handleAddComment}
            disabled={createCommentMutation.isPending}
          >
            <Text style={styles.commentButtonText}>
              {createCommentMutation.isPending ? "Posting..." : "Post Comment"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Comments List */}
        {comments.map((comment: any) => (
          <View key={comment.id} style={styles.commentCard}>
            <Text style={styles.commentAuthor}>
              {comment.user?.role === "dietitian" ? "Dietitian" : "You"}
            </Text>
            {comment.ogun && (
              <Text style={styles.commentMeal}>Re: {comment.ogun.name}</Text>
            )}
            <Text style={styles.commentContent}>{comment.content}</Text>
            <Text style={styles.commentDate}>
              {new Date(comment.createdAt).toLocaleString()}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  goalCard: {
    backgroundColor: "#f0f8ff",
    padding: 12,
    borderRadius: 8,
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 4,
  },
  goalText: {
    fontSize: 14,
    color: "#333",
  },
  reminderButton: {
    backgroundColor: "#007AFF",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  reminderButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  mealCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mealName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  mealTime: {
    fontSize: 14,
    color: "#007AFF",
    marginTop: 4,
  },
  mealDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    fontStyle: "italic",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuItemName: {
    fontSize: 16,
    color: "#333",
  },
  menuItemAmount: {
    fontSize: 16,
    color: "#666",
  },
  photoButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  photoButtonText: {
    fontSize: 14,
    color: "#333",
  },
  mealPhoto: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 12,
  },
  commentMealButton: {
    marginTop: 12,
    padding: 8,
    alignItems: "center",
  },
  commentMealButtonText: {
    fontSize: 14,
    color: "#007AFF",
  },
  commentInputCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  commentTarget: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0f8ff",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  commentTargetText: {
    fontSize: 14,
    color: "#007AFF",
  },
  commentTargetClear: {
    fontSize: 18,
    color: "#007AFF",
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  commentButton: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  commentButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  commentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 4,
  },
  commentMeal: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  commentContent: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
  },
  commentDate: {
    fontSize: 12,
    color: "#999",
  },
  errorText: {
    fontSize: 16,
    color: "#ff3b30",
  },
});

