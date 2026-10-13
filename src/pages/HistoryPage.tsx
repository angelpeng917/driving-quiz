import { Link, useParams } from 'react-router-dom'
import AttemptReview from '../components/AttemptReview'
import SegmentTabs from '../components/SegmentTabs'
import { useAppData } from '../lib/storage'
import type { Attempt } from '../types'

export const fmtDate = (iso: string) => new Date(iso).toLocaleString('zh-TW', { hour12: false, dateStyle: 'medium', timeStyle: 'short' })

export const RECORD_TABS = [
  { to: '/history', label: '成績紀錄' },
  { to: '/backup', label: '備份與還原' },
]

export default function HistoryPage() {
  const { id } = useParams()
  const data = useAppData()
  if (id) return <AttemptDetail attempt={data.attempts.find((a) => a.id === id)} />

  const list = data.attempts.slice().reverse()
  return (
    <div>
      <SegmentTabs tabs={RECORD_TABS} />
      {list.length === 0 ? (
        <div className="card space-y-3 text-center text-slate-600">
          <p>還沒有成績紀錄。做完一次練習或模擬考，成績就會出現在這裡。</p>
          <Link to="/practice" className="btn-primary">去練習</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((a) => (
            <li key={a.id}>
              <Link to={`/history/${a.id}`} className="card flex items-center justify-between gap-3 hover:border-indigo-400">
                <div>
                  <p className="font-medium">{a.label}</p>
                  <p className="text-xs text-slate-500">{fmtDate(a.finishedAt)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${a.passed === undefined ? 'text-slate-800' : a.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {a.mode === 'exam' ? `${a.score} 分` : `答對 ${a.correct} 題`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.mode === 'exam' ? (a.passed ? '及格' : '未及格') : `共 ${a.total} 題・答對率 ${a.score}%`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AttemptDetail({ attempt }: { attempt?: Attempt }) {
  if (!attempt)
    return (
      <div className="card">
        找不到這筆紀錄。<Link className="text-indigo-700 underline" to="/history">回到歷史</Link>
      </div>
    )
  return (
    <div className="space-y-4">
      <Link className="text-sm text-indigo-700" to="/history">
        ← 測驗歷史
      </Link>
      <div className="card text-center">
        <p className="text-sm text-slate-500">
          {attempt.label}・{fmtDate(attempt.finishedAt)}
        </p>
        <p className="my-2 text-4xl font-bold text-indigo-700">
          {attempt.correct} / {attempt.total}
        </p>
        <p className="text-slate-600">
          {attempt.mode === 'exam' ? `${attempt.score} 分・${attempt.passed ? '及格' : '未及格'}` : `答對率 ${attempt.score}%`}
        </p>
      </div>
      <AttemptReview answers={attempt.answers} />
    </div>
  )
}
