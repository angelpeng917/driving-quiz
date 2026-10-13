import { highlightSegments } from '../lib/numeric'

/** 把數字＋單位與法規關鍵字標出來（數字：黃底；關鍵字：藍色粗體） */
export default function Highlighted({ text }: { text: string }) {
  return (
    <>
      {highlightSegments(text).map((s, i) =>
        s.kind === 'num' ? (
          <mark key={i} className="rounded bg-amber-200 px-0.5 font-bold text-slate-900">
            {s.text}
          </mark>
        ) : s.kind === 'kw' ? (
          <b key={i} className="text-indigo-700">
            {s.text}
          </b>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  )
}

export const renderHighlighted = (text: string) => <Highlighted text={text} />
