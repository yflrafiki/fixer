import { Stack } from 'expo-router';
import { AppProvider } from '../context/AppContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="customer-signup" />
        <Stack.Screen name="mechanic-signup" />
        <Stack.Screen name="customer-home" />
        <Stack.Screen name="mechanic-home" />
        <Stack.Screen name="chat/[requestId]" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AppProvider>
  );
}