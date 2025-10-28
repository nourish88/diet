import { Stack } from "expo-router";

export default function ClientLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="diets/[id]"
        options={{
          title: "Diet Details",
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}

