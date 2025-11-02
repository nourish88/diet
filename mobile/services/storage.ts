import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { apiClient } from "./api";

class StorageService {
  async uploadMealPhoto(
    imageUri: string,
    dietId: number,
    ogunId: number,
    clientId: number
  ): Promise<string> {
    try {
      // Compress the image
      const compressedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            resize: {
              width: 400,
              height: 300,
            },
          },
        ],
        {
          compress: 0.5, // More compression for database storage
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Convert to base64 using FileSystem (expo) which works on mobile
      const base64 = await FileSystem.readAsStringAsync(compressedImage.uri, {
        encoding: "base64",
      });

      // Return as data URL to match previous behavior
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error("Error processing meal photo:", error);
      throw error;
    }
  }

  async saveMealPhotoToDatabase(
    imageData: string,
    dietId: number,
    ogunId: number,
    clientId: number
  ) {
    try {
      const response = await apiClient.createMealPhoto({
        imageData,
        dietId,
        ogunId,
        clientId,
      });
      return response;
    } catch (error) {
      console.error("Error saving meal photo to database:", error);
      throw error;
    }
  }

  async deleteMealPhoto(photoId: number, userId: number): Promise<void> {
    try {
      await apiClient.deleteMealPhoto(photoId, userId);
    } catch (error) {
      console.error("Error deleting meal photo:", error);
      throw error;
    }
  }

  async uploadProfileImage(imageUri: string, userId: number): Promise<string> {
    try {
      // Compress the image
      const compressedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            resize: {
              width: 200,
              height: 200,
            },
          },
        ],
        {
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Convert to base64 using FileSystem
      const base64 = await FileSystem.readAsStringAsync(compressedImage.uri, {
        encoding: "base64",
      });

      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error("Error processing profile image:", error);
      throw error;
    }
  }
}

export const storageService = new StorageService();
