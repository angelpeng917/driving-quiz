import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ExamPage from './ExamPage'
import PracticePage from './PracticePage'
import { getQuestion } from '../lib/questions'
import { getData, resetCache, STORAGE_KEY } from '../lib/storage'
import { loadDraft } from '../lib/examDraft'

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)
const options = () => screen.getAllByRole('button', { pressed: false })

beforeEach(() => {
  cleanup()
  localStorage.clear()
  resetCache()
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 1, attempts: [], progress: {}, settings: { examCount: 4, passScore: 75 } }),
  )
  resetCache()
})

describe('模擬考流程', () => {
  it('抽題 → 作答 → 交卷 → 計分並寫入歷史與錯題本', async () => {
    const user = userEvent.setup()
    wrap(<ExamPage />)
    await user.click(screen.getByRole('button', { name: '開始模擬考' }))

    const draft = loadDraft()!
    expect(draft.ids).toHaveLength(4)

    // 前 3 題答對，第 4 題故意答錯
    for (let i = 0; i < 4; i++) {
      const q = getQuestion(draft.ids[i])!
      const pick = i < 3 ? q.answer : ((q.answer % 3) + 1)
      await user.click(options()[pick - 1])
      if (i < 3) await user.click(screen.getByRole('button', { name: '下一題' }))
    }
    await user.click(screen.getByRole('button', { name: '交卷' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '交卷看成績' }))

    expect(await screen.findByText('75 分')).toBeInTheDocument()
    expect(screen.getByText(/✅ 及格/)).toBeInTheDocument()

    const d = getData()
    expect(d.attempts).toHaveLength(1)
    expect(d.attempts[0]).toMatchObject({ mode: 'exam', total: 4, correct: 3, score: 75, passed: true })
    const wrongId = draft.ids[3]
    expect(d.progress[wrongId].inWrongBook).toBe(true)
    expect(loadDraft()).toBeNull()
  })

  it('未作答視為答錯，且不進錯題本', async () => {
    const user = userEvent.setup()
    wrap(<ExamPage />)
    await user.click(screen.getByRole('button', { name: '開始模擬考' }))
    await user.click(screen.getByRole('button', { name: '交卷' }))
    expect(screen.getByText(/還有 4 題沒作答/)).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '交卷看成績' }))
    expect(await screen.findByText('0 分')).toBeInTheDocument()
    expect(getData().attempts[0].answers.every((a) => a.chosen === null)).toBe(true)
    expect(Object.keys(getData().progress)).toHaveLength(0)
  })

  it('重新整理後可從草稿繼續', async () => {
    const user = userEvent.setup()
    const first = wrap(<ExamPage />)
    await user.click(screen.getByRole('button', { name: '開始模擬考' }))
    await user.click(options()[0])
    const saved = loadDraft()!
    first.unmount()
    wrap(<ExamPage />)
    expect(screen.getByText(/你上次的模擬考還沒考完（已答 1 \/ 共 4 題）/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '繼續上次的考卷' }))
    expect(screen.getByText(/第 1 \/ 4 題（已答 1）/)).toBeInTheDocument()
    expect(loadDraft()!.ids).toEqual(saved.ids)
  })
})

describe('分類練習流程', () => {
  it('答錯立即顯示正解並進錯題本，結束後存歷史', async () => {
    const user = userEvent.setup()
    wrap(<PracticePage />)
    await user.click(screen.getByRole('button', { name: /^轉彎/ }))
    await user.click(screen.getByRole('button', { name: '照題號順序' }))
    await user.click(screen.getByRole('button', { name: /開始練習（53 題）/ }))

    const q = getQuestion(570)!
    expect(screen.getByText(/第 1 \/ 53 題/)).toBeInTheDocument()
    await user.click(options()[(q.answer % 3)]) // 故意選錯
    expect(screen.getByText('✗ 你的答案')).toBeInTheDocument()
    expect(screen.getByText('✓ 正確答案')).toBeInTheDocument()
    expect(getData().progress[570].inWrongBook).toBe(true)

    // 作答後出現對錯橫幅與鼓勵詞
    expect(screen.getByRole('status')).toHaveTextContent('答錯了，正確答案是')
    await user.click(screen.getByRole('button', { name: '結束練習' }))
    await user.click(screen.getByRole('button', { name: '結束並看結果' }))
    expect(getData().attempts).toHaveLength(1)
    expect(getData().attempts[0]).toMatchObject({ mode: 'practice', total: 1, correct: 0 })
  })
})
