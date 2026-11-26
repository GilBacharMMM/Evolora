// The shape of a lesson as the loading program saves it (tools/lib/lesson-parser.mjs).
// Correct answers, hints and solutions are not here: students can never read them (D-17).

export type LessonType = 'teaching' | 'practice' | 'exam'

export interface LessonDetails {
  title: string
  language: 'he' | 'ar' | 'en'
  subject: string
  grade: number
  creator: string
  licence: string
  type: LessonType
  minimumPerTopic: number | null
}

export interface Tip {
  title: string
  text: string
}

export type Block =
  | { type: 'text' | 'note' | 'table' | 'solvedExample' | 'linkList'; markdown: string }
  | { type: 'formula'; latex: string[]; words: string[] }
  | { type: 'quote'; markdown: string; source: string }
  | { type: 'image'; file: string; caption: string; source: string; storagePath: string | null }
  | { type: 'video'; youtubeId: string | null; link: string; title: string; source: string; start: number | null; end: number | null }
  | { type: 'audio'; link: string | null; file: string | null; title: string; intro: string }
  | { type: 'simulation'; link: string; title: string; instructions: string }
  | Question

export interface Question {
  type: 'question'
  id: string
  kind: 'choice' | 'number' | 'open' | 'audio' | 'drag' | 'blanks'
  level: number | null
  extra: boolean
  prompt: string
  choices: { id: string; text: string }[]
  multipleCorrect: boolean
  unit: string | null
  tips: Tip[]
  // Drag and drop (REQ-4.12, D-70): an image, spots on it (in percent), and the cards to place.
  image?: { file: string; caption: string; source: string; storagePath: string | null } | null
  spots?: { x: number; y: number }[]
  cards?: { id: string; text: string }[]
  // Fill in the blanks (REQ-4.30, D-78): the kind, and per blank the words to choose from (dropdown).
  blanksKind?: 'typed' | 'choice' | 'words'
  blanks?: { options?: { id: string; text: string }[] }[]
}

export interface Topic {
  number: number
  name: string | null
  blocks: Block[]
}

export interface LessonVersion {
  version: number
  lessonId: string
  details: LessonDetails
  topics: Topic[]
  imagesState: 'uploaded' | 'missing' | 'none'
}

export interface LessonSummary extends LessonDetails {
  id: string
  currentVersion: number
  counts?: { topics: number; questions: number; images: number }
}

export interface CourseEntry {
  lessonId: string
  title: string
  type: LessonType
}

export interface Course {
  id: string
  title: string
  language: 'he' | 'ar' | 'en'
  items: (CourseEntry & { kind: 'teaching' | 'exam'; practice: CourseEntry[] })[]
}
