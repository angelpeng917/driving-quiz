import { useMemo, useState } from 'react'
import QuizRunner from '../components/QuizRunner'
import SegmentTabs from '../components/SegmentTabs'
import { shuffle } from '../lib/exam'
import { CATEGORIES, QUESTIONS, shortCategory } from '../lib/questions'
import { useAppData } from '../lib/storage'
import type { Question } from '../types'

export const PRACTICE_TABS = [
  { to: '/practice', label: '照分類練習' },
  { to: '/numeric', label: '專攻數字題' },
  { to: '/tips', label: '記憶口訣' },
]

type Scope = 'all' | 'unseen' | 'wrong'
type Order = 'random' | 'sequential'

const SCOPES: { v: Scope; label: string }[] = [
  { v: 'all', label: '全部題目' },
  { v: 'unseen', label: '還沒做過的' },
  { v: 'wrong', label: '以前答錯過的' },
]

export default function PracticePage() {
  const data = useAppData()
  const [category, setCategory] = useState<string>('') // '' = 全部
  const [scope, setScope] = useState<Scope>('all')
  const [order, setOrder] = useState<Order>('random')
  const [session, setSession] = useState<{ questions: Question[]; label: string } | null>(null)

  const pool = useMemo(
    () =>
      QUESTIONS.filter((q) => {
        if (category && q.category !== category) return false
        const p = data.progress[q.id]
        if (scope === 'unseen') return !p
        if (scope === 'wrong') return !!p && p.wrong > 0
        return true
      }),
    [category, scope, data.progress],
  )

  if (session) return <QuizRunner questions={session.questions} mode="practice" label={session.label} onExit={() => setSession(null)} />

  const start = () =>
    setSession({
      questions: order === 'random' ? shuffle(pool) : pool,
      label: `分類練習：${category ? shortCategory(category) : '全部分類'}`,
    })

  const count = (c: string) => QUESTIONS.filter((q) => !c || q.category === c).length

  return (
    <div className="space-y-4">
      <SegmentTabs tabs={PRACTICE_TABS} />
      <div className="card space-y-4">
        <p className="text-sm text-slate-600">不用調整也可以直接按最下面的「開始練習」。每答一題，馬上告訴你對不對。</p>
        <div>
          <p className="mb-2 text-sm font-medium">選分類</p>
          <div className="flex flex-wrap gap-2">
            {['', ...CATEGORIES].map((c) => (
              <button key={c || 'all'} className={category === c ? 'btn-primary' : 'btn-ghost'} onClick={() => setCategory(c)}>
                {c ? shortCategory(c) : '全部'}（{count(c)}）
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">要練哪些題</p>
          <div className="flex flex-wrap gap-2">
            {SCOPES.map((s) => (
              <button key={s.v} className={scope === s.v ? 'btn-primary' : 'btn-ghost'} onClick={() => setScope(s.v)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">出題順序</p>
          <div className="flex gap-2">
            <button className={order === 'random' ? 'btn-primary' : 'btn-ghost'} onClick={() => setOrder('random')}>
              隨機
            </button>
            <button className={order === 'sequential' ? 'btn-primary' : 'btn-ghost'} onClick={() => setOrder('sequential')}>
              照題號順序
            </button>
          </div>
        </div>
        <button className="btn-primary w-full sm:w-auto" disabled={pool.length === 0} onClick={start}>
          {pool.length === 0 ? '沒有符合的題目' : `開始練習（${pool.length} 題）`}
        </button>
      </div>
    </div>
  )
}
