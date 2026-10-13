import { useState } from 'react'
import SegmentTabs from '../components/SegmentTabs'
import { TipGroupView } from '../components/TipsBlock'
import { NUMERIC_TAGS } from '../lib/numeric'
import { TIP_GROUPS } from '../lib/tips'
import { PRACTICE_TABS } from './PracticePage'

export default function TipsPage() {
  const [tag, setTag] = useState('')
  const groups = TIP_GROUPS.filter((g) => !tag || g.tag === tag)
  return (
    <div className="space-y-4">
      <SegmentTabs tabs={PRACTICE_TABS} />
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        表中每一個數字都對應題庫題號，並經程式核對確實出現在該題的正確答案裡。<b>口訣只是記憶輔助，不是法條原文</b>；題庫本身偶有數字不一致之處，已在「題庫疑點」標示。
      </p>
      <div className="flex flex-wrap gap-2">
        {[{ tag: '', label: '全部' }, ...NUMERIC_TAGS.filter((t) => TIP_GROUPS.some((g) => g.tag === t.tag))].map((t) => (
          <button key={t.tag} className={tag === t.tag ? 'btn-primary' : 'btn-ghost'} onClick={() => setTag(t.tag)}>
            {t.label}
          </button>
        ))}
      </div>
      {groups.map((g) => (
        <section key={g.id} className="card">
          <h2 className="mb-2 font-semibold">{g.title}</h2>
          <TipGroupView group={g} />
        </section>
      ))}
    </div>
  )
}
