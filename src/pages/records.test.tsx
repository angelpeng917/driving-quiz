import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { buildBackup } from '../lib/backup'
import { addAttempt, applyAnswer, emptyData, getData, resetCache, setData } from '../lib/storage'

const T = '2026-10-10T08:00:00.000Z'
const go = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

function seed() {
  let d = emptyData()
  d = applyAnswer(d, 1, 1, false, 'exam', T) // 答案是 2，選 1 → 錯
  d = applyAnswer(d, 2, 1, true, 'practice', T)
  d = addAttempt(d, {
    id: 'a1', mode: 'exam', label: '模擬考（2 題）', startedAt: T, finishedAt: T, total: 2, correct: 1, score: 50, passed: false,
    answers: [{ qid: 1, chosen: 1, correct: false }, { qid: 2, chosen: 1, correct: true }],
  })
  setData(d)
}

beforeEach(() => {
  cleanup()
  localStorage.clear()
  resetCache()
})

describe('儀表板', () => {
  it('顯示答題數、正確率、待複習題數、分類正確率', () => {
    seed()
    go('/')
    expect(screen.getByText('累計答題數').nextSibling).toHaveTextContent('2')
    expect(screen.getByText('整體正確率').nextSibling).toHaveTextContent('50%')
    expect(screen.getByText('要再練的錯題').nextSibling).toHaveTextContent('1 題')
    expect(screen.getAllByRole('img', { name: /正確率/ })).toHaveLength(10)
  })

  it('沒有資料時顯示歡迎卡、不顯示 NaN', () => {
    go('/')
    expect(document.body.textContent).not.toMatch(/NaN/)
    expect(screen.getByText('第一次來嗎？')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '開始第一次練習' })).toBeInTheDocument()
  })
})

describe('錯題本與歷史', () => {
  it('錯題本列出答錯的題目並可展開答題紀錄、移出', async () => {
    seed()
    const user = userEvent.setup()
    go('/wrong')
    expect(screen.getByText(/題號 1・/)).toBeInTheDocument()
    expect(screen.queryByText(/題號 2・/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '看我以前怎麼答的' }))
    expect(screen.getByText('✗ 答錯')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '這題我會了，移出' }))
    expect(getData().progress[1].inWrongBook).toBe(false)
    expect(screen.getByText(/🎉/)).toBeInTheDocument()
  })

  it('歷史清單與詳情（作答內容與對錯）', async () => {
    seed()
    const user = userEvent.setup()
    go('/history')
    await user.click(screen.getByText('模擬考（2 題）'))
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByText(/50 分・未及格/)).toBeInTheDocument()
    expect(screen.getByText('✗ 你的答案')).toBeInTheDocument()
  })
})

describe('備份匯入', () => {
  it('匯入合法備份後可覆蓋；壞檔案顯示錯誤', async () => {
    const user = userEvent.setup()
    seed()
    const text = buildBackup(getData())
    setData(emptyData())
    go('/backup')
    const input = document.querySelector('input[type=file]') as HTMLInputElement

    await user.upload(input, new File(['hello'], 'bad.json', { type: 'application/json' }))
    expect(await screen.findByText(/不是有效的 JSON/)).toBeInTheDocument()

    await user.upload(input, new File([text], 'ok.json', { type: 'application/json' }))
    expect(await screen.findByText(/1 筆測驗歷史、2 題作答進度/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '只用檔案裡的紀錄（會蓋掉現在的）' }))
    expect(getData().attempts).toHaveLength(1)
    expect(getData().progress[1].wrong).toBe(1)
  })

  it('清除所有紀錄需二次確認', async () => {
    seed()
    const user = userEvent.setup()
    go('/backup')
    await user.click(screen.getByRole('button', { name: '刪除…' }))
    expect(getData().attempts).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: '確定刪除' }))
    expect(getData().attempts).toHaveLength(0)
  })
})
