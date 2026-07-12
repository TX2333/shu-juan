import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, BookOpen, Play, Trash2 } from 'lucide-react-native';
import { BookCover } from '@/components/BookCover';
import { getBookById, getChaptersByBookId, getProgress, deleteBook } from '@/lib/database';
import type { Book, Chapter, ReadingProgress } from '@/lib/database';

export default function BookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookId = Number(id);

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const b = await getBookById(bookId);
      setBook(b);
      const chs = await getChaptersByBookId(bookId);
      setChapters(chs);
      const p = await getProgress(bookId);
      setProgress(p);
    } catch (e) {
      console.error('加载失败:', e);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDelete = async () => {
    if (!book) return;
    await deleteBook(book.id);
    router.back();
  };

  const handleRead = (chapterIndex: number) => {
    router.push(`/reader/${bookId}?chapter=${chapterIndex}`);
  };

  const handleContinue = () => {
    const chIdx = progress?.chapter_index ?? 0;
    handleRead(chIdx);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#BC4431" />
      </View>
    );
  }

  if (!book) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-muted-foreground">书籍不存在</Text>
      </View>
    );
  }

  const readChapterIdx = progress?.chapter_index ?? -1;

  return (
    <View className="flex-1 bg-background">
      {/* 顶部导航 */}
      <View className="px-5 pt-14 pb-2 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} className="active:opacity-70 p-1">
          <ChevronLeft size={24} color="hsl(24 16% 20%)" />
        </Pressable>
        <Pressable onPress={handleDelete} className="active:opacity-70 p-1">
          <Trash2 size={20} color="hsl(0 84% 60%)" strokeWidth={1.5} />
        </Pressable>
      </View>

      <FlatList
        data={chapters}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={
          <View className="px-5 pb-4">
            {/* 书籍信息 */}
            <View className="flex-row gap-5 mb-5">
              <BookCover title={book.title} color={book.cover_color} size="lg" />
              <View className="flex-1 justify-center" style={{ minWidth: 0 }}>
                <Text className="text-xl font-bold text-foreground" numberOfLines={3}>
                  {book.title}
                </Text>
                {book.author ? (
                  <Text className="text-sm text-muted-foreground mt-1">{book.author}</Text>
                ) : null}
                <View className="flex-row items-center gap-3 mt-3">
                  <View className="flex-row items-center gap-1">
                    <BookOpen size={13} color="hsl(24 8% 45%)" />
                    <Text className="text-xs text-muted-foreground">{book.total_chapters} 章</Text>
                  </View>
                  <Text className="text-xs text-muted-foreground">
                    约 {book.total_chars > 10000 ? `${(book.total_chars / 10000).toFixed(1)}万` : book.total_chars} 字
                  </Text>
                </View>
                {progress ? (
                  <Text className="text-xs text-accent mt-2">
                    已读至第 {progress.chapter_index + 1} 章
                  </Text>
                ) : null}
              </View>
            </View>

            {/* 继续阅读按钮 */}
            <Pressable
              onPress={handleContinue}
              className="bg-accent py-3 flex-row items-center justify-center gap-2 active:opacity-70"
              style={{ borderRadius: 2 }}
            >
              <Play size={16} color="#F7F4ED" strokeWidth={2} fill="#F7F4ED" />
              <Text className="text-accent-foreground font-semibold">
                {progress ? '继续阅读' : '开始阅读'}
              </Text>
            </Pressable>

            {/* 章节标题 */}
            <View className="flex-row items-center justify-between mt-6 mb-3">
              <Text className="text-base font-semibold text-foreground">目录</Text>
              <Text className="text-xs text-muted-foreground">共 {chapters.length} 章</Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const isRead = index <= readChapterIdx;
          const isCurrent = index === readChapterIdx;
          return (
            <Pressable
              onPress={() => handleRead(index)}
              className="mx-5 mb-2 px-4 py-3 bg-card border border-border flex-row items-center justify-between active:opacity-70"
              style={{ borderRadius: 2 }}
            >
              <View className="flex-1" style={{ minWidth: 0 }}>
                <Text
                  className={`text-sm ${isCurrent ? 'text-accent font-semibold' : isRead ? 'text-muted-foreground' : 'text-foreground'}`}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  约 {item.char_count > 1000 ? `${(item.char_count / 1000).toFixed(1)}k` : item.char_count} 字
                </Text>
              </View>
              {isCurrent ? (
                <Text className="text-xs text-accent ml-2">阅读中</Text>
              ) : isRead ? (
                <Text className="text-xs text-muted-foreground ml-2">已读</Text>
              ) : null}
            </Pressable>
          );
        }}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}