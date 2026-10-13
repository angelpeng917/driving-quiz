import { addAttempt, applyAnswer, ATTEMPT_LIMIT, emptyData, HISTORY_LIMIT, parseAppData } from './storage'
import type { Attempt } from '../types'

const T = '2026-10-13T00:00:00.000Z'

describe('applyAnswer／錯題本規則', () => {
  it('答錯進錯題本，連續答對 2 次後移出', () => {
    let d = emptyData()
    d = applyAnswer(d, 5, 1, false, 'exam', T)
    expect(d.progress[5]).toMatchObject({ seen: 1, wrong: 1, inWrongBook: true, streak: 0 })
    d = applyAnswer(d, 5, 2, true, 'wrong', T)
    expect(d.progress[5].inWrongBook).toBe(true) // 只對 1 次，還要複習
    d = applyAnswer(d, 5, 2, true, 'wrong', T)
    expect(d.progress[5]).toMatchObject({ seen: 3, correct: 2, wrong: 1, inWrongBook: false })
  })

  it('移出前再答錯，連續次數歸零', () => {
    let d = emptyData()
    d = applyAnswer(d, 1, 1, false, 'exam', T)
    d = applyAnswer(d, 1, 1, true, 'exam', T)
    d = applyAnswer(d, 1, 1, false, 'exam', T)
    d = applyAnswer(d, 1, 1, true, 'exam', T)
    expect(d.progress[1].inWrongBook).toBe(true)
  })

  it('答對從未錯過的題目不會進錯題本', () => {
    const d = applyAnswer(emptyData(), 9, 3, true, 'practice', T)
    expect(d.progress[9].inWrongBook).toBe(false)
  })

  it('不修改傳入的資料、紀錄上限 HISTORY_LIMIT', () => {
    const d0 = emptyData()
    let d = d0
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) d = applyAnswer(d, 1, 1, true, 'practice', T)
    expect(d0.progress).toEqual({})
    expect(d.progress[1].history).toHaveLength(HISTORY_LIMIT)
    expect(d.progress[1].seen).toBe(HISTORY_LIMIT + 5)
  })
})

describe('addAttempt', () => {
  const mk = (i: number): Attempt => ({
    id: String(i), mode: 'exam', label: 'x', startedAt: T, finishedAt: T, total: 1, correct: 1, score: 100, answers: [],
  })
  it('超過上限時丟棄最舊的', () => {
    let d = emptyData()
    for (let i = 0; i < ATTEMPT_LIMIT + 3; i++) d = addAttempt(d, mk(i))
    expect(d.attempts).toHaveLength(ATTEMPT_LIMIT)
    expect(d.attempts[0].id).toBe('3')
  })
})

describe('parseAppData', () => {
  it('接受合法資料並補齊缺少的設定', () => {
    const r = parseAppData({ version: 1, attempts: [], progress: {} })
    expect(r?.settings.examCount).toBeGreaterThan(0)
  })
  it('拒絕壞資料', () => {
    expect(parseAppData(null)).toBeNull()
    expect(parseAppData({ version: 2, attempts: [], progress: {} })).toBeNull()
    expect(parseAppData({ version: 1, attempts: {}, progress: {} })).toBeNull()
    expect(parseAppData('x')).toBeNull()
  })
})
