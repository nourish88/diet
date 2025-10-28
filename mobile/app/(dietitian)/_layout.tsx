import { Stack } from "expo-router";

export default function DietitianLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="clients/[id]"
        options={{
          title: "Client Details",
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}

