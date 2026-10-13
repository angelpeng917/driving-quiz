import { getQuestion } from './questions'
import { highlightSegments, numericQuestions, numericTags, NUMERIC_TAGS } from './numeric'

const tags = (id: number) => numericTags(getQuestion(id)!)
const hl = (t: string) => highlightSegments(t).filter((s) => s.kind).map((s) => `${s.kind}:${s.text}`)

describe('數字題分類', () => {
  it('罰鍰／速度／距離／時間各抓到代表題', () => {
    expect(tags(11)).toContain('fine') // 3,000～6,000 罰鍰
    expect(tags(741)).toEqual(['speed']) // 無速限標誌：50 公里
    expect(tags(803)).toEqual(['distance']) // 路口 10 公尺內不得臨停
    expect(tags(338)).toEqual(['time']) // 臨時停車未滿 3 分鐘
    expect(tags(85)).toContain('other') // 酒精濃度 0.15 毫克
  })

  it('一題可同時屬於多類（距離＋速度）', () => {
    expect(tags(229)).toEqual(expect.arrayContaining(['speed', 'distance']))
  })

  it('「二分之一」不會被當成時間的「分」', () => {
    expect(tags(79)).not.toContain('time')
  })

  it('沒有數字的題目不算數字題', () => {
    expect(tags(1)).toEqual([])
    expect(tags(19)).toEqual([])
  })

  it('數字題總數與各類都有題目，且在合理範圍', () => {
    const n = numericQuestions().length
    expect(n).toBeGreaterThan(200)
    expect(n).toBeLessThan(400)
    for (const t of NUMERIC_TAGS) expect(numericQuestions(t.tag).length, t.label).toBeGreaterThan(20)
  })
})

describe('高亮', () => {
  it('標出數字＋單位與關鍵字，其餘文字保持原樣', () => {
    const text = '處新臺幣3,000元以上；6,000元以下罰鍰。'
    expect(hl(text)).toEqual(['num:3,000元以上', 'num:6,000元以下', 'kw:罰鍰'])
    expect(highlightSegments(text).map((s) => s.text).join('')).toBe(text)
  })

  it('範圍視為同一個數字片段', () => {
    expect(hl('罰鍰新臺幣600~1,800元')).toEqual(['kw:罰鍰', 'num:600~1,800元'])
    expect(hl('於車後5-30公尺處')).toEqual(['num:5-30公尺'])
  })

  it('支援中文數字與時速', () => {
    expect(hl('吊扣牌照二年')).toEqual(['kw:吊扣', 'num:二年'])
    expect(hl('時速不得超過50公里')).toEqual(['kw:時速', 'kw:不得', 'kw:超過', 'num:50公里'])
  })

  it('不含任何標記時回傳單一片段；空字串不報錯', () => {
    expect(highlightSegments('保持安全距離')).toEqual([{ text: '保持安全距離', kind: null }])
    expect(highlightSegments('')).toEqual([])
  })

  it('所有數字題重組後文字都和原文一致（不吃字）', () => {
    for (const q of numericQuestions())
      for (const t of [q.question, ...q.options])
        expect(highlightSegments(t).map((s) => s.text).join(''), `Q${q.id}`).toBe(t)
  })
})

describe('偵測與高亮的已知誤判修正', () => {
  const t = (id: number) => numericTags(getQuestion(id)!)
  it('「二次事故」「任一點」「喝一點」不算數字', () => {
    expect(t(894)).toEqual([])
    expect(t(896)).toEqual([])
    expect(t(68)).not.toContain('other')
    expect(hl('防止二次事故')).toEqual([])
    expect(hl('任一點不足1公釐')).toEqual(['kw:不足', 'num:1公釐'])
  })
  it('排氣量、座位數等單位也算數字題', () => {
    expect(t(223)).toContain('other')
    expect(t(218)).toContain('other')
  })
  it('「1萬5千至9萬元」整段高亮、mm 不留殘字', () => {
    expect(hl('處新臺幣1萬5千至9萬元罰鍰')).toEqual(['num:1萬5千至9萬元', 'kw:罰鍰'])
    expect(hl('低於1.6mm')).toEqual(['num:1.6mm'])
  })
})
