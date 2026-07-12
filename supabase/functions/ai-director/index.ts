import { serve } from "https://deno.land/std/http/server.ts";

const GLM_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const GLM_API_KEY = Deno.env.get("GLM_API_KEY") ?? "9f9a917e3cbf480291bfe80b2d8ed744.8RW6t1WfbnNJz7Oo";

// ── 音色完整列表（供选角用）────────────────────────────────
const VOICE_LIST = `
narrator_male (audiobook_male_1)：男旁白，深沉醇厚，适合叙事
narrator_female (audiobook_female_1)：女旁白，温婉细腻，适合叙事
male_cool (male-qn-qingse)：清冷男声，适合古风/侠客/冷漠角色
male_elite (male-qn-jingying)：精英男声，适合现代/智谋角色
male_dominant (male-qn-badao)：霸道男声，适合强势/反派/武将
male_youth (male-qn-daxuesheng)：青年男声，适合少年/书生
female_girl (female-shaonv)：少女音，适合活泼/纯真角色
female_queen (female-yujie)：御姐音，适合成熟/强势女性
female_mature (female-chengshu)：成熟女声，适合长辈/知性角色
female_sweet (female-tianmei)：甜美女声，适合温柔/治愈角色
male_host (presenter_male)：男主持，适合解说/旁白
female_host (presenter_female)：女主持，适合解说/旁白
`.trim();

// ── 选角系统提示 ───────────────────────────────────────────
const CAST_SYSTEM_PROMPT = `你是专业有声书"选角导演"。根据提供的文本，识别所有出场的"说话人"并为其分配最合适的专属音色。

"说话人"包括：
1. 叙述者/旁白（narrator）——必须包含
2. 所有有台词的角色（通过对话标点识别：「」『』""等）

可用音色：
${VOICE_LIST}

规则：
1. 每个角色分配唯一音色，不同角色不得重复使用同一音色
2. 旁白固定使用 narrator_male 或 narrator_female，根据文本风格判断
3. 角色名提取原文实际称呼（如"李寒"，不要用"主角"等代称）
4. 最多识别8个角色，无名次要角色可归类为 minor_male/minor_female
5. 为每个角色写10字以内的性格描述

严格输出JSON，不含任何其他内容：
{
  "narrator": { "voice_id": "audiobook_male_1", "desc": "男性旁白" },
  "characters": {
    "角色名": { "voice_id": "音色ID", "gender": "male|female", "desc": "性格简述" }
  }
}`;

// ── 逐句脚本系统提示 ────────────────────────────────────────
const SCRIPT_SYSTEM_PROMPT = `你是专业有声书"总导演"。根据已确定的角色选角表，为每句话制定精准的音频执行脚本。

核心任务：
1. 判断每句话的"说话人"（旁白 narrator / 具体角色名）
2. 从选角表中取出对应的 voice_id
3. 判断情绪、语速、停顿时长、BGM语义标签、音效语义标签

【音色/情绪/节奏】
情绪（emotion）：calm, happy, sad, angry, fearful, disgusted, surprised, fluent, whisper
- 旁白叙述默认用 fluent；心理描写用 whisper；对话根据角色情绪判断
语速（speed）：0.7~1.4，叙述0.9~1.0，紧张1.1~1.3，哀伤0.7~0.85，默认1.0
停顿（pause_ms）：0~1500ms，普通200，换角色400~600，场景转换800~1200

【BGM 语义标签数组（bgm_tags）】★关键变化★
不再输出固定类型key，而是输出描述氛围的语义标签数组，解析器自动匹配最合适音乐。
规则：
- bgm_action: keep | start | change | fade_out
- bgm_action 为 start 或 change 时，必须提供 bgm_tags（2~4个标签）
- bgm_action 为 keep/fade_out 时，bgm_tags 输出空数组 []
- 标签从以下词汇中选择（可组合）：
  情绪类：calm, sad, happy, tense, romantic, mysterious, epic, peaceful, fearful, melancholy, dreamy, solemn
  场景类：battle, combat, outdoor, indoor, ancient, modern, fantasy, nature, night, dawn
  风格类：chinese, classical, orchestral, ambient, folk, action, thriller, zen, ceremonial

【SFX 语义标签数组（sfx_tags）】★关键变化★
不再输出固定音效key，而是输出描述音效内容的语义标签数组，解析器自动匹配。
规则：
- sfx_tags 为空数组 [] 表示无音效（等同原来的 none）
- 每批最多2句有音效，与文本动作严格对应
- 标签从以下词汇中选择（可组合）：
  动作类：sword, combat, horse, gallop, footstep, explosion, arrow, fight
  自然类：wind, rain, thunder, water, fire, birds, bird, forest
  环境类：bell, crowd, door, market, temple, indoor, outdoor
  情绪类：laugh, cry, sob, cheer
  其他类：magic, drum, page, book, sparkle

导演原则：
1. 同一场景内bgm_action保持keep，只在场景切换才change
2. 音效标签精准对应文本动作，不滥用
3. 对话时用角色对应音色，旁白用narrator音色
4. 情绪和语速是体现"有感情朗读"的核心
5. 停顿决定节奏感

严格输出JSON数组（不含其他内容）：
[{
  "idx": 0,
  "speaker": "narrator|角色名",
  "voice_id": "从选角表取",
  "emotion": "情绪",
  "speed": 1.0,
  "pause_ms": 200,
  "bgm_action": "keep|start|change|fade_out",
  "bgm_tags": ["标签1","标签2"],
  "sfx_tags": ["标签1"] 或 [],
  "note": "10字备注"
}]`;

