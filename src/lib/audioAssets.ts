// 音频资产管理：BGM / SFX 的 URL 映射 + 关键词触发表
// 来源：Pixabay 免版权音频 CDN（无需登录可直链）

// ── BGM 映射（15种场景）──────────────────────────────────
export const BGM_MAP: Record<string, string> = {
  none: '',
  // 古典/古风
  classical:   'https://cdn.pixabay.com/download/audio/2022/10/25/audio_946b78db42.mp3',
  // 自然白噪
  nature:      'https://cdn.pixabay.com/download/audio/2022/03/15/audio_1aacfd9fde.mp3',
  // 舒缓轻音乐
  calm:        'https://cdn.pixabay.com/download/audio/2023/03/09/audio_1bc1b2d7be.mp3',
  // 紧张悬疑
  tense:       'https://cdn.pixabay.com/download/audio/2022/10/14/audio_3dfbbef7db.mp3',
  // 悲伤抒情
  sad:         'https://cdn.pixabay.com/download/audio/2022/01/20/audio_d8fbcbc1cb.mp3',
  // 欢快活泼
  cheerful:    'https://cdn.pixabay.com/download/audio/2022/10/30/audio_0fd3d24c0c.mp3',
  // 史诗宏大
  epic:        'https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3',
  // 神秘幽深
  mysterious:  'https://cdn.pixabay.com/download/audio/2022/12/19/audio_f10cb4aecb.mp3',
  // 浪漫温情
  romantic:    'https://cdn.pixabay.com/download/audio/2023/01/04/audio_bb8c52cccb.mp3',
  // 战斗激烈
  battle:      'https://cdn.pixabay.com/download/audio/2022/11/15/audio_b26c28a0ae.mp3',
  // 山水禅意
  zen:         'https://cdn.pixabay.com/download/audio/2021/10/25/audio_d7e0b8ce28.mp3',
  // 夜晚静谧
  night:       'https://cdn.pixabay.com/download/audio/2022/08/31/audio_ec5213de42.mp3',
  // 旅途行进
  journey:     'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
  // 梦境飘渺
  dream:       'https://cdn.pixabay.com/download/audio/2021/11/25/audio_91b32a754d.mp3',
  // 悬念惊悚
  suspense:    'https://cdn.pixabay.com/download/audio/2022/09/30/audio_4e1a4c2e3d.mp3',
};

// BGM 中文标签（用于 UI 显示）
export const BGM_LABELS: Record<string, string> = {
  none: '无音乐', classical: '古典古风', nature: '自然白噪',
  calm: '舒缓轻音', tense: '紧张悬疑', sad: '悲伤抒情',
  cheerful: '欢快活泼', epic: '史诗宏大', mysterious: '神秘幽深',
  romantic: '浪漫温情', battle: '战斗激烈', zen: '禅意山水',
  night: '夜晚静谧', journey: '旅途行进', dream: '梦境飘渺',
  suspense: '悬念惊悚',
};

// ── SFX 映射（20种音效）──────────────────────────────────
export const SFX_MAP: Record<string, string> = {
  none: '',
  wind:      'https://cdn.pixabay.com/download/audio/2022/03/10/audio_1af6a2cfc4.mp3',
  rain:      'https://cdn.pixabay.com/download/audio/2022/01/18/audio_13d9e9caed.mp3',
  thunder:   'https://cdn.pixabay.com/download/audio/2021/08/04/audio_a0f05e7040.mp3',
  bird:      'https://cdn.pixabay.com/download/audio/2021/09/06/audio_7ffe1b0d84.mp3',
  bell:      'https://cdn.pixabay.com/download/audio/2021/08/09/audio_88447e769e.mp3',
  sword:     'https://cdn.pixabay.com/download/audio/2022/03/23/audio_3e8f3c5481.mp3',
  horse:     'https://cdn.pixabay.com/download/audio/2022/09/13/audio_a7e7d9f4b7.mp3',
  crowd:     'https://cdn.pixabay.com/download/audio/2021/11/01/audio_8bf10eadfd.mp3',
  water:     'https://cdn.pixabay.com/download/audio/2022/08/02/audio_2dde668d05.mp3',
  fire:      'https://cdn.pixabay.com/download/audio/2022/11/21/audio_d1718ab1a0.mp3',
  arrow:     'https://cdn.pixabay.com/download/audio/2022/07/12/audio_4b4f1697c0.mp3',
  door:      'https://cdn.pixabay.com/download/audio/2021/09/29/audio_2dde668d05.mp3',
  footstep:  'https://cdn.pixabay.com/download/audio/2021/10/19/audio_2fba5c5d23.mp3',
  laugh:     'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8d83f2928.mp3',
  cry:       'https://cdn.pixabay.com/download/audio/2021/11/25/audio_3e5d0f1e10.mp3',
  drum:      'https://cdn.pixabay.com/download/audio/2022/12/01/audio_b3c4ae2d7f.mp3',
  magic:     'https://cdn.pixabay.com/download/audio/2022/10/31/audio_c6f3d9a2b1.mp3',
  explosion: 'https://cdn.pixabay.com/download/audio/2022/09/07/audio_e4f3b2a1c8.mp3',
  birds:     'https://cdn.pixabay.com/download/audio/2021/10/07/audio_71f8c89d3e.mp3',
  page_turn: 'https://cdn.pixabay.com/download/audio/2022/07/22/audio_9a3b8c2d1e.mp3',
};

