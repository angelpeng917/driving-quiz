import raw from '../data/memoryTips.json'
import type { NumericTag } from './numeric'

export interface TipRow {
  label: string
  value: string
  /** 這筆數字的出處：題庫題號 */
  qids: number[]
  /** 必須出現在題庫（正確答案或題幹）中的字串，測試會逐題核對 */
  expect: string[]
  where: 'answer' | 'any'
}

export interface TipGroup {
  id: string
  tag: NumericTag
  title: string
  /** 口訣：記憶輔助，不是法條原文 */
  mnemonic: string
  mnemonicNote?: string
  /** 易混淆比較 */
  compare: string[]
  /** 題庫本身的疑點或不一致 */
  caveats?: string[]
  rows: TipRow[]
}

export const TIP_GROUPS = (raw as { groups: TipGroup[] }).groups

/** 與某題相關的口訣群組與對應列 */
export function tipsFor(qid: number): { group: TipGroup; rows: TipRow[] }[] {
  const out: { group: TipGroup; rows: TipRow[] }[] = []
  for (const group of TIP_GROUPS) {
    const rows = group.rows.filter((r) => r.qids.includes(qid))
    if (rows.length) out.push({ group, rows })
  }
  return out
}