// 默认选角表
function defaultCast(): CharacterCast {
  return {
    narrator: { voice_id: "audiobook_male_1", desc: "默认旁白" },
    characters: {},
  };
}

// 默认脚本
function defaultPlans(sentences: string[]): SentencePlan[] {
  return sentences.map((_, idx) => ({
    idx,
    speaker: "narrator",
    voice_id: "audiobook_male_1",
    emotion: "fluent",
    speed: 1.0,
    pause_ms: 200,
    bgm_action: idx === 0 ? "start" : "keep",
    bgm_tags: idx === 0 ? ["calm", "reading", "ambient"] : [],
    sfx_tags: [],
    note: "默认",
  }));
}

interface CharacterVoice {
  voice_id: string;
  gender?: string;
  desc?: string;
}

interface CharacterCast {
  narrator: CharacterVoice;
  characters: Record<string, CharacterVoice>;
}

interface SentencePlan {
  idx: number;
  speaker: string;
  voice_id: string;
  emotion: string;
  speed: number;
  pause_ms: number;
  bgm_action: string;
  bgm_tags: string[];   // 语义标签数组，替代硬编码 bgm_type
  sfx_tags: string[];   // 语义标签数组，替代硬编码 sfx_type
  note: string;
}

async function glmRequest(systemPrompt: string, userMessage: string): Promise<string> {
  const res = await fetch(GLM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: "GLM-4-Flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`GLM error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function safeParseJson<T>(content: string, fallback: T): T {
  try { return JSON.parse(content) as T; } catch { /* ignore */ }
  const objMatch = content.match(/\{[\s\S]*\}/);
  if (objMatch) try { return JSON.parse(objMatch[0]) as T; } catch { /* ignore */ }
  const arrMatch = content.match(/\[[\s\S]*\]/);
  if (arrMatch) try { return JSON.parse(arrMatch[0]) as T; } catch { /* ignore */ }
  return fallback;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let mode: string;
  let sentences: string[];
  let cast: CharacterCast | undefined;
  let prevContext: string | undefined;

  try {
    const body = await req.json();
    mode = body.mode ?? (body.sentences ? "script" : body.text ? "script_single" : "script");

    if (mode === "cast") {
      // ── 选角模式：识别角色，分配音色 ──
      sentences = body.sentences as string[];
      if (!sentences?.length) throw new Error("Missing sentences for cast");
    } else if (mode === "script_single") {
      // ── 旧版兼容单句模式 ──
      sentences = [body.text as string];
      cast = body.cast as CharacterCast | undefined;
      prevContext = body.prev_context as string | undefined;
    } else {
      // ── 批量逐句脚本模式 ──
      sentences = body.sentences as string[];
      cast = body.cast as CharacterCast | undefined;
      prevContext = body.prev_context as string | undefined;
      if (!sentences?.length) throw new Error("Missing sentences");
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ══ 选角模式 ═════════════════════════════════════════════
  if (mode === "cast") {
    try {
      const sample = sentences.slice(0, 40).map((s, i) => `[${i}] ${s}`).join("\n");
      const content = await glmRequest(
        CAST_SYSTEM_PROMPT,
        `请分析以下文本，识别所有说话人并分配音色：\n\n${sample}`,
      );
      const parsed = safeParseJson<CharacterCast>(content, defaultCast());
      return new Response(JSON.stringify({
        narrator: parsed.narrator ?? { voice_id: "audiobook_male_1", desc: "旁白" },
        characters: parsed.characters ?? {},
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ ...defaultCast(), error: (err as Error).message }),
        { status: 200, headers: { "Content-Type": "application/json" } });
    }
  }

  // ══ 逐句脚本模式 ════════════════════════════════════════
  // 构建选角表描述
  const castDesc = cast
    ? `【已确定选角表】\n旁白：${cast.narrator.voice_id}（${cast.narrator.desc ?? ""}）\n角色：\n${Object.entries(cast.characters).map(([name, v]) => `  ${name}：${v.voice_id}（${v.desc ?? ""}）`).join("\n")}`
    : "【无选角表，旁白统一用audiobook_male_1】";

  const contextNote = prevContext ? `【前文场景摘要】${prevContext}\n\n` : "";
  const numberedSentences = sentences.map((s, i) => `[${i}] ${s}`).join("\n");
  const userMessage = `${castDesc}\n\n${contextNote}【本批句子（共${sentences.length}句）】\n${numberedSentences}\n\n请为每句制定音频导演脚本，voice_id必须从选角表中取对应角色的值。`;

  try {
    const content = await glmRequest(SCRIPT_SYSTEM_PROMPT, userMessage);
    let rawPlans = safeParseJson<SentencePlan[]>(content, []);
    if (!Array.isArray(rawPlans)) {
      const asObj = rawPlans as Record<string, unknown>;
      rawPlans = (asObj.plans ?? asObj.script ?? Object.values(asObj)) as SentencePlan[];
    }

    const sanitized: SentencePlan[] = sentences.map((_, i) => {
      const p = (rawPlans as SentencePlan[]).find((x) => x.idx === i) ?? (rawPlans as SentencePlan[])[i] ?? {};
      // 从选角表解析 voice_id（双重保险）
      let voice_id = p.voice_id ?? "audiobook_male_1";
      if (cast && p.speaker) {
        if (p.speaker === "narrator") {
          voice_id = cast.narrator.voice_id;
        } else if (cast.characters[p.speaker]) {
          voice_id = cast.characters[p.speaker].voice_id;
        }
      }
      return {
        idx: i,
        speaker: p.speaker ?? "narrator",
        voice_id,
        emotion: p.emotion ?? "fluent",
        speed: typeof p.speed === "number" ? Math.min(1.4, Math.max(0.7, p.speed)) : 1.0,
        pause_ms: typeof p.pause_ms === "number" ? Math.min(1500, Math.max(0, p.pause_ms)) : 200,
        bgm_action: p.bgm_action ?? "keep",
        bgm_tags: Array.isArray(p.bgm_tags) ? p.bgm_tags : [],
        sfx_tags: Array.isArray(p.sfx_tags) ? p.sfx_tags : [],
        note: p.note ?? "",
      };
    });

    return new Response(JSON.stringify({ plans: sanitized }),
      { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({
      plans: defaultPlans(sentences),
      error: "AI导演服务暂时不可用",
      detail: (err as Error).message,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
});

const GLM_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const GLM_API_KEY = Deno.env.get("GLM_API_KEY") ?? "9f9a917e3cbf480291bfe80b2d8ed744.8RW6t1WfbnNJz7Oo";

// ── 逐句导演脚本格式 ──────────────────────────────────────
// 导演一次性读入5-10句，返回每句的完整执行计划
// 包含：音色、情绪、BGM动作（保持/切换/淡出）、音效（时机+类型）
const SYSTEM_PROMPT = `你是专业有声书"智能总导演"。你的任务是为一批连续句子制定逐句音频执行脚本。

你需要综合分析整批文本的叙事弧线、场景转换、情绪起伏，然后为每句话制定精准的音频导演指令。

【可用资源】

音色（voice_id）：
- audiobook_male_1：男声说书人，深沉醇厚，适合旁白叙事
- audiobook_female_1：女声说书人，温婉细腻，适合旁白叙事
- male-qn-qingse：清冷男声，适合古风/武侠/历史
- male-qn-jingying：精英男声，适合现代/职场
- male-qn-badao：霸道男声，适合冲突/战斗
- male-qn-daxuesheng：青年男声，适合青春/校园
- female-shaonv：少女音，适合童话/轻松
- female-yujie：御姐音，适合言情/都市
- female-chengshu：成熟女声，适合文学/散文
- female-tianmei：甜美女声，适合治愈/轻小说
- presenter_male：男主持，适合新闻/解说
- presenter_female：女主持，适合新闻/解说

情绪（emotion）：calm, happy, sad, angry, fearful, disgusted, surprised, fluent, whisper

BGM动作（bgm_action）：
- keep：保持当前BGM不变
- start：开始播放新BGM（场景开始）
- change：切换到新BGM（场景转换）
- fade_out：淡出当前BGM（场景结束/安静段落）

BGM类型（bgm_type，仅bgm_action为start/change时需要）：
none, classical, nature, calm, tense, sad, cheerful, epic, mysterious, romantic, battle, zen, night, journey, dream, suspense

音效（sfx_type）触发原则：
- 仅在文本中有明确场景动作时触发，不滥用
- 触发后该批次后续句子应为none，避免音效堆叠
none, wind, rain, thunder, bird, bell, sword, horse, crowd, water, fire, arrow, door, footstep, laugh, cry, drum, magic, explosion, birds, page_turn

【导演原则】
1. 叙事一致性：同一场景内音色/BGM保持稳定，切勿每句都变
2. 场景感知：识别场景切换点，在切换处才改变BGM
3. 音效克制：每批最多触发2个音效，且需与文本动作严格对应
4. 情绪细腻：情绪变化应跟随文本走，旁白用fluent，心理描写用whisper
5. 主次分明：确定本批主要叙事者（角色/旁白），全批使用同一基础音色

【输出格式】
严格输出JSON数组，不要任何其他内容：
[
  {
    "idx": 0,
    "voice_id": "音色ID",
    "emotion": "情绪",
    "bgm_action": "keep|start|change|fade_out",
    "bgm_type": "BGM类型或空字符串",
    "sfx_type": "音效类型或none",
    "note": "不超过10字的导演备注"
  }
]`;

// 默认脚本（fallback）
function defaultPlan(sentences: string[]): SentencePlan[] {
  return sentences.map((_, idx) => ({
    idx,
    voice_id: "audiobook_male_1",
    emotion: "calm",
    bgm_action: idx === 0 ? "start" : "keep",
    bgm_type: idx === 0 ? "calm" : "",
    sfx_type: "none",
    note: "默认",
  }));
}

interface SentencePlan {
  idx: number;
  voice_id: string;
  emotion: string;
  bgm_action: string;
  bgm_type: string;
  sfx_type: string;
  note: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let sentences: string[];
  let prevContext: string | undefined;
  try {
    const body = await req.json();
    // 兼容旧版单句模式
    if (body.text && !body.sentences) {
      sentences = [body.text as string];
    } else {
      sentences = body.sentences as string[];
    }
    prevContext = body.prev_context as string | undefined;
    if (!sentences?.length) throw new Error("Missing sentences");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 构建用户消息：提供上下文 + 本批句子
  const numberedSentences = sentences
    .map((s, i) => `[${i}] ${s}`)
    .join("\n");
  const contextNote = prevContext
    ? `【前文场景】${prevContext}\n\n`
    : "";
  const userMessage = `${contextNote}【本批句子（共${sentences.length}句）】\n${numberedSentences}\n\n请为以上每句制定音频导演脚本。`;

  try {
    const response = await fetch(GLM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: "GLM-4-Flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ plans: defaultPlan(sentences), error: `GLM error: ${errText}` }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await response.json();
    const content: string = result.choices?.[0]?.message?.content ?? "";

    // 解析JSON数组（有时模型会把数组包进对象）
    let plans: SentencePlan[];
    try {
      const raw = JSON.parse(content);
      plans = Array.isArray(raw) ? raw : (raw.plans ?? raw.script ?? Object.values(raw));
    } catch {
      const arrMatch = content.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        plans = JSON.parse(arrMatch[0]);
      } else {
        plans = defaultPlan(sentences);
      }
    }

    // 验证并补全每条计划
    const sanitized: SentencePlan[] = sentences.map((_, idx) => {
      const p = plans.find((x) => x.idx === idx) ?? plans[idx] ?? {};
      return {
        idx,
        voice_id: p.voice_id ?? "audiobook_male_1",
        emotion: p.emotion ?? "calm",
        bgm_action: p.bgm_action ?? "keep",
        bgm_type: p.bgm_type ?? "",
        sfx_type: p.sfx_type ?? "none",
        note: p.note ?? "",
      };
    });

    // 兼容旧版单句调用：同时返回旧格式
    const first = sanitized[0];
    return new Response(
      JSON.stringify({
        plans: sanitized,
        // 旧版兼容字段
        voice_id: first.voice_id,
        emotion: first.emotion,
        bgm_type: first.bgm_action !== "keep" ? first.bgm_type : "",
        sfx_type: first.sfx_type,
        reason: first.note,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        plans: defaultPlan(sentences),
        error: "AI导演服务暂时不可用",
        detail: (err as Error).message,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
});

const SYSTEM_PROMPT = `你是一位专业的有声书"智能导演"，负责为朗读内容匹配合适的音色、背景音乐和音效。

请根据用户提供的文本段落，分析其内容、情感、场景，然后输出JSON格式的导演决策。

可用音色列表（voice_id）：
- male-qn-qingse：青年男声，清冷沉稳，适合古风/武侠/历史
- male-qn-jingying：青年男声，精英商务，适合现代/职场
- male-qn-badao：青年男声，霸道强势，适合战斗/冲突
- male-qn-daxuesheng：青年男声，大学生，适合青春/校园
- female-shaonv：少女音，适合童话/青春
- female-yujie：御姐音，成熟知性，适合言情/都市
- female-chengshu：成熟女声，适合文学/散文
- female-tianmei：甜美女声，适合轻松/治愈
- male-qn-qingse：青年男声，清冷，适合古风
- presenter_male：男主持人，适合新闻/解说
- presenter_female：女主持人，适合新闻/解说
- audiobook_male_1：男声说书人，适合小说旁白
- audiobook_female_1：女声说书人，适合小说旁白

可用背景音乐类型（bgm_type）：
- none：无背景音乐
- classical：古典/古风音乐
- nature：自然白噪音（鸟鸣、流水）
- calm：轻柔舒缓
- tense：紧张悬疑
- sad：悲伤抒情
- cheerful：欢快活泼
- epic：史诗宏大

可用音效类型（sfx_type）：
- none：无音效
- wind：风声
- rain：雨声
- thunder：雷声
- bird：鸟鸣
- bell：钟声
- sword：剑鸣
- horse：马蹄声
- crowd：人群嘈杂
- water：流水声

可用情绪（emotion）：
- calm, happy, sad, angry, fearful, disgusted, surprised, fluent, whisper

请严格按以下JSON格式输出，不要输出任何其他内容：
{
  "voice_id": "音色ID",
  "emotion": "情绪",
  "bgm_type": "背景音乐类型",
  "sfx_type": "音效类型",
  "reason": "简短说明选择理由（20字以内）"
}`;

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let text: string;
  try {
    const body = await req.json();
    text = body.text;
    if (!text) throw new Error("Missing text");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const response = await fetch(GLM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: "GLM-4-Flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `请分析以下文本段落并给出导演决策：\n\n${text}` },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `GLM API error: ${response.status}`, detail: errText }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Empty response from GLM" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    }

    return new Response(
      JSON.stringify({
        voice_id: parsed.voice_id ?? "audiobook_male_1",
        emotion: parsed.emotion ?? "calm",
        bgm_type: parsed.bgm_type ?? "none",
        sfx_type: parsed.sfx_type ?? "none",
        reason: parsed.reason ?? "",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "AI导演服务暂时不可用",
        detail: (err as Error).message,
        fallback: {
          voice_id: "audiobook_male_1",
          emotion: "calm",
          bgm_type: "none",
          sfx_type: "none",
          reason: "默认配置",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
});