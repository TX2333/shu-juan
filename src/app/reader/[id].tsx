import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronUp,
  ChevronDown,
  Sparkles,
  SlidersHorizontal,
  Music2,
  Mic2,
  Volume2,
} from 'lucide-react-native';
import { getBookById, getChapter, saveProgress, getProgress } from '@/lib/database';
import type { Book, Chapter } from '@/lib/database';
import { splitSentences } from '@/lib/textParser';
import { useSettings } from '@/contexts/SettingsContext';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { VOICE_OPTIONS } from '@/lib/audioAssets';

export default function ReaderScreen() {
  const router = useRouter();
  const { id, chapter } = useLocalSearchParams<{ id: string; chapter?: string }>();
  const bookId = Number(id);
  const initialChapter = Number(chapter ?? 0);
  const { settings } = useSettings();
  const { width } = useWindowDimensions();

  const [book, setBook] = useState<Book | null>(null);
  const [chapterData, setChapterData] = useState<Chapter | null>(null);
  const [chapterIndex, setChapterIndex] = useState(initialChapter);
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreloading, setIsPreloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showMixer, setShowMixer] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const sentenceRefs = useRef<View[]>([]);
  const isAdvancing = useRef(false);

  const audio = useAudioEngine(settings);

  // ── 加载章节并预加载导演脚本 ──────────────────────────────
  const loadChapter = useCallback(async (idx: number) => {
    setIsLoading(true);
    setErrorMsg('');
    audio.clearScript();
    try {
      const ch = await getChapter(bookId, idx);
      if (!ch) { setErrorMsg('章节不存在'); setIsLoading(false); return; }
      setChapterData(ch);
      setChapterIndex(idx);
      const sents = splitSentences(ch.content);
      setSentences(sents);
      setCurrentSentence(0);
      sentenceRefs.current = [];

      // 沉浸模式：后台预加载导演脚本（含选角）
      if (settings.immersiveMode) {
        setIsPreloading(true);
        audio.preloadScript(sents, bookId, idx).finally(() => setIsPreloading(false));
      }
    } catch (e) {
      console.error('加载章节失败:', e);
      setErrorMsg('加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [bookId, settings.immersiveMode, audio]);

  // ── 初始化 ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const b = await getBookById(bookId);
      setBook(b);
      const p = await getProgress(bookId);
      const startIdx = p ? p.chapter_index : initialChapter;
      await loadChapter(startIdx);
      if (p) setCurrentSentence(p.sentence_index);
    })();
  }, [bookId, initialChapter, loadChapter]);

  // ── BGM 自动循环 ───────────────────────────────────────────
  useEffect(() => { audio.handleBgmLoop(); }, [audio.bgmStatus.didJustFinish, audio.handleBgmLoop]);

  // ── 按导演脚本播放一句 ─────────────────────────────────────
  const playSentence = useCallback(async (sentenceIdx: number) => {
    if (sentenceIdx >= sentences.length) {
      if (book && chapterIndex < book.total_chapters - 1) {
        await saveProgress(bookId, chapterIndex + 1, 0);
        await loadChapter(chapterIndex + 1);
        return;
      }
      setIsPlaying(false);
      return;
    }
    setErrorMsg('');
    try {
      await audio.playSentenceByScript(sentenceIdx, sentences);
      setCurrentSentence(sentenceIdx);
      await saveProgress(bookId, chapterIndex, sentenceIdx);
    } catch (e) {
      console.error('播放失败:', e);
      setErrorMsg('朗读失败，请检查网络');
      setIsPlaying(false);
    }
  }, [sentences, book, chapterIndex, bookId, audio, loadChapter]);

  // ── 监听 TTS 播放结束 → 自动下一句 ────────────────────────
  useEffect(() => {
    if (audio.ttsStatus.didJustFinish && isPlaying && !isAdvancing.current) {
      isAdvancing.current = true;
      setTimeout(() => {
        playSentence(currentSentence + 1);
        isAdvancing.current = false;
      }, 300);
    }
  }, [audio.ttsStatus.didJustFinish, isPlaying, currentSentence, playSentence]);

  // ── 自动滚动 ───────────────────────────────────────────────
  useEffect(() => {
    const ref = sentenceRefs.current[currentSentence];
    if (ref && scrollViewRef.current) {
      ref.measureLayout(
        scrollViewRef.current.getInnerViewNode(),
        (_x, y) => scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true }),
        () => {},
      );
    }
  }, [currentSentence]);

  const handlePlayPause = () => {
    if (isPlaying) { audio.pauseAll(); setIsPlaying(false); }
    else { setIsPlaying(true); playSentence(currentSentence); }
  };
  const handlePrev = () => { if (currentSentence > 0) { audio.ttsPlayer.pause(); playSentence(currentSentence - 1); } };
  const handleNext = () => { if (currentSentence < sentences.length - 1) { audio.ttsPlayer.pause(); playSentence(currentSentence + 1); } };
  const handlePrevChapter = () => { if (chapterIndex > 0) { audio.pauseAll(); setIsPlaying(false); loadChapter(chapterIndex - 1); } };
  const handleNextChapter = () => { if (book && chapterIndex < book.total_chapters - 1) { audio.pauseAll(); setIsPlaying(false); loadChapter(chapterIndex + 1); } };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#BC4431" />
        <Text className="text-sm text-muted-foreground mt-3">加载中...</Text>
      </View>
    );
  }

  if (!chapterData) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text className="text-muted-foreground">{errorMsg || '章节不存在'}</Text>
        <Pressable onPress={() => router.back()} className="mt-4 bg-accent px-6 py-2 active:opacity-70" style={{ borderRadius: 2 }}>
          <Text className="text-accent-foreground">返回</Text>
        </Pressable>
      </View>
    );
  }

  const progress = sentences.length > 0 ? ((currentSentence + 1) / sentences.length) * 100 : 0;
  const plan = audio.currentPlan;
  const voiceLabel = VOICE_OPTIONS.find(v => v.id === plan?.voice_id)?.label ?? '默认音色';
  const bgmLabel = plan?.bgm_tags?.length ? plan.bgm_tags.slice(0, 2).join('·') : '无音乐';
  const sfxLabel = plan?.sfx_tags?.length ? plan.sfx_tags[0] : '';

  return (
    <View className="flex-1 bg-background">
      {/* 顶部栏 */}
      <View className="px-4 pt-14 pb-2 flex-row items-center justify-between">
        <Pressable onPress={() => { audio.pauseAll(); router.back(); }} className="active:opacity-70 p-1">
          <ChevronLeft size={24} color="hsl(24 16% 20%)" />
        </Pressable>
        <View className="flex-1 items-center px-3">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{chapterData.title}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Text className="text-xs text-muted-foreground">第 {chapterIndex + 1} / {book?.total_chapters ?? '?'} 章</Text>
            {isPreloading && (
            <Text className="text-xs text-accent">
              · {audio.isCasting ? 'AI选角中...' : 'AI导演准备中...'}
            </Text>
          )}
          </View>
        </View>
        <Pressable onPress={() => setShowMixer(!showMixer)} className="active:opacity-70 p-1">
          <SlidersHorizontal size={20} color={showMixer ? '#BC4431' : 'hsl(24 16% 20%)'} />
        </Pressable>
      </View>

      {/* 进度条 */}
      <View className="px-4 pb-2">
        <View className="h-1 bg-muted overflow-hidden" style={{ borderRadius: 1 }}>
          <View className="h-full bg-accent" style={{ width: `${progress}%` }} />
        </View>
      </View>

      {/* 混音面板 */}
      {showMixer && (
        <View className="mx-4 mb-2 bg-card border border-border px-4 py-3" style={{ borderRadius: 2 }}>
          <Text className="text-xs font-semibold text-foreground mb-3">混音器</Text>
          {[
            { icon: <Mic2 size={14} color="#BC4431" />, label: '人声', value: audio.mixer.ttsVolume, max: 1, onChange: (v: number) => audio.updateMixer({ ttsVolume: v }), display: `${Math.round(audio.mixer.ttsVolume * 100)}%` },
            { icon: <Music2 size={14} color="#BC4431" />, label: '背景乐', value: audio.mixer.bgmVolume, max: 0.5, onChange: (v: number) => audio.updateMixer({ bgmVolume: v }), display: `${Math.round(audio.mixer.bgmVolume * 200)}%` },
            { icon: <Volume2 size={14} color="#BC4431" />, label: '音效', value: audio.mixer.sfxVolume, max: 1, onChange: (v: number) => audio.updateMixer({ sfxVolume: v }), display: `${Math.round(audio.mixer.sfxVolume * 100)}%` },
          ].map(row => (
            <View key={row.label} className="flex-row items-center gap-2 mb-2">
              {row.icon}
              <Text className="text-xs text-muted-foreground w-12">{row.label}</Text>
              <View className="flex-1">
                <Slider minimumValue={0} maximumValue={row.max} step={0.01} value={row.value} onValueChange={row.onChange}
                  minimumTrackTintColor="#BC4431" maximumTrackTintColor="hsl(30 16% 82%)" thumbTintColor="#BC4431" />
              </View>
              <Text className="text-xs text-muted-foreground w-8 text-right">{row.display}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 正文 */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20, paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 导演脚本状态条 */}
        {plan && settings.immersiveMode && (
          <View className="bg-secondary px-3 py-2 mb-4 flex-row flex-wrap gap-2 items-center" style={{ borderRadius: 2 }}>
            <Sparkles size={13} color="#BC4431" strokeWidth={1.5} />
            {/* 说话人标签 */}
            <Text className="text-xs text-accent font-medium">
              {plan.speaker === 'narrator' ? '旁白' : plan.speaker}
            </Text>
            <Text className="text-xs text-muted-foreground">·</Text>
            <Text className="text-xs text-muted-foreground">{voiceLabel}</Text>
            <Text className="text-xs text-muted-foreground">·</Text>
            <Text className="text-xs text-muted-foreground">{bgmLabel}</Text>
            {plan.sfx_tags?.length > 0 && (
              <>
                <Text className="text-xs text-muted-foreground">·</Text>
                <Text className="text-xs text-muted-foreground">{sfxLabel}</Text>
              </>
            )}
            {plan.note ? (
              <>
                <Text className="text-xs text-muted-foreground">·</Text>
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>{plan.note}</Text>
              </>
            ) : null}
          </View>
        )}

        {sentences.map((sentence, idx) => (
          <View key={`${chapterIndex}-${idx}`} ref={el => { if (el) sentenceRefs.current[idx] = el; }}>
            <Text
              onPress={() => { audio.ttsPlayer.pause(); setCurrentSentence(idx); playSentence(idx); setIsPlaying(true); }}
              style={{
                fontSize: settings.fontSize,
                lineHeight: settings.fontSize * 1.9,
                color: idx === currentSentence && isPlaying ? '#BC4431' : 'hsl(24 16% 20%)',
                fontWeight: idx === currentSentence && isPlaying ? '600' : '400',
                marginBottom: settings.fontSize * 0.6,
                opacity: idx === currentSentence ? 1 : Math.max(0.45, 1 - Math.abs(idx - currentSentence) * 0.1),
              }}
            >
              {sentence}
            </Text>
          </View>
        ))}
      </ScrollView>

      {errorMsg ? (
        <View className="absolute left-4 right-4 bg-destructive px-4 py-2" style={{ top: 80, borderRadius: 2 }}>
          <Text className="text-destructive-foreground text-xs">{errorMsg}</Text>
        </View>
      ) : null}

      {/* 底部控制栏 */}
      <View className="absolute bottom-0 left-0 right-0 bg-card border-t border-border px-4 pt-3 pb-8">
        <View className="flex-row items-center justify-between mb-3">
          <Pressable onPress={handlePrevChapter} disabled={chapterIndex <= 0} className="flex-row items-center gap-1 active:opacity-70">
            <ChevronUp size={14} color={chapterIndex <= 0 ? 'hsl(30 16% 82%)' : 'hsl(24 8% 45%)'} />
            <Text className={`text-xs ${chapterIndex <= 0 ? 'text-border' : 'text-muted-foreground'}`}>上一章</Text>
          </Pressable>
          <Text className="text-xs text-muted-foreground">{currentSentence + 1} / {sentences.length} 句</Text>
          <Pressable onPress={handleNextChapter} disabled={!book || chapterIndex >= book.total_chapters - 1} className="flex-row items-center gap-1 active:opacity-70">
            <Text className={`text-xs ${!book || chapterIndex >= book.total_chapters - 1 ? 'text-border' : 'text-muted-foreground'}`}>下一章</Text>
            <ChevronDown size={14} color={!book || chapterIndex >= book.total_chapters - 1 ? 'hsl(30 16% 82%)' : 'hsl(24 8% 45%)'} />
          </Pressable>
        </View>
        <View className="flex-row items-center justify-center gap-8">
          <Pressable onPress={handlePrev} disabled={currentSentence <= 0} className="active:opacity-70 p-2">
            <SkipBack size={22} color={currentSentence <= 0 ? 'hsl(30 16% 82%)' : 'hsl(24 16% 20%)'} strokeWidth={1.5} />
          </Pressable>
          <Pressable
            onPress={handlePlayPause}
            disabled={audio.isGeneratingTTS}
            className="w-14 h-14 bg-accent items-center justify-center active:opacity-70"
            style={{ borderRadius: 28 }}
          >
            {audio.isGeneratingTTS ? (
              <ActivityIndicator size="small" color="#F7F4ED" />
            ) : isPlaying ? (
              <Pause size={26} color="#F7F4ED" strokeWidth={2} fill="#F7F4ED" />
            ) : (
              <Play size={26} color="#F7F4ED" strokeWidth={2} fill="#F7F4ED" style={{ marginLeft: 2 }} />
            )}
          </Pressable>
          <Pressable onPress={handleNext} disabled={currentSentence >= sentences.length - 1} className="active:opacity-70 p-2">
            <SkipForward size={22} color={currentSentence >= sentences.length - 1 ? 'hsl(30 16% 82%)' : 'hsl(24 16% 20%)'} strokeWidth={1.5} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
