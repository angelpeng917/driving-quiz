import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { QUESTIONS, CATEGORIES } from './questions'

// 題庫資料完整性：以 PDF 末頁各架構標示的合計為準
describe('題庫資料驗證', () => {
  it('共 1090 題，題號 1..1090 連續不重複', () => {
    expect(QUESTIONS).toHaveLength(1090)
    QUESTIONS.forEach((q, i) => expect(q.id).toBe(i + 1))
  })

  it('各架構題數與題號範圍和 PDF 合計相符', () => {
    const range = (frame: string) => {
      const ids = QUESTIONS.filter((q) => q.frame.startsWith(frame)).map((q) => q.id)
      return [ids.length, Math.min(...ids), Math.max(...ids)]
    }
    expect(range('架構一')).toEqual([424, 1, 424])
    expect(range('架構二')).toEqual([230, 425, 654])
    expect(range('架構三')).toEqual([436, 655, 1090])
  })

  it('每題都有分類、答案 1~3、三個選項', () => {
    for (const q of QUESTIONS) {
      expect(q.category, `Q${q.id} 分類`).toBeTruthy()
      expect([1, 2, 3], `Q${q.id} 答案`).toContain(q.answer)
      expect(q.options, `Q${q.id} 選項數`).toHaveLength(3)
      if (!q.optionsAreImages) q.options.forEach((o, i) => expect(o, `Q${q.id} 選項${i + 1}`).not.toBe(''))
    }
  })

  it('每題至少有題幹或圖片；圖片選項題剛好三張圖', () => {
    for (const q of QUESTIONS) {
      expect(q.question !== '' || q.images.length > 0, `Q${q.id} 無題幹也無圖`).toBe(true)
      if (q.optionsAreImages) expect(q.images, `Q${q.id} 圖片選項`).toHaveLength(3)
    }
  })

  it('所有引用的圖片檔都存在', () => {
    for (const q of QUESTIONS)
      for (const f of q.images)
        expect(existsSync(join(process.cwd(), 'public/images/questions', f)), `${f}`).toBe(true)
  })

  it('共 10 個分類，各分類起始題號與 PDF 分類標題位置一致', () => {
    expect(CATEGORIES).toHaveLength(10)
    const firstIds = CATEGORIES.map((c) => QUESTIONS.find((q) => q.category === c)!.id)
    expect(firstIds).toEqual([1, 101, 425, 570, 623, 655, 827, 855, 884, 969])
  })
})

describe('擷取殘留檢查', () => {
  it('題幹與選項不含 PDF 表頭／頁碼殘留字', () => {
    for (const q of QUESTIONS)
      for (const t of [q.question, ...q.options]) {
        expect(t, `Q${q.id}`).not.toMatch(/題號|新版汽車筆試題庫|第\s*\d+\s*頁|▎|满/)
        expect(t, `Q${q.id} 前後空白`).toBe(t.trim())
      }
  })
})

describe('圖片選項題順序（人工核對過的案例）', () => {
  it('Q233：選項 2 的圖是紅黃綠三燈號誌（答案）', async () => {
    const { statSync } = await import('node:fs')
    const q = QUESTIONS[232]
    expect(q.answer).toBe(2)
    // 三燈號誌圖最寬扁（125x69），應是第 2 張；用檔案大小粗略固定順序以防擷取排序回歸
    const size = (f: string) => statSync(join(process.cwd(), 'public/images/questions', f)).size
    expect(size(q.images[1])).toBeGreaterThan(size(q.images[2]))
  })
})
