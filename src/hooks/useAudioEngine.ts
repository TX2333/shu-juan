// 集中式音频引擎 Hook — 多角色 · 有感情 · 有节奏
// BGM/SFX 通过语义标签动态解析，彻底消除硬编码

import { useCallback, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { supabase } from '@/client/supabase';
import { KEYWORD_SFX_RULES } from '@/lib/audioAssets';
import { resolveAudioUrl, clearAudioResolverCache } from '@/lib/audioResolver';
import type { AppSettings } from '@/lib/settings';

// ── 类型定义 ─────────────────────────────────────────────────

export interface CharacterVoice {
  voice_id: string;
  gender?: string;
  desc?: string;
}

export interface CharacterCast {
  narrator: CharacterVoice;
  characters: Record<string, CharacterVoice>;
}

export interface SentencePlan {
  idx: number;
  speaker: string;
  voice_id: string;
  emotion: string;
  speed: number;
  pause_ms: number;
  bgm_action: 'keep' | 'start' | 'change' | 'fade_out';
  bgm_tags: string[];   // 语义标签数组，运行时动态解析URL
  sfx_tags: string[];   // 语义标签数组，运行时动态解析URL
  note: string;
}

export interface MixerState {
  bgmVolume: number;
  sfxVolume: number;
  ttsVolume: number;
}

export const DEFAULT_MIXER: MixerState = {
  bgmVolume: 0.15,
  sfxVolume: 0.6,
  ttsVolume: 1.0,
};

const DEFAULT_CAST: CharacterCast = {
  narrator: { voice_id: 'audiobook_male_1', desc: '旁白' },
  characters: {},
};

// 脚本缓存
const PLAN_CACHE = new Map<string, SentencePlan[]>();
// 选角缓存
const CAST_CACHE = new Map<string, CharacterCast>();
// TTS预生成缓存：key = sentenceIdx → audioUrl promise
const TTS_PREFETCH_CACHE = new Map<number, Promise<string>>();

// ── 动态停顿计算 ─────────────────────────────────────────────
function calcPause(prevText: string, plan: SentencePlan): number {
  const directed = plan.pause_ms ?? 200;
  const last = prevText.trimEnd().at(-1) ?? '';
  let punctuationPause = 150;
  if ('。！？'.includes(last)) punctuationPause = 350;
  else if ('；'.includes(last)) punctuationPause = 250;
  else if (last === '…') punctuationPause = 500;
  return Math.max(directed, punctuationPause);
}

// ── 关键词兜底SFX检测（当director不给sfx_tags时） ────────────
function detectFallbackSfxTags(text: string): string[] | null {
  for (const rule of KEYWORD_SFX_RULES) {
    if (rule.pattern.test(text)) return [rule.sfx];
  }
  return null;
}

export function useAudioEngine(settings: AppSettings) {
  const ttsPlayer = useAudioPlayer();
  const ttsStatus = useAudioPlayerStatus(ttsPlayer);
  const bgmPlayer = useAudioPlayer();
  const bgmStatus = useAudioPlayerStatus(bgmPlayer);
  const sfxPlayer = useAudioPlayer();

  const [mixer, setMixer] = useState<MixerState>(DEFAULT_MIXER);
  const [currentPlan, setCurrentPlan] = useState<SentencePlan | null>(null);
  const [currentCast, setCurrentCast] = useState<CharacterCast>(DEFAULT_CAST);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [isCasting, setIsCasting] = useState(false);

  const scriptRef = useRef<Map<number, SentencePlan>>(new Map());
  const currentBgmTags = useRef<string[]>([]);
  const prevContextRef = useRef<string>('');
  const castRef = useRef<CharacterCast>(DEFAULT_CAST);
  const sentencesRef = useRef<string[]>([]);

  // ── BGM 自动循环 ─────────────────────────────────────────
  const handleBgmLoop = useCallback(() => {
    if (bgmStatus.didJustFinish && currentBgmTags.current.length > 0) {
      // 重新解析同样标签（resolver有缓存，立即返回）
      resolveAudioUrl('bgm', currentBgmTags.current).then((url) => {
        if (!url) return;
        bgmPlayer.replace({ uri: url });
        bgmPlayer.volume = mixer.bgmVolume;
        bgmPlayer.play();
      });
    }
  }, [bgmStatus.didJustFinish, bgmPlayer, mixer.bgmVolume]);

  // ── 执行 BGM 动作（通过resolver动态获取URL） ─────────────
  const executeBgmAction = useCallback(async (plan: SentencePlan, vol: number) => {
    const { bgm_action, bgm_tags } = plan;
    if (bgm_action === 'keep') return;
    if (bgm_action === 'fade_out') {
      bgmPlayer.volume = 0;
      bgmPlayer.pause();
      currentBgmTags.current = [];
      return;
    }
    if ((bgm_action === 'start' || bgm_action === 'change') && bgm_tags.length > 0) {
      // 标签相同时跳过（避免同场景反复重载）
      const isSame = currentBgmTags.current.length > 0 &&
        bgm_tags.every((t) => currentBgmTags.current.includes(t));
      if (isSame) return;

      const url = await resolveAudioUrl('bgm', bgm_tags);
      if (!url) return;
      currentBgmTags.current = bgm_tags;

      bgmPlayer.volume = 0;
      bgmPlayer.pause();
      setTimeout(() => {
        bgmPlayer.replace({ uri: url });
        bgmPlayer.volume = vol;
        bgmPlayer.play();
      }, bgm_action === 'change' ? 400 : 100);
    }
  }, [bgmPlayer]);

  // ── 播放 SFX（通过resolver动态获取URL） ──────────────────
  const playSfx = useCallback(async (sfxTags: string[], delay = 0) => {
    if (!sfxTags || sfxTags.length === 0) return;
    const url = await resolveAudioUrl('sfx', sfxTags);
    if (!url) return;
    setTimeout(() => {
      sfxPlayer.replace({ uri: url });
      sfxPlayer.volume = mixer.sfxVolume;
      sfxPlayer.play();
    }, delay);
  }, [sfxPlayer, mixer.sfxVolume]);

  // ── Phase 1: 选角 ────────────────────────────────────────
  const performCasting = useCallback(async (
    sentences: string[],
    cacheKey: string,
  ): Promise<CharacterCast> => {
    if (CAST_CACHE.has(cacheKey)) {
      const cached = CAST_CACHE.get(cacheKey)!;
      castRef.current = cached;
      setCurrentCast(cached);
      return cached;
    }
    setIsCasting(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-director', {
        body: { mode: 'cast', sentences: sentences.slice(0, 40) },
      });
      const cast: CharacterCast = (!error && data?.narrator)
        ? { narrator: data.narrator, characters: data.characters ?? {} }
        : DEFAULT_CAST;
      CAST_CACHE.set(cacheKey, cast);
      castRef.current = cast;
      setCurrentCast(cast);
      return cast;
    } catch {
      castRef.current = DEFAULT_CAST;
      setCurrentCast(DEFAULT_CAST);
      return DEFAULT_CAST;
    } finally {
      setIsCasting(false);
    }
  }, []);

  // ── Phase 2: 批量脚本 ────────────────────────────────────
  const fetchBatchScript = useCallback(async (
    sentences: string[],
    startIdx: number,
    cast: CharacterCast,
    chapterCacheKey: string,
  ): Promise<SentencePlan[]> => {
    const batchKey = `${chapterCacheKey}-${startIdx}`;
    if (PLAN_CACHE.has(batchKey)) return PLAN_CACHE.get(batchKey)!;

    const fallback: SentencePlan[] = sentences.map((_, i) => ({
      idx: startIdx + i,
      speaker: 'narrator',
      voice_id: cast.narrator.voice_id,
      emotion: 'fluent',
      speed: 1.0,
      pause_ms: 200,
      bgm_action: (startIdx === 0 && i === 0) ? 'start' : 'keep',
      bgm_tags: (startIdx === 0 && i === 0) ? ['calm', 'reading', 'ambient'] : [],
      sfx_tags: [],
      note: '默认',
    }));

    try {
      const { data, error } = await supabase.functions.invoke('ai-director', {
        body: { mode: 'script', sentences, cast, prev_context: prevContextRef.current },
      });
      if (error || !data?.plans) return fallback;
      const plans: SentencePlan[] = (data.plans as SentencePlan[]).map((p, i) => ({
        ...p,
        idx: startIdx + i,
      }));
      PLAN_CACHE.set(batchKey, plans);
      prevContextRef.current = plans.map((p) => p.note).filter(Boolean).join('，');
      return plans;
    } catch {
      return fallback;
    }
  }, []);

  // ── 预加载全章脚本 ────────────────────────────────────────
  const preloadScript = useCallback(async (
    sentences: string[],
    bookId: number,
    chapterIdx: number,
  ) => {
    scriptRef.current = new Map();
    prevContextRef.current = '';
    TTS_PREFETCH_CACHE.clear();
    sentencesRef.current = sentences;
    const chapterKey = `${bookId}-${chapterIdx}`;
    const cast = await performCasting(sentences, chapterKey);
    const BATCH = 8;
    for (let i = 0; i < sentences.length; i += BATCH) {
      const batch = sentences.slice(i, i + BATCH);
      const plans = await fetchBatchScript(batch, i, cast, chapterKey);
      plans.forEach((p) => scriptRef.current.set(p.idx, p));
    }
  }, [performCasting, fetchBatchScript]);

  // ── 获取某句计划 ─────────────────────────────────────────
  const getPlan = useCallback((idx: number): SentencePlan => {
    if (scriptRef.current.has(idx)) return scriptRef.current.get(idx)!;
    return {
      idx,
      speaker: 'narrator',
      voice_id: castRef.current.narrator.voice_id,
      emotion: 'fluent',
      speed: 1.0,
      pause_ms: 200,
      bgm_action: 'keep',
      bgm_tags: [],
      sfx_tags: [],
      note: '',
    };
  }, []);

  // ── TTS 网络请求（纯获取URL） ────────────────────────────
  const fetchTtsUrl = useCallback(async (
    text: string,
    voiceId: string,
    emotion: string,
    speed: number,
  ): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('tts-minimax', {
      body: { text, voice_id: voiceId, model: 'speech-02-turbo', speed, emotion, audio_format: 'mp3' },
    });
    if (error) {
      const errText = await error.context?.text?.();
      throw new Error(errText || error.message);
    }
    if (!data?.audioUrl) throw new Error('未返回音频');
    return data.audioUrl as string;
  }, []);

  // ── 预生成后续句TTS ──────────────────────────────────────
  const prefetchAhead = useCallback((currentIdx: number, lookahead = 2) => {
    const sents = sentencesRef.current;
    for (let i = currentIdx + 1; i <= currentIdx + lookahead; i++) {
      if (i >= sents.length || TTS_PREFETCH_CACHE.has(i)) continue;
      const plan = getPlan(i);
      const text = sents[i];
      if (!text) continue;
      TTS_PREFETCH_CACHE.set(
        i,
        fetchTtsUrl(text, plan.voice_id, plan.emotion, plan.speed ?? settings.speechRate),
      );
    }
  }, [getPlan, fetchTtsUrl, settings.speechRate]);

  // ── 按脚本播放一句 ────────────────────────────────────────
  const playSentenceByScript = useCallback(async (
    sentenceIdx: number,
    sentences: string[],
  ) => {
    if (sentenceIdx >= sentences.length) return;
    const text = sentences[sentenceIdx];
    if (!text) return;

    const plan = getPlan(sentenceIdx);
    setCurrentPlan(plan);

    if (settings.immersiveMode) {
      // BGM 动作异步执行，不阻塞 TTS
      executeBgmAction(plan, mixer.bgmVolume);

      // SFX：优先用 director 的 sfx_tags，降级用关键词检测
      const sfxTags = plan.sfx_tags.length > 0
        ? plan.sfx_tags
        : detectFallbackSfxTags(text) ?? [];
      if (sfxTags.length > 0) playSfx(sfxTags, 600);
    }

    // 停顿
    const pause = calcPause(sentences[sentenceIdx - 1] ?? '', plan);
    if (pause > 50 && sentenceIdx > 0) {
      await new Promise<void>((r) => setTimeout(r, pause));
    }

    setIsGeneratingTTS(true);
    try {
      let audioUrl: string;
      const prefetched = TTS_PREFETCH_CACHE.get(sentenceIdx);
      if (prefetched) {
        audioUrl = await prefetched;
        TTS_PREFETCH_CACHE.delete(sentenceIdx);
      } else {
        audioUrl = await fetchTtsUrl(
          text, plan.voice_id, plan.emotion, plan.speed ?? settings.speechRate,
        );
      }
      ttsPlayer.replace({ uri: audioUrl });
      ttsPlayer.volume = mixer.ttsVolume;
      ttsPlayer.play();
      prefetchAhead(sentenceIdx);
    } finally {
      setIsGeneratingTTS(false);
    }
  }, [settings, getPlan, executeBgmAction, playSfx, fetchTtsUrl, prefetchAhead,
    ttsPlayer, mixer.bgmVolume, mixer.ttsVolume]);

  // ── 直接合成并播放（试听） ───────────────────────────────
  const generateAndPlayTTS = useCallback(async (
    text: string,
    voiceId: string,
    emotion: string,
    speed: number,
  ) => {
    setIsGeneratingTTS(true);
    try {
      const audioUrl = await fetchTtsUrl(text, voiceId, emotion, speed);
      ttsPlayer.replace({ uri: audioUrl });
      ttsPlayer.volume = mixer.ttsVolume;
      ttsPlayer.play();
    } finally {
      setIsGeneratingTTS(false);
    }
  }, [fetchTtsUrl, ttsPlayer, mixer.ttsVolume]);

  // ── 混音器控制 ────────────────────────────────────────────
  const updateMixer = useCallback((partial: Partial<MixerState>) => {
    setMixer((prev) => {
      const next = { ...prev, ...partial };
      if (partial.bgmVolume !== undefined) bgmPlayer.volume = partial.bgmVolume;
      if (partial.ttsVolume !== undefined) ttsPlayer.volume = partial.ttsVolume;
      return next;
    });
  }, [bgmPlayer, ttsPlayer]);

  const pauseAll = useCallback(() => {
    ttsPlayer.pause();
    bgmPlayer.pause();
  }, [ttsPlayer, bgmPlayer]);

  const resumeBgm = useCallback(() => {
    if (currentBgmTags.current.length > 0) {
      resolveAudioUrl('bgm', currentBgmTags.current).then((url) => {
        if (!url) return;
        bgmPlayer.volume = mixer.bgmVolume;
        bgmPlayer.play();
      });
    }
  }, [bgmPlayer, mixer.bgmVolume]);

  const clearScript = useCallback(() => {
    scriptRef.current = new Map();
    prevContextRef.current = '';
    currentBgmTags.current = [];
    TTS_PREFETCH_CACHE.clear();
    sentencesRef.current = [];
    setCurrentPlan(null);
    clearAudioResolverCache();
  }, []);

  return {
    ttsPlayer,
    ttsStatus,
    bgmPlayer,
    bgmStatus,
    sfxPlayer,
    mixer,
    currentPlan,
    currentCast,
    isGeneratingTTS,
    isCasting,
    preloadScript,
    playSentenceByScript,
    generateAndPlayTTS,
    updateMixer,
    pauseAll,
    resumeBgm,
    handleBgmLoop,
    clearScript,
    playSfx,
  };
}

