import { useState, type ReactNode } from 'react'
import { getQuestion } from '../lib/questions'
import type { AnswerRecord } from '../types'
import QuestionView from './QuestionView'

interface Props {
  answers: AnswerRecord[]
  renderText?: (text: string) => ReactNode
  extra?: (qid: number) => ReactNode
}

/** 逐題檢討：可只看答錯或沒作答的的題目 */
export default function AttemptReview({ answers, renderText, extra }: Props) {
  const [onlyWrong, setOnlyWrong] = useState(true)
  const shown = answers.filter((a) => !onlyWrong || !a.correct)
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">逐題檢討（{shown.length} 題）</h3>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} />
          只看答錯或沒作答的
        </label>
      </div>
      {shown.length === 0 && <p className="card text-center text-slate-600">全部都答對了，太棒了 🎉</p>}
      <div className="space-y-3">
        {shown.map((a) => {
          const q = getQuestion(a.qid)
          if (!q) return null
          return (
            <div key={a.qid} className="card">
              <QuestionView q={q} chosen={a.chosen} reveal renderText={renderText} extra={extra?.(a.qid)} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
