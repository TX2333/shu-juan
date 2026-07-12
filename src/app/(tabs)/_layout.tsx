import React from 'react';
import { Tabs } from 'expo-router';
import { Library, Settings } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#BC4431',
        tabBarInactiveTintColor: 'hsl(24 8% 45%)',
        tabBarStyle: {
          backgroundColor: '#F7F4ED',
          borderTopColor: 'hsl(30 16% 82%)',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '书库',
          tabBarIcon: ({ color, size }) => <Library size={size} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} strokeWidth={1.5} />,
        }}
      />
    </Tabs>
  );
}