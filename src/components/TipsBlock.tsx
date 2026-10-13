import { tipsFor, type TipGroup } from '../lib/tips'

/** 一個口訣群組的完整內容（口訣、數字對照、易混淆、題庫疑點） */
export function TipGroupView({ group, onlyQid }: { group: TipGroup; onlyQid?: number }) {
  const rows = onlyQid ? group.rows.filter((r) => r.qids.includes(onlyQid)) : group.rows
  return (
    <div className="space-y-2 text-sm">
      <p className="rounded bg-amber-50 p-2">
        <b>口訣：</b>
        {group.mnemonic}
        <span className="mt-1 block text-xs text-slate-500">
          {group.mnemonicNote ?? '口訣是記憶輔助，不是法條原文；數字以題庫答案為準。'}
        </span>
      </p>
      <table className="w-full border-collapse text-left">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-200 align-top">
              <td className="py-1 pr-2 text-slate-700">{r.label}</td>
              <td className="py-1 pr-2 font-semibold">{r.value}</td>
              <td className="py-1 text-xs whitespace-nowrap text-slate-500">題庫 {r.qids.map((q) => `#${q}`).join(' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!onlyQid && group.compare.length > 0 && (
        <div>
          <p className="font-semibold">⚠️ 易混淆</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {group.compare.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      {group.caveats && (
        <div className="rounded bg-rose-50 p-2 text-rose-900">
          <p className="font-semibold">題庫疑點</p>
          <ul className="list-disc pl-5">
            {group.caveats.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** 作答後顯示在解答區的記憶提示；題目沒有對應提示時不顯示 */
export default function TipsBlock({ qid }: { qid: number }) {
  const tips = tipsFor(qid)
  if (tips.length === 0) return null
  return (
    <div className="mt-3 space-y-3 border-t border-slate-300 pt-3">
      {tips.map(({ group }) => (
        <details key={group.id} open>
          <summary className="cursor-pointer font-semibold text-indigo-800">📌 記憶提示：{group.title}</summary>
          <div className="mt-2">
            <TipGroupView group={group} onlyQid={qid} />
            {group.compare.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                {group.compare.map((c) => (
                  <li key={c}>⚠️ {c}</li>
                ))}
              </ul>
            )}
          </div>
        </details>
      ))}
    </div>
  )
}
