import { NavLink } from 'react-router-dom'

/** 頁面頂端的分頁切換（例如 分類練習／數字題特訓） */
export default function SegmentTabs({ tabs }: { tabs: { to: string; label: string }[] }) {
  return (
    <div className="mb-4 inline-flex max-w-full flex-wrap rounded-lg bg-slate-200 p-1 text-sm">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `min-h-10 flex items-center rounded-md px-3 py-1.5 sm:px-4 ${isActive ? 'bg-white font-semibold text-indigo-700 shadow-sm' : 'text-slate-600'}`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  )
}
