import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { renderHighlighted } from '../components/Highlighted'
import QuizRunner from '../components/QuizRunner'
import TipsBlock from '../components/TipsBlock'
import App from '../App'
import { getQuestion } from '../lib/questions'
import { getData, resetCache } from '../lib/storage'

beforeEach(() => {
  cleanup()
  localStorage.clear()
  resetCache()
})

describe('數字題特訓', () => {
  it('作答後高亮數字與關鍵字，並顯示題庫核對過的記憶提示', async () => {
    const user = userEvent.setup()
    const q = getQuestion(338)! // 臨時停車停止時間：未滿 3 分鐘
    render(
      <MemoryRouter>
        <QuizRunner questions={[q]} mode="numeric" label="t" onExit={() => {}} renderText={renderHighlighted} extra={(x) => <TipsBlock qid={x.id} />} />
      </MemoryRouter>,
    )
    const marks = document.querySelectorAll('mark')
    expect(marks.length).toBeGreaterThan(0)
    expect([...marks].some((m) => m.textContent?.includes('3分鐘'))).toBe(true)
    expect(screen.queryByText(/記憶提示/)).not.toBeInTheDocument() // 作答前不顯示提示

    await user.click(screen.getAllByRole('button', { pressed: false })[q.answer - 1])
    expect(screen.getByText(/記憶提示：行車與停車的時間數字/)).toBeInTheDocument()
    expect(screen.getByText(/口訣是記憶輔助，不是法條原文/)).toBeInTheDocument()
    expect(getData().progress[338].correct).toBe(1)
  })

  it('數字題特訓頁：選類型、開始，進度寫入 numeric 模式', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/numeric']}>
        <App />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: /^速度/ }))
    await user.click(screen.getByRole('button', { name: /開始特訓/ }))
    expect(screen.getByText(/數字題特訓：速度・第 1 \//)).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { pressed: false })[0])
    const [qid] = Object.keys(getData().progress)
    expect(getData().progress[qid].history[0].mode).toBe('numeric')
  })

  it('口訣頁列出所有群組，且可依類型篩選', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/tips']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: '酒駕：罰鍰與處分' })).toBeInTheDocument()
    expect(screen.getByText(/題庫內酒精濃度標準不一致/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '速度' }))
    expect(screen.queryByRole('heading', { name: '酒駕：罰鍰與處分' })).not.toBeInTheDocument()
    expect(within(document.body).getByRole('heading', { name: '速限與車速' })).toBeInTheDocument()
  })
})
