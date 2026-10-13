import { applyAnswer, emptyData } from './storage'
import { categoryStats, overallStats, wrongQuestionIds } from './stats'
import { buildBackup, mergeData, parseBackup } from './backup'
import { QUESTIONS } from './questions'

const T1 = '2026-10-01T00:00:00.000Z'
const T2 = '2026-10-02T00:00:00.000Z'

describe('統計', () => {
  it('空資料：正確率為 null，不會 NaN', () => {
    const s = overallStats(emptyData())
    expect(s).toMatchObject({ answers: 0, accuracy: null, distinctSeen: 0, toReview: 0, totalQuestions: 1090 })
    expect(categoryStats(emptyData()).every((c) => c.accuracy === null)).toBe(true)
  })

  it('整體與分類統計、待複習題數', () => {
    let d = emptyData()
    d = applyAnswer(d, 1, 1, true, 'practice', T1) // 分類：禁止不當行為
    d = applyAnswer(d, 2, 1, false, 'practice', T1)
    d = applyAnswer(d, 2, 1, false, 'practice', T1)
    d = applyAnswer(d, 425, 1, true, 'exam', T1) // 路口安全
    const s = overallStats(d)
    expect(s).toMatchObject({ answers: 4, correct: 2, distinctSeen: 3, toReview: 1 })
    expect(s.accuracy).toBe(0.5)
    const cats = categoryStats(d)
    const c1 = cats.find((c) => c.category === QUESTIONS[0].category)!
    expect(c1).toMatchObject({ total: 100, distinctSeen: 2, answers: 3, correct: 1, toReview: 1 })
    const c2 = cats.find((c) => c.category === QUESTIONS[424].category)!
    expect(c2).toMatchObject({ answers: 1, correct: 1, accuracy: 1 })
    // 各分類題數加總 = 全題庫
    expect(cats.reduce((n, c) => n + c.total, 0)).toBe(1090)
  })

  it('錯題清單：預設只含待複習，可包含已掌握', () => {
    let d = emptyData()
    d = applyAnswer(d, 7, 1, false, 'exam', T1)
    d = applyAnswer(d, 7, 1, true, 'wrong', T1)
    d = applyAnswer(d, 7, 1, true, 'wrong', T1) // 已掌握
    d = applyAnswer(d, 3, 1, false, 'exam', T1)
    expect(wrongQuestionIds(d, false)).toEqual([3])
    expect(wrongQuestionIds(d, true)).toEqual([3, 7])
  })
})

describe('備份', () => {
  it('匯出再匯入內容相同', () => {
    let d = emptyData()
    d = applyAnswer(d, 1, 2, false, 'practice', T1)
    const r = parseBackup(buildBackup(d, new Date(T2)))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data).toEqual(d)
      expect(r.exportedAt).toBe(T2)
    }
  })

  it('壞檔案給出錯誤訊息而非丟例外', () => {
    expect(parseBackup('not json')).toMatchObject({ ok: false })
    expect(parseBackup('{"version":1}')).toMatchObject({ ok: false })
    expect(parseBackup('[]')).toMatchObject({ ok: false })
  })

  it('合併：歷史依 id 聯集、進度保留較新的一份', () => {
    const a = applyAnswer(emptyData(), 1, 1, false, 'exam', T1)
    const b = applyAnswer(applyAnswer(emptyData(), 1, 1, true, 'exam', T2), 2, 1, true, 'exam', T2)
    const att = (id: string, t: string) => ({
      id, mode: 'exam' as const, label: '', startedAt: t, finishedAt: t, total: 1, correct: 1, score: 100, answers: [],
    })
    a.attempts = [att('x', T1), att('shared', T1)]
    b.attempts = [att('shared', T1), att('y', T2)]
    const m = mergeData(a, b)
    expect(m.attempts.map((x) => x.id)).toEqual(['x', 'shared', 'y'])
    expect(m.progress[1].lastAt).toBe(T2)
    expect(m.progress[2]).toBeDefined()
  })
})
