import { ATTEMPT_LIMIT, parseAppData } from './storage'
import type { AppData } from '../types'

export const BACKUP_APP = 'driving-quiz'

export interface BackupFile extends AppData {
  app: typeof BACKUP_APP
  exportedAt: string
}

export function buildBackup(data: AppData, now = new Date()): string {
  const file: BackupFile = { app: BACKUP_APP, exportedAt: now.toISOString(), ...data }
  return JSON.stringify(file, null, 1)
}

export type ParseResult = { ok: true; data: AppData; exportedAt?: string } | { ok: false; error: string }

export function parseBackup(text: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: '檔案不是有效的 JSON。' }
  }
  const data = parseAppData(json)
  if (!data) return { ok: false, error: '檔案格式不符，這不是本網站匯出的備份。' }
  const exportedAt = (json as { exportedAt?: unknown }).exportedAt
  return { ok: true, data, exportedAt: typeof exportedAt === 'string' ? exportedAt : undefined }
}

/**
 * 合併兩份資料：
 * - 測驗歷史：依 id 聯集，依完成時間排序
 * - 每題進度：兩邊都有時保留最近作答（lastAt 較新）的那一份
 * - 設定：沿用目前裝置的設定
 */
export function mergeData(current: AppData, incoming: AppData): AppData {
  const attempts = new Map(current.attempts.map((a) => [a.id, a]))
  for (const a of incoming.attempts) if (!attempts.has(a.id)) attempts.set(a.id, a)
  const progress = { ...current.progress }
  for (const [id, p] of Object.entries(incoming.progress)) {
    const mine = progress[id]
    if (!mine || p.lastAt > mine.lastAt) progress[id] = p
  }
  return {
    ...current,
    attempts: [...attempts.values()].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt)).slice(-ATTEMPT_LIMIT),
    progress,
  }
}
