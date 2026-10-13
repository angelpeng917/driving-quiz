import type { Rng } from './exam'

/** 鼓勵詞：正面、不浮誇；答錯溫柔不責備；未及格要鼓勵但不能說成及格 */
export const CHEER = {
  correct: ['答對了，繼續保持。', '沒錯，這題你會了。', '答得很準。', '對囉，記得很清楚。', '這題穩了。'],
  streak: {
    3: '已經連續答對 3 題了，節奏很好。',
    5: '連續 5 題都對，記得很穩。',
    10: '連續答對 10 題，這個手感可以記住。',
  } as Record<number, string>,
  wrong: [
    '這題比較容易搞混，看一下正確答案，下次就記得了。',
    '沒關係，答錯的時候最容易學到東西。',
    '先把這題記起來，之後可以再練一次。',
    '很多人在這題都會選錯，看清楚答案就好。',
    '錯一次沒關係，下次遇到你就會了。',
  ],
  mastered: ['這題已經答熟了，錯題本又少一題。', '連續答對了，這題可以畢業了。', '做得好，這題不用再擔心了。'],
  finishHigh: ['這一輪答得很好，繼續保持。', '大部分都答對了，很穩。'],
  finishMid: ['有一半以上答對了，看看答錯的那幾題，下次會更好。', '已經有基礎了，再練幾次就更穩。'],
  finishLow: ['這一輪比較難，把答錯的題目看過一遍就很有幫助。', '剛開始練習本來就會錯比較多，慢慢來。'],
  examPass: ['恭喜，這次達到及格分數了。', '這次成績及格，準備得不錯。', '達到及格標準，辛苦了。'],
  examFail: [
    '這次還沒達到及格分數，不過已經知道哪些題目要加強了，這是很好的開始。',
    '分數還差一點才及格，答錯的題目已經放進錯題本，先從那裡練起。',
    '還沒到及格線，但每考一次就多熟悉一點，繼續練習會進步的。',
  ],
  wrongBookEmpty: ['目前沒有要再練的錯題，很棒。', '錯題本清空了，這段時間的努力有成果。', '可以去做一次模擬考，看看自己的實力。'],
  welcome: ['歡迎來練習。從一小段開始就好，不需要一次做完。', '不用緊張，答錯也沒關係，這裡不會有人看你的成績。', '每天練一點點，比一次做很多更有效。'],
} as const

export const pick = <T,>(pool: readonly T[], rng: Rng = Math.random): T => pool[Math.floor(rng() * pool.length)]

/** 連續答對達到 3、5、10 題時回傳對應鼓勵，其餘回傳 null */
export const streakCheer = (streak: number) => CHEER.streak[streak] ?? null

export function finishCheer(correct: number, total: number, rng: Rng = Math.random): string {
  if (total === 0) return ''
  const r = correct / total
  return pick(r >= 0.8 ? CHEER.finishHigh : r >= 0.5 ? CHEER.finishMid : CHEER.finishLow, rng)
}
