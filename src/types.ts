export interface Question {
  id: number
  /** 例：「架構一 正確觀念與態度」 */
  frame: string
  /** 例：「禁止不當行為（酒駕、不使用手機、危險駕駛）」 */
  category: string
  /** 題幹；純圖片題（標誌／標線）可為空字串，題目由圖片表達 */
  question: string
  /** 三個選項文字；optionsAreImages 為 true 時為三個空字串 */
  options: string[]
  optionsAreImages: boolean
  /** 正確答案 1～3 */
  answer: 1 | 2 | 3
  /** public/images/questions/ 下的檔名；optionsAreImages 時依序為選項 1、2、3 的圖 */
  images: string[]
}

export type Choice = 1 | 2 | 3
export type Mode = 'exam' | 'practice' | 'numeric' | 'wrong'

export interface AnswerRecord {
  qid: number
  /** null＝未作答（交卷時留白） */
  chosen: Choice | null
  correct: boolean
}

export interface Attempt {
  id: string
  mode: Mode
  /** 顯示用標題，例如「模擬考」「分類練習：路口安全」 */
  label: string
  startedAt: string
  finishedAt: string
  total: number
  correct: number
  /** 百分制分數 */
  score: number
  /** 只有模擬考有及格判定 */
  passed?: boolean
  answers: AnswerRecord[]
}

export interface AnswerHistoryItem {
  at: string
  chosen: Choice
  correct: boolean
  mode: Mode
}

export interface QuestionProgress {
  seen: number
  correct: number
  wrong: number
  /** 目前連續答對次數（答錯歸零） */
  streak: number
  /** 是否在錯題本中（待複習） */
  inWrongBook: boolean
  lastAt: string
  /** 最近的作答紀錄（上限 HISTORY_LIMIT 筆） */
  history: AnswerHistoryItem[]
}

export interface Settings {
  examCount: number
  /** 及格分數（百分制） */
  passScore: number
}

export interface AppData {
  version: 1
  attempts: Attempt[]
  progress: Record<string, QuestionProgress>
  settings: Settings
}
