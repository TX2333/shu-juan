import React from 'react';
import { Stack } from 'expo-router';

export default function BookLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F7F4ED' } }} />;
}