// SFX 中文标签
export const SFX_LABELS: Record<string, string> = {
  none: '无音效', wind: '风声', rain: '雨声', thunder: '雷声',
  bird: '鸟鸣', bell: '钟声', sword: '剑鸣', horse: '马蹄',
  crowd: '人群', water: '流水', fire: '火焰', arrow: '箭矢',
  door: '开门', footstep: '脚步', laugh: '笑声', cry: '哭声',
  drum: '战鼓', magic: '魔法', explosion: '爆炸', birds: '群鸟',
  page_turn: '翻书',
};

// ── 关键词 → SFX 自动触发表 ────────────────────────────────
// key: 触发关键词（正则模式），value: sfx_type
export const KEYWORD_SFX_RULES: Array<{ pattern: RegExp; sfx: string }> = [
  { pattern: /[刀剑拔剑挥剑斩杀砍击]/,      sfx: 'sword' },
  { pattern: /[马骑跨马骑马疾驰]/,           sfx: 'horse' },
  { pattern: /[雨雨水暴雨细雨淋雨]/,         sfx: 'rain' },
  { pattern: /[风狂风大风微风清风]/,          sfx: 'wind' },
  { pattern: /[雷雷声霹雳轰鸣]/,            sfx: 'thunder' },
  { pattern: /[钟钟声钟鸣寺庙敲钟]/,        sfx: 'bell' },
  { pattern: /[鸟鸟鸣啼鸟黄莺燕子]/,        sfx: 'bird' },
  { pattern: /[人群喧嚣热闹围观众人]/,       sfx: 'crowd' },
  { pattern: /[流水溪水河水泉水潺潺]/,       sfx: 'water' },
  { pattern: /[火烈火火焰燃烧烈焰]/,         sfx: 'fire' },
  { pattern: /[箭弓箭射箭箭矢利箭]/,        sfx: 'arrow' },
  { pattern: /[门推门开门关门踢门]/,         sfx: 'door' },
  { pattern: /[脚步踏步走步奔跑]/,          sfx: 'footstep' },
  { pattern: /[大笑哈哈笑声欢笑]/,          sfx: 'laugh' },
  { pattern: /[哭泣流泪啜泣痛哭悲泣]/,      sfx: 'cry' },
  { pattern: /[战鼓鼓声擂鼓鼓点]/,         sfx: 'drum' },
  { pattern: /[法术魔法施法咒语仙术]/,      sfx: 'magic' },
  { pattern: /[爆炸轰然巨响炮声]/,          sfx: 'explosion' },
];

/**
 * 从文本中检测应触发的第一个关键词音效
 */
export function detectKeywordSfx(text: string): string | null {
  for (const rule of KEYWORD_SFX_RULES) {
    if (rule.pattern.test(text)) return rule.sfx;
  }
  return null;
}

// ── MiniMax 音色列表（用于设置页试听）────────────────────────
export interface VoiceOption {
  id: string;
  label: string;
  desc: string;
  gender: 'male' | 'female';
  style: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'audiobook_male_1',    label: '说书人（男）',  desc: '醇厚旁白，适合小说',   gender: 'male',   style: 'narrative' },
  { id: 'audiobook_female_1',  label: '说书人（女）',  desc: '温婉旁白，适合散文',   gender: 'female', style: 'narrative' },
  { id: 'male-qn-qingse',      label: '清冷男声',      desc: '清冷沉稳，适合古风',   gender: 'male',   style: 'classical' },
  { id: 'male-qn-jingying',    label: '精英男声',      desc: '商务干练，适合现代',   gender: 'male',   style: 'modern' },
  { id: 'male-qn-badao',       label: '霸道男声',      desc: '强势有力，适合战斗',   gender: 'male',   style: 'action' },
  { id: 'male-qn-daxuesheng',  label: '青年男声',      desc: '青春活力，适合校园',   gender: 'male',   style: 'youth' },
  { id: 'female-shaonv',       label: '少女音',        desc: '灵动可爱，适合童话',   gender: 'female', style: 'youth' },
  { id: 'female-yujie',        label: '御姐音',        desc: '成熟知性，适合言情',   gender: 'female', style: 'mature' },
  { id: 'female-chengshu',     label: '成熟女声',      desc: '沉稳大方，适合文学',   gender: 'female', style: 'literature' },
  { id: 'female-tianmei',      label: '甜美女声',      desc: '温柔治愈，适合轻小说', gender: 'female', style: 'sweet' },
  { id: 'presenter_male',      label: '男主持',        desc: '清晰播报，适合新闻',   gender: 'male',   style: 'news' },
  { id: 'presenter_female',    label: '女主持',        desc: '标准普通话，适合解说', gender: 'female', style: 'news' },
];