import type { AnswerRecord, Choice, Question } from '../types'

/**
 * 模擬考預設值。題數與及格分數可在畫面調整，非官方規定。
 * 及格分數 85 依題庫第 298 題（「筆試之及格標準」）的答案；題數 50 只是練習用的預設。
 */
export const EXAM_DEFAULTS = { count: 50, passScore: 85 }

export type Rng = () => number

/** Fisher–Yates 洗牌（不改動原陣列） */
export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function sample<T>(arr: readonly T[], n: number, rng: Rng = Math.random): T[] {
  return shuffle(arr, rng).slice(0, Math.max(0, Math.min(n, arr.length)))
}

export interface GradeResult {
  answers: AnswerRecord[]
  total: number
  correct: number
  unanswered: number
  /** 百分制，四捨五入到整數 */
  score: number
  passed: boolean
}

export function grade(
  questions: readonly Question[],
  chosen: Readonly<Record<number, Choice | undefined>>,
  passScore: number,
): GradeResult {
  const answers: AnswerRecord[] = questions.map((q) => {
    const c = chosen[q.id] ?? null
    return { qid: q.id, chosen: c, correct: c === q.answer }
  })
  const total = answers.length
  const correct = answers.filter((a) => a.correct).length
  const score = total === 0 ? 0 : Math.round((correct / total) * 100)
  return {
    answers,
    total,
    correct,
    unanswered: answers.filter((a) => a.chosen === null).length,
    score,
    // 用未四捨五入的百分比判斷，避免 84.5 分被進位成 85 而誤判及格
    passed: total > 0 && (correct / total) * 100 >= passScore,
  }
}
