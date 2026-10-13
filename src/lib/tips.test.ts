import { getQuestion, QUESTIONS } from './questions'
import { TIP_GROUPS, tipsFor } from './tips'
import { NUMERIC_TAGS } from './numeric'

const norm = (s: string) => s.replace(/[\s,，]/g, '')

// 記憶提示的數字必須來自題庫：逐題核對 expect 字串確實出現在正確答案（或題幹）中
describe('記憶提示與題庫一致', () => {
  for (const g of TIP_GROUPS) {
    describe(g.title, () => {
      for (const r of g.rows) {
        it(`${r.label}（Q${r.qids.join('、')}）`, () => {
          for (const id of r.qids) {
            const q = getQuestion(id)
            expect(q, `題庫沒有第 ${id} 題`).toBeDefined()
            const answer = q!.options[q!.answer - 1]
            const haystack = norm(r.where === 'any' ? `${q!.question}${answer}` : answer)
            for (const e of r.expect) expect(haystack, `Q${id} 正確答案缺少「${e}」`).toContain(norm(e))
          }
        })
      }
    })
  }

  it('每組都有口訣、至少一列、tag 合法', () => {
    const tags = NUMERIC_TAGS.map((t) => t.tag)
    for (const g of TIP_GROUPS) {
      expect(g.mnemonic).toBeTruthy()
      expect(g.rows.length).toBeGreaterThan(0)
      expect(tags).toContain(g.tag)
      for (const r of g.rows) expect(r.expect.length, `${g.id}/${r.label}`).toBeGreaterThan(0)
    }
  })

  it('tipsFor 找得到對應題目；沒有口訣的題回傳空陣列', () => {
    expect(tipsFor(338)[0].group.id).toBe('time1')
    expect(tipsFor(1)).toEqual([])
    expect(QUESTIONS.length).toBe(1090)
  })
})
