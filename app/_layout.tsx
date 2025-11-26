import { Stack } from "expo-router";
import { AppProvider } from "../context/AppContext";
import { AuthProvider } from "../context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppProvider>
        <Stack
          screenOptions={{ headerShown: false }}
          initialRouteName="auth/choose-role"
        >
          {/* AUTH SCREENS */}
          <Stack.Screen name="auth/choose-role" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/signup" />

          {/* CUSTOMER SCREENS */}
          <Stack.Screen name="customer/home" />
          <Stack.Screen name="customer/chat" />
          <Stack.Screen name="customer/mechanic-details" />
          <Stack.Screen name="customer/profile" />


          {/* MECHANIC SCREENS */}
          <Stack.Screen name="mechanic/dashboard" />
          <Stack.Screen name="mechanic/request" />
          <Stack.Screen name="mechanic/chat" />
          <Stack.Screen name="mechanic/profile" />

          {/* INDEX (if you ever use it) */}
          <Stack.Screen name="index" />
        </Stack>
      </AppProvider>
    </AuthProvider>
  );
}
