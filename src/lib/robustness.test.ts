import { grade } from './exam'
import { loadDraft } from './examDraft'
import { getData, parseAppData, resetCache, STORAGE_KEY } from './storage'
import { overallStats } from './stats'
import { getQuestion } from './questions'

describe('壞資料不會讓頁面崩潰', () => {
  it('parseAppData 丟掉壞項目、補齊缺少欄位，統計與歷史可安全使用', () => {
    const d = parseAppData({
      version: 1,
      attempts: [{ id: 'a', mode: 'exam' }, { id: 'ok', answers: [{ qid: 1, chosen: 2, correct: true }, { qid: 'x' }] }, null, 5],
      progress: { '12': null, '13': { inWrongBook: true }, abc: { seen: 1 }, '14': { seen: -3, history: 'oops' } },
      settings: { examCount: 0, passScore: 999 },
    })!
    // 'a' 缺 answers 被丟掉；'ok' 保留，且壞的作答（qid 不是數字）被濾掉
    expect(d.attempts.map((a) => a.id)).toEqual(['ok'])
    expect(d.attempts[0].answers).toEqual([{ qid: 1, chosen: 2, correct: true }])
    expect(d.settings).toEqual({ examCount: 1, passScore: 100 })
    expect(Object.keys(d.progress).sort()).toEqual(['13', '14'])
    expect(d.progress['13'].history).toEqual([])
    expect(d.progress['14']).toMatchObject({ seen: 0, history: [] })
    expect(() => overallStats(d)).not.toThrow()
  })

  it('損毀的 localStorage 會先備份原始內容再重新開始', () => {
    localStorage.clear()
    localStorage.setItem(STORAGE_KEY, '{壞掉的json')
    resetCache()
    expect(getData().attempts).toEqual([])
    expect(localStorage.getItem(STORAGE_KEY + ':corrupt')).toBe('{壞掉的json')
  })
})

describe('模擬考草稿驗證', () => {
  it('過濾掉不在題庫的題號與非法答案；全部失效視為沒有草稿', () => {
    localStorage.setItem(
      'driving-quiz:exam-draft',
      JSON.stringify({ ids: [1, 99999, 'x', 2], chosen: { 1: 2, 99999: 1, 2: 7 }, startedAt: 't', index: 50 }),
    )
    expect(loadDraft()).toEqual({ ids: [1, 2], chosen: { 1: 2 }, startedAt: 't', index: 1 })
    localStorage.setItem('driving-quiz:exam-draft', JSON.stringify({ ids: [99999], chosen: {}, startedAt: 't' }))
    expect(loadDraft()).toBeNull()
  })
})

describe('及格判定', () => {
  it('不因四捨五入而誤判：59 題答對 50 題＝84.7% 不及格 85', () => {
    const qs = Array.from({ length: 59 }, (_, i) => getQuestion(i + 1)!)
    const chosen = Object.fromEntries(qs.slice(0, 50).map((q) => [q.id, q.answer]))
    const r = grade(qs, chosen, 85)
    expect(r.score).toBe(85) // 顯示用的四捨五入分數
    expect(r.passed).toBe(false)
  })
})
