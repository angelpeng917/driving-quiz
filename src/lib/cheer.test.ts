import { CHEER, finishCheer, pick, streakCheer } from './cheer'

describe('鼓勵詞', () => {
  it('pick 依亂數取出池中的一句', () => {
    expect(pick(['a', 'b', 'c'], () => 0)).toBe('a')
    expect(pick(['a', 'b', 'c'], () => 0.99)).toBe('c')
  })
  it('連續答對只在 3、5、10 題給鼓勵', () => {
    expect([1, 2, 3, 4, 5, 6, 10].map(streakCheer).map(Boolean)).toEqual([false, false, true, false, true, false, true])
  })
  it('完成練習依答對率分檔', () => {
    expect(CHEER.finishHigh).toContain(finishCheer(9, 10, () => 0))
    expect(CHEER.finishMid).toContain(finishCheer(6, 10, () => 0))
    expect(CHEER.finishLow).toContain(finishCheer(2, 10, () => 0))
    expect(finishCheer(0, 0)).toBe('')
  })
  it('未及格的文案要明說還沒及格，且不含「恭喜」', () => {
    for (const t of CHEER.examFail) {
      expect(t).not.toMatch(/恭喜|及格了|成績及格/)
      expect(t).toMatch(/還沒|還差/)
    }
  })
})
