import { grade, sample, shuffle } from './exam'
import { QUESTIONS } from './questions'

// 可重現的亂數
const lcg = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32)

describe('抽題', () => {
  it('shuffle 不改動原陣列且保留所有元素', () => {
    const a = [1, 2, 3, 4, 5]
    const s = shuffle(a, lcg(1))
    expect(a).toEqual([1, 2, 3, 4, 5])
    expect([...s].sort()).toEqual(a)
  })

  it('sample 取出不重複的 n 題，n 超過總數時取全部', () => {
    const s = sample(QUESTIONS, 50, lcg(7))
    expect(s).toHaveLength(50)
    expect(new Set(s.map((q) => q.id)).size).toBe(50)
    expect(sample([1, 2], 5)).toHaveLength(2)
    expect(sample([1, 2], -1)).toHaveLength(0)
  })
})

describe('計分', () => {
  const qs = QUESTIONS.slice(0, 10)

  it('全對 100 分、及格', () => {
    const chosen = Object.fromEntries(qs.map((q) => [q.id, q.answer]))
    const r = grade(qs, chosen, 90)
    expect(r).toMatchObject({ total: 10, correct: 10, score: 100, passed: true, unanswered: 0 })
  })

  it('未作答算錯，chosen 為 null', () => {
    const r = grade(qs, { [qs[0].id]: qs[0].answer }, 90)
    expect(r.correct).toBe(1)
    expect(r.unanswered).toBe(9)
    expect(r.answers[1]).toEqual({ qid: qs[1].id, chosen: null, correct: false })
    expect(r.passed).toBe(false)
  })

  it('及格門檻：剛好等於及格分數算及格', () => {
    const chosen = Object.fromEntries(qs.map((q, i) => [q.id, i < 9 ? q.answer : ((q.answer % 3) + 1) as 1 | 2 | 3]))
    expect(grade(qs, chosen, 90).passed).toBe(true) // 9/10 = 90
    expect(grade(qs, chosen, 91).passed).toBe(false)
  })

  it('0 題不會除以 0', () => {
    expect(grade([], {}, 90).score).toBe(0)
  })
})
