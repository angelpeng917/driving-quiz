import { CATEGORIES, QUESTIONS } from './questions'
import type { AppData } from '../types'

export interface OverallStats {
  /** 累計作答次數（同一題答多次會重複計算） */
  answers: number
  correct: number
  /** 0~1；沒作答過為 null */
  accuracy: number | null
  /** 做過幾題不同的題目 */
  distinctSeen: number
  totalQuestions: number
  /** 錯題本中待複習的題數 */
  toReview: number
  attempts: number
}

export interface CategoryStats {
  category: string
  total: number
  distinctSeen: number
  answers: number
  correct: number
  accuracy: number | null
  toReview: number
}

const ratio = (c: number, n: number) => (n === 0 ? null : c / n)

export function overallStats(data: AppData): OverallStats {
  let answers = 0
  let correct = 0
  let toReview = 0
  let distinctSeen = 0
  for (const p of Object.values(data.progress)) {
    answers += p.seen
    correct += p.correct
    if (p.seen > 0) distinctSeen++
    if (p.inWrongBook) toReview++
  }
  return {
    answers,
    correct,
    accuracy: ratio(correct, answers),
    distinctSeen,
    totalQuestions: QUESTIONS.length,
    toReview,
    attempts: data.attempts.length,
  }
}

export function categoryStats(data: AppData): CategoryStats[] {
  const rows = new Map<string, CategoryStats>(
    CATEGORIES.map((c) => [c, { category: c, total: 0, distinctSeen: 0, answers: 0, correct: 0, accuracy: null, toReview: 0 }]),
  )
  for (const q of QUESTIONS) {
    const r = rows.get(q.category)!
    r.total++
    const p = data.progress[q.id]
    if (!p) continue
    if (p.seen > 0) r.distinctSeen++
    r.answers += p.seen
    r.correct += p.correct
    if (p.inWrongBook) r.toReview++
  }
  for (const r of rows.values()) r.accuracy = ratio(r.correct, r.answers)
  return [...rows.values()]
}

/** 錯題本題目：待複習（inWrongBook）或包含已掌握但曾答錯者 */
export function wrongQuestionIds(data: AppData, includeMastered: boolean): number[] {
  return Object.entries(data.progress)
    .filter(([, p]) => (includeMastered ? p.wrong > 0 : p.inWrongBook))
    .map(([id]) => Number(id))
    .sort((a, b) => a - b)
}

export const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`)
