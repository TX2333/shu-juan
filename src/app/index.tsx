import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen } from 'lucide-react-native';

export default function IndexScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background items-center justify-center px-8">
      <View className="items-center gap-6">
        <View
          className="w-24 h-24 items-center justify-center"
          style={{ backgroundColor: '#BC4431', borderRadius: 4 }}
        >
          <BookOpen size={44} color="#F7F4ED" strokeWidth={1.5} />
        </View>
        <View className="items-center gap-2">
          <Text className="text-3xl font-bold text-foreground">书卷</Text>
          <Text className="text-base text-muted-foreground">自动跟读听书</Text>
        </View>
        <Text className="text-sm text-muted-foreground text-center leading-6">
          导入本地文档，AI智能朗读，沉浸式听书体验
        </Text>
        <Pressable
          onPress={() => router.push('/(tabs)/home')}
          className="bg-accent px-10 py-3 active:opacity-70"
          style={{ borderRadius: 2 }}
        >
          <Text className="text-accent-foreground font-semibold text-base">进入书库</Text>
        </Pressable>
      </View>
    </View>
  );
}