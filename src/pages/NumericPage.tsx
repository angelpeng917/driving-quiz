import { useMemo, useState } from 'react'
import { renderHighlighted } from '../components/Highlighted'
import QuizRunner from '../components/QuizRunner'
import SegmentTabs from '../components/SegmentTabs'
import TipsBlock from '../components/TipsBlock'
import { shuffle } from '../lib/exam'
import { NUMERIC_TAGS, numericQuestions, type NumericTag } from '../lib/numeric'
import { useAppData } from '../lib/storage'
import type { Question } from '../types'
import { PRACTICE_TABS } from './PracticePage'

type Scope = 'all' | 'unseen' | 'wrong'

export default function NumericPage() {
  const data = useAppData()
  const [tag, setTag] = useState<NumericTag | ''>('')
  const [scope, setScope] = useState<Scope>('all')
  const [highlight, setHighlight] = useState(true)
  const [tips, setTips] = useState(true)
  const [session, setSession] = useState<{ questions: Question[]; label: string } | null>(null)

  const pool = useMemo(
    () =>
      numericQuestions(tag || undefined).filter((q) => {
        const p = data.progress[q.id]
        if (scope === 'unseen') return !p
        if (scope === 'wrong') return !!p && p.wrong > 0
        return true
      }),
    [tag, scope, data.progress],
  )

  if (session)
    return (
      <QuizRunner
        questions={session.questions}
        mode="numeric"
        label={session.label}
        onExit={() => setSession(null)}
        renderText={highlight ? renderHighlighted : undefined}
        extra={tips ? (q) => <TipsBlock qid={q.id} /> : undefined}
      />
    )

  const label = tag ? NUMERIC_TAGS.find((t) => t.tag === tag)!.label : '全部'
  return (
    <div className="space-y-4">
      <SegmentTabs tabs={PRACTICE_TABS} />
      <div className="card space-y-4">
        <p className="text-sm text-slate-600">
          罰款金額、速度、距離、時間這些數字最容易記錯。這裡專門練有數字的題目，數字會用黃色標出來，作答後還有記憶提示。
        </p>
        <div>
          <p className="mb-2 text-sm font-medium">想練哪一種數字</p>
          <div className="flex flex-wrap gap-2">
            {[{ tag: '' as const, label: '全部', hint: '' }, ...NUMERIC_TAGS].map((t) => (
              <button key={t.tag} className={tag === t.tag ? 'btn-primary' : 'btn-ghost'} onClick={() => setTag(t.tag)} title={t.hint}>
                {t.label}（{numericQuestions(t.tag || undefined).length}）
              </button>
            ))}
          </div>
          {tag && <p className="mt-1 text-xs text-slate-500">{NUMERIC_TAGS.find((t) => t.tag === tag)!.hint}</p>}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">要練哪些題</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', '全部題目'],
                ['unseen', '還沒做過的'],
                ['wrong', '以前答錯過的'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} className={scope === v ? 'btn-primary' : 'btn-ghost'} onClick={() => setScope(v)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />
            用顏色標出數字和重點字
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={tips} onChange={(e) => setTips(e.target.checked)} />
            作答後顯示記憶提示
          </label>
        </div>
        <button
          className="btn-primary w-full sm:w-auto"
          disabled={pool.length === 0}
          onClick={() => setSession({ questions: shuffle(pool), label: `數字題特訓：${label}` })}
        >
          {pool.length === 0 ? '沒有符合的題目' : `開始特訓（${pool.length} 題）`}
        </button>
      </div>
    </div>
  )
}
