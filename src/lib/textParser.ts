// 文本解析工具：章节切分、句子切分、PDF文本提取

// 章节标题正则：匹配"第X章/回/节/卷"等
const CHAPTER_REGEX = /^[\s]*第[一二三四五六七八九十百千零〇两\d]+[章节回卷篇集部][\s\S]{0,40}$/m;

// 句子切分：按句号、问号、感叹号、分号切分
const SENTENCE_SPLIT_REGEX = /[^。！？；\n]+[。！？；]+/g;

export interface ParsedChapter {
  title: string;
  content: string;
  index: number;
}

/**
 * 将全文按章节标题切分
 */
export function parseChapters(text: string): ParsedChapter[] {
  const lines = text.split('\n');
  const chapters: ParsedChapter[] = [];
  let currentTitle = '序言';
  let currentContent: string[] = [];
  let chapterIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (CHAPTER_REGEX.test(trimmed) && trimmed.length < 50) {
      // 保存上一章
      if (currentContent.length > 0) {
        chapters.push({
          title: currentTitle,
          content: currentContent.join('\n').trim(),
          index: chapterIndex,
        });
        chapterIndex++;
      }
      currentTitle = trimmed;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // 保存最后一章
  if (currentContent.length > 0) {
    chapters.push({
      title: currentTitle,
      content: currentContent.join('\n').trim(),
      index: chapterIndex,
    });
  }

  // 如果没有识别到章节，将全文作为一章
  if (chapters.length === 0) {
    chapters.push({
      title: '正文',
      content: text.trim(),
      index: 0,
    });
  }

  return chapters;
}

/**
 * 将章节内容切分为句子（用于朗读高亮）
 */
export function splitSentences(content: string): string[] {
  const sentences = content.match(SENTENCE_SPLIT_REGEX);
  if (sentences && sentences.length > 0) {
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }
  // fallback: 按换行切分
  return content
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * 从文件名提取书名
 */
export function extractTitle(filename: string): string {
  const name = filename.replace(/\.[^.]+$/, '');
  return name.length > 30 ? name.substring(0, 30) : name;
}

/**
 * 尝试从PDF二进制内容中提取文本（简易版）
 * PDF文本提取较复杂，这里使用基础方法
 */
export function extractPdfText(buffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(buffer);
    let text = '';
    let inText = false;
    let currentWord = '';

    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];

      // 检测 BT (Begin Text) 标记
      if (byte === 0x42 && i + 1 < bytes.length && bytes[i + 1] === 0x54) {
        inText = true;
        continue;
      }
      // 检测 ET (End Text) 标记
      if (byte === 0x45 && i + 1 < bytes.length && bytes[i + 1] === 0x54) {
        inText = false;
        continue;
      }

      if (inText) {
        // 检测 Tj / TJ 操作符（文本显示）
        if (byte === 0x54 && i + 1 < bytes.length && (bytes[i + 1] === 0x6a || bytes[i + 1] === 0x4a)) {
          if (currentWord.length > 0) {
            text += currentWord;
            currentWord = '';
          }
        }
        // 检测括号内的文本
        if (byte === 0x28) { // (
          currentWord = '';
        } else if (byte === 0x29) { // )
          if (currentWord.length > 0) {
            text += currentWord;
            currentWord = '';
          }
        } else if (byte >= 0x20 && byte < 0x7f) {
          currentWord += String.fromCharCode(byte);
        }
      }
    }

    // 清理提取的文本
    text = text.replace(/[^\一-\鿿\，\。\！\？\；\：\、\「\」\『\』\（\）\《\》\n\r\s\w]/g, '');
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  } catch {
    return '';
  }
}

/**
 * 生成书籍封面颜色（从预定义的中国风色板中选取）
 */
const COVER_COLORS = [
  '#BC4431', // 朱砂红
  '#C8933F', // 沉香金
  '#5B7A5A', // 松柏绿
  '#4A6FA5', // 青花蓝
  '#8B5E3C', // 檀木棕
  '#6B4E8E', // 紫檀
  '#3E5C5C', // 黛色
  '#A0522D', // 赭石
];

export function pickCoverColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i);
    hash |= 0;
  }
  return COVER_COLORS[Math.abs(hash) % COVER_COLORS.length];
}