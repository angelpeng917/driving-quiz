import { useMemo, useState } from 'react'
import QuestionView from '../components/QuestionView'
import QuizRunner from '../components/QuizRunner'
import TipsBlock from '../components/TipsBlock'
import { CHEER, pick } from '../lib/cheer'
import { shuffle } from '../lib/exam'
import { getQuestion, shortCategory } from '../lib/questions'
import { wrongQuestionIds } from '../lib/stats'
import { update, useAppData } from '../lib/storage'
import type { Question } from '../types'

const fmt = (iso: string) => new Date(iso).toLocaleString('zh-TW', { hour12: false, dateStyle: 'short', timeStyle: 'short' })
const MODE_LABEL = { exam: '模擬考', practice: '分類練習', numeric: '數字題', wrong: '錯題重練' } as const

export default function WrongPage() {
  const data = useAppData()
  const [includeMastered, setIncludeMastered] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const [session, setSession] = useState<Question[] | null>(null)

  const ids = useMemo(() => wrongQuestionIds(data, includeMastered), [data, includeMastered])
  const questions = ids.map((id) => getQuestion(id)!).filter(Boolean)

  if (session) return <QuizRunner questions={session} mode="wrong" label="錯題重練" onExit={() => setSession(null)} extra={(q) => <TipsBlock qid={q.id} />} />

  const dismiss = (id: number) =>
    update((d) => ({ ...d, progress: { ...d.progress, [id]: { ...d.progress[id], inWrongBook: false } } }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">錯題本</h1>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeMastered} onChange={(e) => setIncludeMastered(e.target.checked)} />
          也顯示已經答熟的題目
        </label>
      </div>
      <p className="text-sm text-slate-600">在練習或模擬考答錯的題目，會自動收在這裡。再做的時候連續答對 2 次，就算「答熟」，會自動移出。</p>

      {questions.length === 0 ? (
        <div className="card text-center text-slate-500">
          {includeMastered ? '還沒有答錯過的題目。' : `${pick(CHEER.wrongBookEmpty)} 🎉`}
        </div>
      ) : (
        <>
          <button className="btn-primary" onClick={() => setSession(shuffle(questions.filter((q) => data.progress[q.id].inWrongBook)))}
            disabled={!questions.some((q) => data.progress[q.id].inWrongBook)}>
            重練要再練的錯題（{questions.filter((q) => data.progress[q.id].inWrongBook).length} 題）
          </button>
          <ul className="space-y-3">
            {questions.map((q) => {
              const p = data.progress[q.id]
              const isOpen = open === q.id
              return (
                <li key={q.id} className="card">
                  <QuestionView
                    q={q}
                    reveal
                    chosen={p.history.filter((h) => !h.correct).at(-1)?.chosen}
                    extra={
                      <>
                        <p className="mt-2 text-xs text-slate-600">
                          答 {p.seen} 次、錯 {p.wrong} 次・{p.inWrongBook ? <b className="text-rose-700">要再練</b> : <b className="text-emerald-700">已經答熟</b>}
                          ・{shortCategory(q.category)}
                        </p>
                        <TipsBlock qid={q.id} />
                      </>
                    }
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn-ghost !py-1.5" onClick={() => setOpen(isOpen ? null : q.id)}>
                      {isOpen ? '收起答題紀錄' : '看我以前怎麼答的'}
                    </button>
                    {p.inWrongBook && (
                      <button className="btn-ghost !py-1.5" onClick={() => dismiss(q.id)}>
                        這題我會了，移出
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <ol className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
                      {p.history.slice().reverse().map((h, i) => (
                        <li key={i} className="flex flex-wrap gap-x-3">
                          <span className="text-slate-500">{fmt(h.at)}</span>
                          <span>{MODE_LABEL[h.mode]}</span>
                          <span>選 {h.chosen}</span>
                          <span className={h.correct ? 'text-emerald-700' : 'text-rose-700'}>{h.correct ? '✓ 答對' : '✗ 答錯'}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
