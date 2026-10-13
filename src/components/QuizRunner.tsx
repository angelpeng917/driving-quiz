import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import AttemptReview from './AttemptReview'
import QuestionView from './QuestionView'
import { CHEER, finishCheer, pick, streakCheer } from '../lib/cheer'
import { addAttempt, applyAnswer, getData, newId, update } from '../lib/storage'
import type { AnswerRecord, Attempt, Choice, Mode, Question } from '../types'

interface Props {
  questions: Question[]
  mode: Mode
  label: string
  onExit: () => void
  renderText?: (text: string) => ReactNode
  extra?: (q: Question) => ReactNode
}

interface Feedback {
  correct: boolean
  cheer: string
  note?: string
}

const MARKS = ['①', '②', '③']

/**
 * 逐題作答、立即顯示對錯（分類練習／數字題／錯題重練共用）。
 * 每答一題就寫入作答進度（錯題本即時更新）；離開或做完時存一筆測驗歷史。
 */
export default function QuizRunner({ questions, mode, label, onExit, renderText, extra }: Props) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, Choice>>({})
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({})
  const [done, setDone] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const startedAt = useRef(new Date().toISOString())
  const saved = useRef(false)
  const latest = useRef(answers)
  latest.current = answers
  const streak = useRef(0)

  const q = questions[index]
  const answered = q ? answers[q.id] : undefined
  const fb = q ? feedback[q.id] : undefined

  const records = useCallback(
    (): AnswerRecord[] =>
      questions
        .filter((x) => latest.current[x.id] !== undefined)
        .map((x) => ({ qid: x.id, chosen: latest.current[x.id], correct: latest.current[x.id] === x.answer })),
    [questions],
  )

  const saveAttempt = useCallback(() => {
    if (saved.current) return
    const recs = records()
    if (recs.length === 0) return
    saved.current = true
    const correct = recs.filter((r) => r.correct).length
    const attempt: Attempt = {
      id: newId(),
      mode,
      label,
      startedAt: startedAt.current,
      finishedAt: new Date().toISOString(),
      total: recs.length,
      correct,
      score: Math.round((correct / recs.length) * 100),
      answers: recs,
    }
    update((d) => addAttempt(d, attempt))
  }, [records, mode, label])

  // 中途切換頁面也保留已作答的紀錄
  useEffect(() => saveAttempt, [saveAttempt])

  const choose = useCallback(
    (c: Choice) => {
      if (!q || latest.current[q.id] !== undefined) return
      const correct = c === q.answer
      const wasInBook = !!getData().progress[q.id]?.inWrongBook
      setAnswers((a) => ({ ...a, [q.id]: c }))
      const at = new Date().toISOString()
      update((d) => applyAnswer(d, q.id, c, correct, mode, at))
      const nowInBook = !!getData().progress[q.id]?.inWrongBook

      streak.current = correct ? streak.current + 1 : 0
      let f: Feedback
      if (!correct) f = { correct, cheer: pick(CHEER.wrong), note: '這題已經放進錯題本，之後可以再練。' }
      else if (wasInBook && !nowInBook) f = { correct, cheer: pick(CHEER.mastered), note: '已移出錯題本。' }
      else f = { correct, cheer: streakCheer(streak.current) ?? pick(CHEER.correct) }
      setFeedback((m) => ({ ...m, [q.id]: f }))
    },
    [q, mode],
  )

  const next = useCallback(() => {
    if (index + 1 >= questions.length) {
      saveAttempt()
      setDone(true)
    } else {
      setIndex((i) => i + 1)
      window.scrollTo?.({ top: 0 })
    }
  }, [index, questions.length, saveAttempt])

  // 桌機鍵盤：1/2/3 作答，Enter／→ 下一題
  useEffect(() => {
    if (done) return
    const onKey = (e: KeyboardEvent) => {
      if (confirmEnd) return
      if (e.key === '1' || e.key === '2' || e.key === '3') choose(Number(e.key) as Choice)
      else if ((e.key === 'Enter' || e.key === 'ArrowRight') && q && latest.current[q.id] !== undefined) next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choose, next, done, q, confirmEnd])

  if (done) {
    const recs = records()
    const correct = recs.filter((r) => r.correct).length
    const wrong = recs.length - correct
    return (
      <div className="space-y-4">
        <div className="card text-center">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="my-2 text-4xl font-bold text-indigo-700">
            {correct} / {recs.length}
          </p>
          <p className="text-slate-600">答對率 {recs.length ? Math.round((correct / recs.length) * 100) : 0}%</p>
          <p className="mt-2 font-medium text-emerald-700">{finishCheer(correct, recs.length)}</p>
          {wrong > 0 && <p className="mt-1 text-sm text-slate-600">答錯的 {wrong} 題已放進錯題本，可以之後再練。</p>}
          <button className="btn-primary mt-4" onClick={onExit}>
            回到選單
          </button>
        </div>
        <AttemptReview answers={recs} renderText={renderText} extra={extra && ((id) => extra(questions.find((x) => x.id === id)!))} />
      </div>
    )
  }

  if (!q) return <p className="card">沒有題目。</p>
  const doneCount = Object.keys(answers).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          {label}・第 {index + 1} / {questions.length} 題
        </span>
        <button className="btn-ghost !min-h-11 !px-3 !py-1.5" onClick={() => setConfirmEnd(true)}>
          結束練習
        </button>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-slate-200">
        <div className="h-full bg-indigo-500 transition-all" style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>

      {confirmEnd && (
        <div role="alertdialog" className="card space-y-2 border-indigo-300 bg-indigo-50 text-sm">
          <p className="font-medium">
            {doneCount > 0 ? `要結束練習嗎？已經做的 ${doneCount} 題都會幫你記下來。` : '還沒作答，要回到選單嗎？'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => setConfirmEnd(false)}>
              繼續練習
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                saveAttempt()
                if (doneCount > 0) setDone(true)
                else onExit()
              }}
            >
              {doneCount > 0 ? '結束並看結果' : '回到選單'}
            </button>
          </div>
        </div>
      )}

      {fb && (
        <div
          role="status"
          className={`rounded-xl border-2 p-3 ${fb.correct ? 'border-emerald-400 bg-emerald-50' : 'border-amber-400 bg-amber-50'}`}
        >
          <p className={`text-lg font-bold ${fb.correct ? 'text-emerald-700' : 'text-amber-800'}`}>
            {fb.correct ? '✅ 答對了！' : `❌ 答錯了，正確答案是 ${MARKS[q.answer - 1]}`}
          </p>
          <p className="text-sm text-slate-700">{fb.cheer}</p>
          {fb.note && <p className="mt-0.5 text-xs text-slate-500">{fb.note}</p>}
        </div>
      )}

      <div className="card">
        <QuestionView
          key={q.id}
          q={q}
          chosen={answered}
          reveal={answered !== undefined}
          onChoose={choose}
          renderText={renderText}
          extra={extra?.(q)}
        />
      </div>

      {answered === undefined && <p className="text-center text-sm text-slate-500">先點選一個答案，就會馬上告訴你對不對。</p>}

      <div className="sticky bottom-16 z-[5] flex justify-between bg-slate-50/95 py-2 sm:bottom-0">
        <button className="btn-ghost !min-h-12" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          上一題
        </button>
        <button className="btn-primary !min-h-12 !px-8" disabled={answered === undefined} onClick={next}>
          {index + 1 >= questions.length ? '完成' : '下一題'}
        </button>
      </div>
    </div>
  )
}
