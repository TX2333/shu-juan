import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { BookOpen, ChevronRight } from 'lucide-react-native';
import type { Book } from '@/lib/database';
import { BookCover } from './BookCover';

interface BookCardProps {
  book: Book;
  progress?: { chapter_index: number; sentence_index: number };
  onPress: () => void;
}

export function BookCard({ book, progress, onPress }: BookCardProps) {
  const dateStr = new Date(book.imported_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-4 bg-card p-4 border border-border active:opacity-70"
      style={{ borderRadius: 2 }}
    >
      <BookCover title={book.title} color={book.cover_color} size="md" />
      <View className="flex-1" style={{ minWidth: 0 }}>
        <Text className="text-base font-semibold text-foreground" numberOfLines={2}>
          {book.title}
        </Text>
        {book.author ? (
          <Text className="text-xs text-muted-foreground mt-1" numberOfLines={1}>
            {book.author}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-3 mt-2">
          <View className="flex-row items-center gap-1">
            <BookOpen size={12} color="hsl(24 8% 45%)" />
            <Text className="text-xs text-muted-foreground">{book.total_chapters} 章</Text>
          </View>
          <Text className="text-xs text-muted-foreground">{dateStr}</Text>
        </View>
        {progress ? (
          <Text className="text-xs text-accent mt-1">
            已读至第 {progress.chapter_index + 1} 章
          </Text>
        ) : null}
      </View>
      <ChevronRight size={18} color="hsl(24 8% 45%)" />
    </Pressable>
  );
}