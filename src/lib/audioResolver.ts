// 音频动态解析器
// 核心思路：导演输出"语义标签数组"而非硬编码key
// 运行时从 audio_assets 表查询最匹配的URL，LRU缓存避免重复查询

import { supabase } from '@/client/supabase';

// ── LRU 缓存（内存，会话级） ─────────────────────────────────
// key: `${type}:${sortedTags.join(',')}` → url
const MAX_CACHE = 200;
const resolverCache = new Map<string, string>();

function cacheGet(key: string): string | undefined {
  if (!resolverCache.has(key)) return undefined;
  // LRU：访问时移到末尾
  const val = resolverCache.get(key)!;
  resolverCache.delete(key);
  resolverCache.set(key, val);
  return val;
}

function cacheSet(key: string, url: string) {
  if (resolverCache.size >= MAX_CACHE) {
    // 淘汰最久未使用（Map 迭代顺序即插入顺序）
    resolverCache.delete(resolverCache.keys().next().value!);
  }
  resolverCache.set(key, url);
}

// ── 主解析函数 ────────────────────────────────────────────────
/**
 * 根据语义标签数组，从 audio_assets 表查找最匹配的音频 URL。
 * 优先级：标签重叠数最多 → 同 mood → 随机（保证多样性）
 *
 * @param type   'bgm' | 'sfx'
 * @param tags   导演输出的语义标签，如 ['battle','intense','combat']
 * @param mood   可选辅助情绪，提升召回准确度
 * @returns      URL 字符串，无匹配时返回 null
 */
export async function resolveAudioUrl(
  type: 'bgm' | 'sfx',
  tags: string[],
  mood?: string,
): Promise<string | null> {
  if (!tags || tags.length === 0) return null;

  const cacheKey = `${type}:${[...tags].sort().join(',')}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached || null;

  // 策略1：tags 数组重叠查询（overlaps 至少一个tag命中）
  // Supabase PostgREST 的 overlaps 语法：cs.{tag1,tag2,...}
  const { data, error } = await supabase
    .from('audio_assets')
    .select('url, tags')
    .eq('type', type)
    .eq('active', true)
    .overlaps('tags', tags)
    .limit(20); // 取最多20条备选，再在客户端计分排序

  if (error || !data || data.length === 0) {
    // 降级策略：只用 mood 查
    if (mood) {
      const { data: moodData } = await supabase
        .from('audio_assets')
        .select('url')
        .eq('type', type)
        .eq('active', true)
        .eq('mood', mood)
        .limit(5);
      const url = moodData?.[Math.floor(Math.random() * (moodData?.length || 1))]?.url ?? null;
      cacheSet(cacheKey, url ?? '');
      return url;
    }
    cacheSet(cacheKey, '');
    return null;
  }

  // 客户端计分：标签重叠数越多得分越高
  const tagSet = new Set(tags);
  const scored = data
    .map((row) => ({
      url: row.url,
      score: (row.tags as string[]).filter((t: string) => tagSet.has(t)).length,
    }))
    .sort((a, b) => b.score - a.score);

  // 在得分最高的候选里随机选（保证多样性，避免永远选同一首）
  const topScore = scored[0].score;
  const topCandidates = scored.filter((r) => r.score === topScore);
  const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];

  cacheSet(cacheKey, chosen.url);
  return chosen.url;
}

// ── 批量预解析（章节开始时预热缓存） ─────────────────────────
/**
 * 批量解析 BGM + SFX 标签列表，并发查询填充缓存
 * 避免播放时第一次查询延迟
 */
export async function prefetchAudioUrls(
  requests: Array<{ type: 'bgm' | 'sfx'; tags: string[]; mood?: string }>,
): Promise<void> {
  await Promise.allSettled(
    requests.map(({ type, tags, mood }) => resolveAudioUrl(type, tags, mood)),
  );
}

// ── 缓存清理（换书/退出阅读时调用） ─────────────────────────
export function clearAudioResolverCache() {
  resolverCache.clear();
}

// ── 获取全部 BGM/SFX 资产（设置页用） ───────────────────────
export async function fetchAllAudioAssets(type: 'bgm' | 'sfx') {
  const { data } = await supabase
    .from('audio_assets')
    .select('id, name, name_zh, url, tags, mood, genre')
    .eq('type', type)
    .eq('active', true)
    .order('mood');
  return data ?? [];
}
