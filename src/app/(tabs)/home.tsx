import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, BookOpen, FileText } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { BookCard } from '@/components/BookCard';
import { getAllBooks, insertBook, insertChapters, updateBookChapters, getProgress, deleteBook } from '@/lib/database';
import type { Book, ReadingProgress } from '@/lib/database';
import { parseChapters, extractTitle, extractPdfText, pickCoverColor } from '@/lib/textParser';

export default function HomeScreen() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, ReadingProgress>>({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const allBooks = await getAllBooks();
      setBooks(allBooks);
      const pMap: Record<number, ReadingProgress> = {};
      for (const book of allBooks) {
        const p = await getProgress(book.id);
        if (p) pMap[book.id] = p;
      }
      setProgressMap(pMap);
    } catch (e) {
      console.error('加载数据失败:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleImport = async () => {
    try {
      setImporting(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/pdf', 'text/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const fileName = asset.name;
      const fileUri = asset.uri;
      const ext = fileName.split('.').pop()?.toLowerCase() || '';

      let text = '';
      if (ext === 'txt' || asset.mimeType?.startsWith('text/')) {
        text = await FileSystem.readAsStringAsync(fileUri, {
          encoding: 'utf8',
        });
      } else if (ext === 'pdf') {
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: 'base64',
        });
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        text = extractPdfText(bytes.buffer);
        if (!text || text.length < 50) {
          alert('该PDF文档无法提取文本，建议使用TXT格式导入');
          return;
        }
      } else {
        alert('仅支持TXT和PDF格式');
        return;
      }

      if (!text.trim()) {
        alert('文档内容为空');
        return;
      }

      const title = extractTitle(fileName);
      const chapters = parseChapters(text);
      const totalChars = text.length;
      const coverColor = pickCoverColor(title);

      const bookId = await insertBook({
        title,
        author: '',
        description: `共 ${chapters.length} 章，约 ${totalChars} 字`,
        file_path: fileUri,
        file_format: ext,
        total_chapters: chapters.length,
        total_chars: totalChars,
        cover_color: coverColor,
        imported_at: new Date().toISOString(),
      });

      await insertChapters(
        chapters.map(ch => ({
          book_id: bookId,
          title: ch.title,
          content: ch.content,
          chapter_index: ch.index,
          char_count: ch.content.length,
        }))
      );

      await updateBookChapters(bookId, chapters.length, totalChars);
      await loadData();
    } catch (e) {
      console.error('导入失败:', e);
      alert('导入失败，请重试');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteBook(id);
    await loadData();
  };

  const renderItem = ({ item }: { item: Book }) => (
    <BookCard
      book={item}
      progress={progressMap[item.id]}
      onPress={() => router.push(`/book/${item.id}`)}
    />
  );

  return (
    <View className="flex-1 bg-background">
      {/* 顶部标题栏 */}
      <View className="px-5 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-foreground">书库</Text>
            <Text className="text-xs text-muted-foreground mt-1">
              {books.length > 0 ? `共 ${books.length} 本书` : '导入文档开始阅读'}
            </Text>
          </View>
          <Pressable
            onPress={handleImport}
            disabled={importing}
            className="bg-accent px-4 py-2 flex-row items-center gap-1.5 active:opacity-70"
            style={{ borderRadius: 2 }}
          >
            {importing ? (
              <ActivityIndicator size="small" color="#F7F4ED" />
            ) : (
              <Plus size={16} color="#F7F4ED" strokeWidth={2} />
            )}
            <Text className="text-accent-foreground text-sm font-medium">
              {importing ? '导入中' : '导入'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 书籍列表 */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#BC4431" />
        </View>
      ) : books.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="items-center gap-4">
            <View
              className="w-20 h-20 items-center justify-center"
              style={{ backgroundColor: 'hsl(36 18% 90%)', borderRadius: 4 }}
            >
              <BookOpen size={36} color="hsl(24 8% 45%)" strokeWidth={1} />
            </View>
            <Text className="text-base text-muted-foreground text-center">
              书库空空如也
            </Text>
            <Text className="text-xs text-muted-foreground text-center leading-5">
              点击右上角"导入"按钮，选择本地TXT或PDF文档
            </Text>
            <Pressable
              onPress={handleImport}
              disabled={importing}
              className="bg-accent px-6 py-2.5 flex-row items-center gap-1.5 active:opacity-70"
              style={{ borderRadius: 2 }}
            >
              <FileText size={16} color="#F7F4ED" strokeWidth={1.5} />
              <Text className="text-accent-foreground text-sm font-medium">导入文档</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              tintColor="#BC4431"
            />
          }
        />
      )}
    </View>
  );
}