import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuizRunner from '../components/QuizRunner'
import { getQuestion } from '../lib/questions'
import { resetCache } from '../lib/storage'

beforeEach(() => {
  cleanup()
  localStorage.clear()
  resetCache()
})

describe('作答鼓勵', () => {
  it('答對顯示稱讚；連續答對 3 題給特別鼓勵；答錯後連續歸零且不責備', async () => {
    const user = userEvent.setup()
    const qs = [1, 2, 3, 4].map((i) => getQuestion(i)!)
    render(<QuizRunner questions={qs} mode="practice" label="t" onExit={() => {}} />)
    const choose = (n: number) => user.click(screen.getAllByRole('button', { pressed: false })[n - 1])

    await choose(qs[0].answer)
    expect(screen.getByRole('status')).toHaveTextContent('✅ 答對了！')
    await user.click(screen.getByRole('button', { name: '下一題' }))
    await choose(qs[1].answer)
    await user.click(screen.getByRole('button', { name: '下一題' }))
    await choose(qs[2].answer)
    expect(screen.getByRole('status')).toHaveTextContent('已經連續答對 3 題了')
    await user.click(screen.getByRole('button', { name: '下一題' }))
    await choose((qs[3].answer % 3) + 1)
    const s = screen.getByRole('status')
    expect(s).toHaveTextContent('答錯了，正確答案是')
    expect(s).toHaveTextContent('已經放進錯題本')
    expect(s.textContent).not.toMatch(/笨|不用心|太差/)
  })

  it('完成後顯示依答對率的鼓勵，並說明錯題已收進錯題本', async () => {
    const user = userEvent.setup()
    const q = getQuestion(1)!
    render(<QuizRunner questions={[q]} mode="practice" label="t" onExit={() => {}} />)
    await user.click(screen.getAllByRole('button', { pressed: false })[(q.answer % 3)])
    await user.click(screen.getByRole('button', { name: '完成' }))
    expect(screen.getByText(/答錯的 1 題已放進錯題本/)).toBeInTheDocument()
  })
})
