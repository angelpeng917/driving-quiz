import { Link } from 'react-router-dom'
import { categoryStats, overallStats, pct } from '../lib/stats'
import { shortCategory } from '../lib/questions'
import { useAppData } from '../lib/storage'
import { CHEER, pick } from '../lib/cheer'
import { useMemo } from 'react'
import { fmtDate } from './HistoryPage'

function Stat({ label, value, sub, to }: { label: string; value: string; sub?: string; to?: string }) {
  const body = (
    <>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </>
  )
  return to ? (
    <Link to={to} className="card block hover:border-indigo-400">
      {body}
    </Link>
  ) : (
    <div className="card">{body}</div>
  )
}

export default function HomePage() {
  const data = useAppData()
  const s = overallStats(data)
  const cats = categoryStats(data)
  const recent = data.attempts.slice(-3).reverse()
  const welcome = useMemo(() => pick(CHEER.welcome), [])

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">我的練習進度</h1>

      {s.answers === 0 ? (
        <section className="card space-y-3 border-indigo-200 bg-indigo-50">
          <h2 className="font-semibold">第一次來嗎？</h2>
          <p className="text-sm">{welcome}</p>
          <p className="text-sm">建議先從「練習」開始：一題一題做，做完馬上看答案。熟悉了再來考模擬考。</p>
          <Link to="/practice" className="btn-primary !min-h-12 w-full sm:w-auto">
            開始第一次練習
          </Link>
          <ul className="space-y-1 text-sm text-slate-700">
            <li>📚 <b>練習</b>：一題一題做，馬上看對不對</li>
            <li>📝 <b>模擬考</b>：像正式考試，交卷才看成績</li>
            <li>❌ <b>錯題本</b>：答錯的題目會自動收在這裡，之後再練</li>
          </ul>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="累計答題數" value={String(s.answers)} sub={`做過 ${s.distinctSeen} / ${s.totalQuestions} 題`} />
            <Stat label="整體正確率" value={pct(s.accuracy)} sub={`答對 ${s.correct} 次`} />
            <Stat label="要再練的錯題" value={`${s.toReview} 題`} sub="點進去重做" to="/wrong" />
            <Stat label="測驗次數" value={String(s.attempts)} sub="看成績紀錄" to="/history" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/practice" className="btn-primary !min-h-11">繼續練習</Link>
            <Link to="/exam" className="btn-ghost !min-h-11">模擬考</Link>
            {s.toReview > 0 && <Link to="/wrong" className="btn-ghost !min-h-11">練習錯題（{s.toReview}）</Link>}
          </div>
        </>
      )}

      <section className="card">
        <h2 className="mb-3 font-semibold">各分類的答對率</h2>
        <ul className="space-y-3">
          {cats.map((c) => (
            <li key={c.category}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{shortCategory(c.category)}</span>
                <span className="text-slate-600">
                  {pct(c.accuracy)}・做過 {c.distinctSeen}/{c.total}
                  {c.toReview > 0 && <span className="text-rose-700">・要再練 {c.toReview}</span>}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-slate-200" role="img" aria-label={`${shortCategory(c.category)} 正確率 ${pct(c.accuracy)}`}>
                <div
                  className={`h-full ${(c.accuracy ?? 0) >= 0.9 ? 'bg-emerald-500' : (c.accuracy ?? 0) >= 0.7 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.round((c.accuracy ?? 0) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {recent.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-semibold">最近測驗</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {recent.map((a) => (
              <li key={a.id}>
                <Link to={`/history/${a.id}`} className="flex justify-between py-2">
                  <span>
                    {a.label} <span className="text-xs text-slate-500">{fmtDate(a.finishedAt)}</span>
                  </span>
                  <b>{a.mode === 'exam' ? `${a.score} 分` : `${a.correct}/${a.total}`}</b>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-slate-500">
        你的紀錄只存在這支手機（或這台電腦）的瀏覽器裡，換裝置或清除瀏覽資料就會不見。可以到「成績與備份 → 備份」先存起來。題庫來源：交通部公路局汽車筆試題庫。
      </p>
    </div>
  )
}
