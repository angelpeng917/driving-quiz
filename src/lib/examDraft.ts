import { getQuestion } from './questions'
import type { Choice } from '../types'

const KEY = 'driving-quiz:exam-draft'

/** 進行中的模擬考；重新整理頁面後可繼續作答 */
export interface ExamDraft {
  ids: number[]
  chosen: Record<number, Choice>
  startedAt: string
  index: number
}

export function loadDraft(): ExamDraft | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as Partial<ExamDraft>
    if (!Array.isArray(d.ids) || typeof d.startedAt !== 'string') return null
    // 只保留題庫裡存在的題號；全部失效就視為沒有草稿
    const ids = d.ids.filter((id): id is number => typeof id === 'number' && !!getQuestion(id))
    if (ids.length === 0) return null
    const chosen: Record<number, Choice> = {}
    for (const [k, v] of Object.entries(d.chosen ?? {})) if (ids.includes(Number(k)) && (v === 1 || v === 2 || v === 3)) chosen[Number(k)] = v
    const index = typeof d.index === 'number' ? Math.min(Math.max(0, Math.floor(d.index)), ids.length - 1) : 0
    return { ids, chosen, startedAt: d.startedAt, index }
  } catch {
    return null
  }
}

export function saveDraft(d: ExamDraft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d))
  } catch {
    /* 忽略 */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* 忽略 */
  }
}
