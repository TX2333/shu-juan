import * as SQLite from 'expo-sqlite';

const DB_NAME = 'shujuan.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  await initSchema(dbInstance);
  return dbInstance;
}

async function initSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT DEFAULT '',
      description TEXT DEFAULT '',
      file_path TEXT NOT NULL,
      file_format TEXT NOT NULL,
      total_chapters INTEGER DEFAULT 0,
      total_chars INTEGER DEFAULT 0,
      cover_color TEXT DEFAULT '#C8933F',
      imported_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      chapter_index INTEGER NOT NULL,
      char_count INTEGER DEFAULT 0,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL UNIQUE,
      chapter_index INTEGER DEFAULT 0,
      sentence_index INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chapters_book_id ON chapters(book_id);
    CREATE INDEX IF NOT EXISTS idx_progress_book_id ON reading_progress(book_id);
  `);
}

// 书籍类型
export interface Book {
  id: number;
  title: string;
  author: string;
  description: string;
  file_path: string;
  file_format: string;
  total_chapters: number;
  total_chars: number;
  cover_color: string;
  imported_at: string;
}

// 章节类型
export interface Chapter {
  id: number;
  book_id: number;
  title: string;
  content: string;
  chapter_index: number;
  char_count: number;
}

// 阅读进度类型
export interface ReadingProgress {
  id: number;
  book_id: number;
  chapter_index: number;
  sentence_index: number;
  updated_at: string;
}

// ===== 书籍 CRUD =====
export async function insertBook(book: Omit<Book, 'id'>): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO books (title, author, description, file_path, file_format, total_chapters, total_chars, cover_color, imported_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [book.title, book.author, book.description, book.file_path, book.file_format,
     book.total_chapters, book.total_chars, book.cover_color, book.imported_at]
  );
  return result.lastInsertRowId as number;
}

export async function getAllBooks(): Promise<Book[]> {
  const db = await getDB();
  return db.getAllAsync<Book>('SELECT * FROM books ORDER BY imported_at DESC');
}

export async function getBookById(id: number): Promise<Book | null> {
  const db = await getDB();
  return db.getFirstAsync<Book>('SELECT * FROM books WHERE id = ?', [id]);
}

export async function deleteBook(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM books WHERE id = ?', [id]);
}

// ===== 章节 CRUD =====
export async function insertChapters(chapters: Omit<Chapter, 'id'>[]): Promise<void> {
  const db = await getDB();
  await db.withTransactionAsync(async () => {
    for (const ch of chapters) {
      await db.runAsync(
        `INSERT INTO chapters (book_id, title, content, chapter_index, char_count)
         VALUES (?, ?, ?, ?, ?)`,
        [ch.book_id, ch.title, ch.content, ch.chapter_index, ch.char_count]
      );
    }
  });
}

export async function getChaptersByBookId(bookId: number): Promise<Chapter[]> {
  const db = await getDB();
  return db.getAllAsync<Chapter>(
    'SELECT * FROM chapters WHERE book_id = ? ORDER BY chapter_index ASC',
    [bookId]
  );
}

export async function getChapter(bookId: number, chapterIndex: number): Promise<Chapter | null> {
  const db = await getDB();
  return db.getFirstAsync<Chapter>(
    'SELECT * FROM chapters WHERE book_id = ? AND chapter_index = ?',
    [bookId, chapterIndex]
  );
}

// ===== 阅读进度 =====
export async function saveProgress(bookId: number, chapterIndex: number, sentenceIndex: number): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO reading_progress (book_id, chapter_index, sentence_index, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(book_id) DO UPDATE SET chapter_index = ?, sentence_index = ?, updated_at = ?`,
    [bookId, chapterIndex, sentenceIndex, now, chapterIndex, sentenceIndex, now]
  );
}

export async function getProgress(bookId: number): Promise<ReadingProgress | null> {
  const db = await getDB();
  return db.getFirstAsync<ReadingProgress>(
    'SELECT * FROM reading_progress WHERE book_id = ?',
    [bookId]
  );
}

// ===== 更新书籍信息 =====
export async function updateBookChapters(bookId: number, totalChapters: number, totalChars: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'UPDATE books SET total_chapters = ?, total_chars = ? WHERE id = ?',
    [totalChapters, totalChars, bookId]
  );
}