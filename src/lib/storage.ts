import { useSyncExternalStore } from 'react'
import { EXAM_DEFAULTS } from './exam'
import type { AnswerRecord, AppData, Attempt, Mode, QuestionProgress, Settings } from '../types'

export const STORAGE_KEY = 'driving-quiz:v1'
/** 每題最多保留的作答紀錄筆數 */
export const HISTORY_LIMIT = 20
/** 錯題連續答對幾次後移出錯題本 */
export const MASTER_STREAK = 2
/** 測驗歷史最多保留筆數（超過時丟掉最舊的） */
export const ATTEMPT_LIMIT = 500

export const defaultSettings = (): Settings => ({
  examCount: EXAM_DEFAULTS.count,
  passScore: EXAM_DEFAULTS.passScore,
})

export const emptyData = (): AppData => ({
  version: 1,
  attempts: [],
  progress: {},
  settings: defaultSettings(),
})

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : d)
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d)
const isChoice = (v: unknown): v is 1 | 2 | 3 => v === 1 || v === 2 || v === 3
const MODES: Mode[] = ['exam', 'practice', 'numeric', 'wrong']

function cleanProgress(v: unknown): QuestionProgress | null {
  if (!isObj(v)) return null
  const history = (Array.isArray(v.history) ? v.history : [])
    .filter((h): h is Record<string, unknown> => isObj(h) && isChoice(h.chosen) && typeof h.correct === 'boolean')
    .map((h) => ({
      at: str(h.at),
      chosen: h.chosen as 1 | 2 | 3,
      correct: h.correct as boolean,
      mode: MODES.includes(h.mode as Mode) ? (h.mode as Mode) : 'practice',
    }))
    .slice(-HISTORY_LIMIT)
  return {
    seen: num(v.seen),
    correct: num(v.correct),
    wrong: num(v.wrong),
    streak: num(v.streak),
    inWrongBook: v.inWrongBook === true,
    lastAt: str(v.lastAt),
    history,
  }
}

function cleanAttempt(v: unknown): Attempt | null {
  if (!isObj(v) || typeof v.id !== 'string' || !Array.isArray(v.answers)) return null
  const answers = v.answers
    .filter((a): a is Record<string, unknown> => isObj(a) && num(a.qid, -1) > 0 && (a.chosen === null || isChoice(a.chosen)))
    .map((a) => ({ qid: a.qid as number, chosen: a.chosen as 1 | 2 | 3 | null, correct: a.correct === true }))
  return {
    id: v.id,
    mode: MODES.includes(v.mode as Mode) ? (v.mode as Mode) : 'practice',
    label: str(v.label, '練習'),
    startedAt: str(v.startedAt),
    finishedAt: str(v.finishedAt),
    total: num(v.total, answers.length),
    correct: num(v.correct),
    score: Math.min(100, num(v.score)),
    ...(typeof v.passed === 'boolean' ? { passed: v.passed } : {}),
    answers,
  }
}

/** 驗證並整理任意 JSON（localStorage 或匯入檔）：壞掉的項目會被丟掉；整體格式不符時回傳 null */
export function parseAppData(input: unknown): AppData | null {
  if (!isObj(input) || input.version !== 1) return null
  if (!Array.isArray(input.attempts) || !isObj(input.progress)) return null
  const rawSettings = isObj(input.settings) ? input.settings : {}
  const settings: Settings = {
    examCount: Math.min(1090, Math.max(1, num(rawSettings.examCount, defaultSettings().examCount))),
    passScore: Math.min(100, Math.max(1, num(rawSettings.passScore, defaultSettings().passScore))),
  }
  const progress: Record<string, QuestionProgress> = {}
  for (const [id, p] of Object.entries(input.progress)) {
    const clean = /^\d+$/.test(id) ? cleanProgress(p) : null
    if (clean) progress[id] = clean
  }
  return {
    version: 1,
    attempts: input.attempts.map(cleanAttempt).filter((a): a is Attempt => a !== null),
    progress,
    settings,
  }
}

/** 套用一題作答結果（純函式，不修改傳入物件） */
export function applyAnswer(
  data: AppData,
  qid: number,
  chosen: NonNullable<AnswerRecord['chosen']>,
  correct: boolean,
  mode: Mode,
  at: string,
): AppData {
  const prev = data.progress[qid]
  const p: QuestionProgress = prev
    ? { ...prev, history: prev.history.slice() }
    : { seen: 0, correct: 0, wrong: 0, streak: 0, inWrongBook: false, lastAt: at, history: [] }
  p.seen += 1
  p.lastAt = at
  if (correct) {
    p.correct += 1
    p.streak += 1
    if (p.inWrongBook && p.streak >= MASTER_STREAK) p.inWrongBook = false
  } else {
    p.wrong += 1
    p.streak = 0
    p.inWrongBook = true
  }
  p.history.push({ at, chosen, correct, mode })
  if (p.history.length > HISTORY_LIMIT) p.history = p.history.slice(-HISTORY_LIMIT)
  return { ...data, progress: { ...data.progress, [qid]: p } }
}

export function addAttempt(data: AppData, attempt: Attempt): AppData {
  const attempts = [...data.attempts, attempt].slice(-ATTEMPT_LIMIT)
  return { ...data, attempts }
}

// ---- 以下為 localStorage 與 React 的連接 ----

let current: AppData | null = null
const listeners = new Set<() => void>()

function read(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      let parsed: AppData | null = null
      try {
        parsed = parseAppData(JSON.parse(raw))
      } catch {
        /* 下面統一處理 */
      }
      if (parsed) return parsed
      // 資料損毀或版本不符：先留一份原始內容再重新開始，避免被靜默覆寫
      localStorage.setItem(STORAGE_KEY + ':corrupt', raw)
    }
  } catch {
    /* 無痕模式：以空資料開始 */
  }
  return emptyData()
}

export function getData(): AppData {
  return (current ??= read())
}

/** 儲存是否失敗（容量不足、無痕模式等）；畫面會據此提醒使用者備份 */
let saveFailed = false
export const hasSaveFailed = () => saveFailed

export function setData(next: AppData) {
  current = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    saveFailed = false
  } catch {
    saveFailed = true // 僅保留在記憶體
  }
  listeners.forEach((l) => l())
}

export const update = (fn: (d: AppData) => AppData) => setData(fn(getData()))

/** 測試用：丟掉記憶體快取，下次重新從 localStorage 讀取 */
export function resetCache() {
  current = null
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

if (typeof window !== 'undefined') {
  // 其他分頁修改資料時同步
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === null) resetCache()
  })
}

export const useAppData = () => useSyncExternalStore(subscribe, getData)
export const useSaveFailed = () => useSyncExternalStore(subscribe, hasSaveFailed)

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
