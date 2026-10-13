import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AttemptReview from '../components/AttemptReview'
import QuestionView from '../components/QuestionView'
import { CHEER, pick } from '../lib/cheer'
import { grade, sample } from '../lib/exam'
import { clearDraft, loadDraft, saveDraft, type ExamDraft } from '../lib/examDraft'
import { getQuestion, QUESTIONS } from '../lib/questions'
import { addAttempt, applyAnswer, newId, update, useAppData } from '../lib/storage'
import type { Attempt, Choice, Question } from '../types'

const COUNT_OPTIONS = [10, 20, 50, 100]

export default function ExamPage() {
  const data = useAppData()
  const [draft, setDraft] = useState<ExamDraft | null>(() => loadDraft())
  // 一進來就有舊草稿時，先問使用者要繼續還是重來，不要直接跳進考卷
  const [decided, setDecided] = useState(false)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const [result, setResult] = useState<Attempt | null>(null)

  const start = () => {
    const ids = sample(QUESTIONS, data.settings.examCount).map((q) => q.id)
    if (ids.length === 0) return
    const d: ExamDraft = { ids, chosen: {}, startedAt: new Date().toISOString(), index: 0 }
    saveDraft(d)
    setDraft(d)
    setDecided(true)
  }

  const submit = (d: ExamDraft) => {
    // 另一個分頁可能已經交卷：草稿不在了就不要重複記分
    if (!loadDraft()) {
      setDraft(null)
      return
    }
    const qs = d.ids.map((id) => getQuestion(id)).filter((q): q is Question => !!q)
    const g = grade(qs, d.chosen, data.settings.passScore)
    const at = new Date().toISOString()
    const attempt: Attempt = {
      id: newId(),
      mode: 'exam',
      label: `模擬考（${g.total} 題）`,
      startedAt: d.startedAt,
      finishedAt: at,
      total: g.total,
      correct: g.correct,
      score: g.score,
      passed: g.passed,
      answers: g.answers,
    }
    update((s) => {
      let next = s
      for (const a of g.answers) if (a.chosen !== null) next = applyAnswer(next, a.qid, a.chosen, a.correct, 'exam', at)
      return addAttempt(next, attempt)
    })
    clearDraft()
    setDraft(null)
    setResult(attempt)
  }

  const abandon = () => {
    clearDraft()
    setDraft(null)
    setConfirmRestart(false)
  }

  if (result) return <ExamResult attempt={result} passScore={data.settings.passScore} onAgain={() => setResult(null)} />

  if (draft && !decided) {
    const answered = Object.keys(draft.chosen).length
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">模擬考</h1>
        <div className="card space-y-3">
          <p className="font-medium">你上次的模擬考還沒考完（已答 {answered} / 共 {draft.ids.length} 題）。</p>
          <p className="text-sm text-slate-600">要接著考，還是重新開始？</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary !min-h-12" onClick={() => setDecided(true)}>
              繼續上次的考卷
            </button>
            {!confirmRestart ? (
              <button className="btn-ghost !min-h-12" onClick={() => setConfirmRestart(true)}>
                重新開始…
              </button>
            ) : (
              <div className="w-full rounded-lg bg-amber-50 p-3 text-sm">
                <p className="mb-2">重新開始的話，上次已經選的答案會全部清掉，沒辦法復原。確定嗎？</p>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => setConfirmRestart(false)}>
                    先不要
                  </button>
                  <button className="btn-danger" onClick={abandon}>
                    確定重新開始
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (draft) return <ExamRunner draft={draft} onChange={setDraft} onSubmit={submit} onAbandon={abandon} />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">模擬考</h1>
      <p className="text-sm text-slate-600">像正式考試一樣：全部作答完交卷，才會看到成績和正確答案。想一題一題馬上看答案，請到「練習」。</p>
      <div className="card space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">要考幾題？</p>
          <div className="flex flex-wrap gap-2">
            {COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                className={`!min-h-11 ${data.settings.examCount === n ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => update((d) => ({ ...d, settings: { ...d.settings, examCount: n } }))}
              >
                {data.settings.examCount === n ? '✓ ' : ''}
                {n} 題
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-600">答對 {data.settings.passScore} 分以上算及格。題目從全部 {QUESTIONS.length} 題裡隨機抽。</p>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-600">進階設定（及格分數）</summary>
          <label className="mt-2 block">
            <span className="font-medium">及格分數（滿分 100）</span>
            <input
              type="number"
              min={1}
              max={100}
              value={data.settings.passScore}
              onChange={(e) => {
                const v = Math.min(100, Math.max(1, Number(e.target.value) || 1))
                update((d) => ({ ...d, settings: { ...d.settings, passScore: v } }))
              }}
              className="ml-3 w-20 rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <p className="mt-1 text-xs text-slate-500">預設 85 分是依題庫第 298 題的答案；題數 50 題只是練習用的預設，並非官方規定。</p>
        </details>
        <button className="btn-primary !min-h-12 w-full sm:w-auto" onClick={start}>
          開始模擬考
        </button>
      </div>
    </div>
  )
}

function ExamRunner({
  draft,
  onChange,
  onSubmit,
  onAbandon,
}: {
  draft: ExamDraft
  onChange: (d: ExamDraft) => void
  onSubmit: (d: ExamDraft) => void
  onAbandon: () => void
}) {
  const questions = useMemo(() => draft.ids.map((id) => getQuestion(id)).filter((q): q is Question => !!q), [draft.ids])
  const [confirming, setConfirming] = useState(false)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const index = Math.min(draft.index, questions.length - 1)
  const q = questions[index]
  const answeredCount = Object.keys(draft.chosen).length
  const unanswered = questions.length - answeredCount

  const set = (patch: Partial<ExamDraft>) => {
    const d = { ...draft, ...patch }
    saveDraft(d)
    onChange(d)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirming || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        const d = { ...draft, chosen: { ...draft.chosen, [q.id]: Number(e.key) as Choice } }
        saveDraft(d)
        onChange(d)
      } else if (e.key === 'ArrowRight' && index < questions.length - 1) set({ index: index + 1 })
      else if (e.key === 'ArrowLeft' && index > 0) set({ index: index - 1 })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          模擬考・第 {index + 1} / {questions.length} 題（已答 {answeredCount}）
        </span>
        <button className="btn-primary !min-h-11 !px-4" onClick={() => setConfirming(true)}>
          交卷
        </button>
      </div>
      <p className="text-xs text-slate-500">交卷後才會看到答案；可以隨時回頭改答案。中途離開也沒關係，下次回來會接著考。</p>

      <div className="card">
        <QuestionView
          key={q.id}
          q={q}
          chosen={draft.chosen[q.id]}
          showMeta={false}
          onChoose={(c) => set({ chosen: { ...draft.chosen, [q.id]: c } })}
        />
        {draft.chosen[q.id] && <p className="mt-2 text-sm text-indigo-700">✓ 已記下你的答案，可以去下一題。</p>}
      </div>

      <div className="sticky bottom-16 z-[5] flex justify-between bg-slate-50/95 py-2 sm:bottom-0">
        <button className="btn-ghost !min-h-12" disabled={index === 0} onClick={() => set({ index: index - 1 })}>
          上一題
        </button>
        <button className="btn-primary !min-h-12 !px-8" disabled={index === questions.length - 1} onClick={() => set({ index: index + 1 })}>
          下一題
        </button>
      </div>

      <div className="card">
        <p className="mb-2 text-xs text-slate-500">題目導覽：藍色是已作答，灰色是還沒作答，點數字可以跳過去。</p>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
          {questions.map((x, i) => (
            <button
              key={x.id}
              aria-label={`跳到第 ${i + 1} 題`}
              onClick={() => set({ index: i })}
              className={`min-h-10 rounded text-sm ${
                i === index ? 'ring-2 ring-indigo-600' : ''
              } ${draft.chosen[x.id] ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="mb-2 text-lg font-bold">要交卷了嗎？</h2>
            <p className="mb-1 text-sm text-slate-600">交卷後才會看到成績和正確答案。</p>
            <p className="mb-4 text-sm text-slate-600">
              {unanswered > 0 ? `還有 ${unanswered} 題沒作答，沒作答的題目會算答錯。` : '所有題目都作答了。'}
            </p>
            {!confirmAbandon ? (
              <>
                <div className="flex flex-wrap justify-end gap-2">
                  <button className="btn-ghost !min-h-11" onClick={() => setConfirming(false)}>
                    繼續作答
                  </button>
                  <button className="btn-primary !min-h-11" onClick={() => onSubmit(draft)}>
                    交卷看成績
                  </button>
                </div>
                <button className="mt-4 text-xs text-slate-500 underline" onClick={() => setConfirmAbandon(true)}>
                  不想交卷，放棄這次考試
                </button>
              </>
            ) : (
              <div className="rounded-lg bg-amber-50 p-3 text-sm">
                <p className="mb-2">放棄後這次的答案會全部清掉，而且不能復原。確定要放棄嗎？</p>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => setConfirmAbandon(false)}>
                    回去繼續作答
                  </button>
                  <button className="btn-danger" onClick={onAbandon}>
                    確定放棄
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function ExamResult({ attempt, passScore, onAgain }: { attempt: Attempt; passScore: number; onAgain?: () => void }) {
  const cheer = useMemo(() => pick(attempt.passed ? CHEER.examPass : CHEER.examFail), [attempt.passed])
  const wrong = attempt.answers.filter((a) => !a.correct).length
  return (
    <div className="space-y-4">
      <div className="card text-center">
        <p className="text-sm text-slate-500">{attempt.label}</p>
        <p className={`my-2 text-5xl font-bold ${attempt.passed ? 'text-emerald-600' : 'text-rose-600'}`}>{attempt.score} 分</p>
        <p className="font-medium">{attempt.passed ? '✅ 及格' : '❌ 未及格'}（及格 {passScore} 分）</p>
        <p className="mt-2 font-medium text-indigo-700">{cheer}</p>
        <p className="mt-1 text-sm text-slate-600">
          答對 {attempt.correct} / {attempt.total} 題・未作答 {attempt.answers.filter((a) => a.chosen === null).length} 題
        </p>
        {wrong > 0 && <p className="mt-1 text-sm text-slate-600">答錯的題目已經放進錯題本，可以之後再練。</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link className="btn-primary !min-h-11" to="/wrong">
            練習答錯的題目
          </Link>
          {onAgain && (
            <button className="btn-ghost !min-h-11" onClick={onAgain}>
              回到模擬考首頁
            </button>
          )}
        </div>
      </div>
      <AttemptReview answers={attempt.answers} />
    </div>
  )
}
