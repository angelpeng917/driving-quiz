import { QUESTIONS } from './questions'
import type { Question } from '../types'

/**
 * 數字題：題幹或選項含「數字＋單位」的題目。
 * 分類是依關鍵字自動判斷（不是官方分類），一題可同時屬於多類。
 */
export type NumericTag = 'fine' | 'speed' | 'distance' | 'time' | 'other'

export const NUMERIC_TAGS: { tag: NumericTag; label: string; hint: string }[] = [
  { tag: 'fine', label: '罰鍰', hint: '罰鍰金額、吊扣吊銷期間' },
  { tag: 'speed', label: '速度', hint: '速限、時速' },
  { tag: 'distance', label: '距離', hint: '公尺、公分、公釐、車距、停車距離' },
  { tag: 'time', label: '時間', hint: '秒、分、小時、日、月、年' },
  { tag: 'other', label: '其他數字', hint: '酒精濃度、重量、年齡、點數、檔位等' },
]

const CN = '[一二三四五六七八九十百千半兩]'
const NUM = `(?:\\d+萬\\d+千|\\d[\\d,]*(?:\\.\\d+)?|${CN}+)`
const sp = '\\s*'

const UNIT = {
  money: '(?:萬元|萬|千|元)',
  speed: '(?:公里|km|Km|KM)',
  dist: '(?:公尺|公分|公釐|公里|米|mm|cm|m|M)',
  // 「分」排除「二分之一」；「時」排除「時速」「時間」「同時」
  time: '(?:秒|分鐘|分(?!之)|小時|個月|日|天|週|星期|年|月|時(?![速間]))',
  // 「次」「點」「度」「座」只認阿拉伯數字，避免「二次事故」「任一點」「喝一點」被誤判
  other: '(?:(?:%|％|毫克|公噸|公斤|噸|歲|檔|倍|立方公分|cc|CC|轉)|(?<=\\d\\s{0,3})(?:點|次|度|座))',
}
const re = (unit: string) => new RegExp(`${NUM}${sp}${unit}`, 'g')

const ANY_UNIT = Object.values(UNIT).join('|')
// 範圍：600~1,800元、5-30公尺、3萬元至12萬元
const RANGE = `(?:${NUM}${sp}(?:${ANY_UNIT})?${sp}[~～\\-–至到]${sp})*`

/** 要高亮的「數字＋單位」（含範圍與「以上／以下」等後綴） */
export const NUMBER_RE = new RegExp(`${RANGE}${NUM}${sp}(?:${ANY_UNIT})(?:以上|以下|內|前|後)?`, 'g')

/** 要高亮的關鍵字（法規用語、比較用語） */
export const KEYWORD_RE =
  /罰鍰|吊扣|吊銷|違規點數|時速|速限|每小時|以上|以下|未滿|超過|不足|至少|至多|最高|最低|終身|逾期|屆滿|不得/g

export function numericTags(q: Question): NumericTag[] {
  const text = [q.question, ...q.options].join('\n').replace(/\s+/g, '')
  const has = (r: RegExp) => new RegExp(r.source).test(text)
  const tags = new Set<NumericTag>()
  const fineCtx = /罰鍰|新臺幣|吊扣|吊銷|記違規|罰款/
  if (has(re(UNIT.money)) && fineCtx.test(text)) tags.add('fine')
  // 吊扣／吊銷的期間也歸罰鍰類（例：吊扣駕照 2 年）
  if (/吊扣|吊銷/.test(text) && has(re(UNIT.time))) tags.add('fine')
  const speedCtx = /時速|速限|每小時|速度|限速|車速/
  if (speedCtx.test(text) && has(re(UNIT.speed))) tags.add('speed')
  if (has(re(UNIT.dist)) && !(tags.has('speed') && !/公尺|公分|公釐/.test(text))) tags.add('distance')
  if (has(re(UNIT.time))) tags.add('time')
  if (has(re(UNIT.other))) tags.add('other')
  // 只有「年」「月」「日」這類單字單位，卻沒有數字語境（如「每年」「今日」）時不算
  return NUMERIC_TAGS.map((t) => t.tag).filter((t) => tags.has(t))
}

const tagCache = new Map<number, NumericTag[]>()
export const tagsOf = (q: Question) => {
  let t = tagCache.get(q.id)
  if (!t) tagCache.set(q.id, (t = numericTags(q)))
  return t
}

export const numericQuestions = (tag?: NumericTag) =>
  QUESTIONS.filter((q) => (tag ? tagsOf(q).includes(tag) : tagsOf(q).length > 0))

export interface Segment {
  text: string
  kind: 'num' | 'kw' | null
}

/** 把文字切成「數字／關鍵字／一般文字」片段，供畫面高亮 */
export function highlightSegments(text: string): Segment[] {
  const hits: { start: number; end: number; kind: 'num' | 'kw' }[] = []
  for (const m of text.matchAll(NUMBER_RE)) hits.push({ start: m.index!, end: m.index! + m[0].length, kind: 'num' })
  for (const m of text.matchAll(KEYWORD_RE)) {
    const start = m.index!
    const end = start + m[0].length
    // 數字片段已包含的關鍵字（如「3 公尺以上」）不重複標記
    if (!hits.some((h) => start < h.end && end > h.start)) hits.push({ start, end, kind: 'kw' })
  }
  hits.sort((a, b) => a.start - b.start)
  const out: Segment[] = []
  let pos = 0
  for (const h of hits) {
    if (h.start > pos) out.push({ text: text.slice(pos, h.start), kind: null })
    out.push({ text: text.slice(h.start, h.end), kind: h.kind })
    pos = h.end
  }
  if (pos < text.length) out.push({ text: text.slice(pos), kind: null })
  return out
}
