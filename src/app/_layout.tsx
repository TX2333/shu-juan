import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PortalHost } from '@rn-primitives/portal';
import { SettingsProvider } from '@/contexts/SettingsContext';
import "../global.css";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <StatusBar style="dark" backgroundColor="#F7F4ED" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F7F4ED' } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="book" />
          <Stack.Screen name="reader" />
        </Stack>
        <PortalHost />
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}