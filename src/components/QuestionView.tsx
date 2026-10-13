import type { ReactNode } from 'react'
import { imageUrl, shortCategory } from '../lib/questions'
import type { Choice, Question } from '../types'

interface Props {
  q: Question
  /** 使用者目前選的答案 */
  chosen?: Choice | null
  /** true：顯示正確答案與對錯顏色（不可再選） */
  reveal?: boolean
  onChoose?: (c: Choice) => void
  /** 在解答區塊下方額外顯示的內容（例如記憶口訣） */
  extra?: ReactNode
  /** 文字渲染函式（數字題用來高亮關鍵字） */
  renderText?: (text: string) => ReactNode
  /** 顯示「題號・分類」小標 */
  showMeta?: boolean
}

const MARKS = ['①', '②', '③'] as const

export default function QuestionView({ q, chosen, reveal, onChoose, extra, renderText, showMeta = true }: Props) {
  const txt = (s: string) => (renderText ? renderText(s) : s)
  // 圖片選項題：三張圖就是三個選項；其餘題目的圖放在題幹下方
  const stemImages = q.optionsAreImages ? [] : q.images

  return (
    <div>
      {showMeta && (
        <p className="mb-2 text-xs text-slate-500">
          題號 {q.id}・{shortCategory(q.category)}
        </p>
      )}
      {q.question && <p className="mb-3 text-base leading-relaxed font-medium sm:text-lg">{txt(q.question)}</p>}
      {stemImages.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-3">
          {stemImages.map((f) => (
            <img key={f} src={imageUrl(f)} alt={`題 ${q.id} 圖片`} className="max-h-48 rounded border border-slate-200 bg-white p-1" />
          ))}
        </div>
      )}
      <ul className="space-y-2">
        {q.options.map((opt, i) => {
          const n = (i + 1) as Choice
          const isChosen = chosen === n
          const isAnswer = q.answer === n
          let cls = 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50'
          if (reveal) {
            if (isAnswer) cls = 'border-emerald-500 bg-emerald-50'
            else if (isChosen) cls = 'border-rose-500 bg-rose-50'
            else cls = 'border-slate-200 bg-white opacity-70'
          } else if (isChosen) cls = 'border-indigo-500 bg-indigo-50'
          return (
            <li key={n}>
              <button
                type="button"
                disabled={reveal || !onChoose}
                onClick={() => onChoose?.(n)}
                aria-pressed={isChosen}
                className={`flex w-full items-center gap-3 rounded-lg border-2 px-3 py-3 text-left text-sm leading-relaxed transition sm:text-base ${cls}`}
              >
                <span className="shrink-0 font-semibold text-slate-500" aria-label={`選項 ${n}`}>
                  {MARKS[i]}
                </span>
                {q.optionsAreImages ? (
                  <img src={imageUrl(q.images[i])} alt={`選項 ${n}`} className="max-h-24" />
                ) : (
                  <span>{txt(opt)}</span>
                )}
                {reveal && isAnswer && <span className="ml-auto shrink-0 text-emerald-700">✓ 正確答案</span>}
                {reveal && isChosen && !isAnswer && <span className="ml-auto shrink-0 text-rose-700">✗ 你的答案</span>}
              </button>
            </li>
          )
        })}
      </ul>
      {reveal && (
        <div className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          <p>
            正確答案：<b>{MARKS[q.answer - 1]}</b>
            {chosen == null && <span className="ml-2 text-rose-700">（未作答）</span>}
          </p>
          <p className="mt-1 text-xs text-slate-500">公路局題庫只提供答案，未附解析。</p>
          {extra}
        </div>
      )}
    </div>
  )
}
