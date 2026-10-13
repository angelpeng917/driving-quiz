import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { overallStats } from '../lib/stats'
import { useAppData, useSaveFailed } from '../lib/storage'

interface NavItem {
  to: string
  label: string
  icon: string
  /** 這些路徑底下也算「目前所在」 */
  also?: string[]
}

export const NAV: NavItem[] = [
  { to: '/', label: '首頁', icon: '🏠' },
  { to: '/exam', label: '模擬考', icon: '📝' },
  { to: '/practice', label: '練習', icon: '📚', also: ['/numeric', '/tips'] },
  { to: '/wrong', label: '錯題本', icon: '❌' },
  { to: '/history', label: '成績與備份', icon: '📊', also: ['/backup'] },
]

export default function Layout() {
  const { pathname } = useLocation()
  const toReview = overallStats(useAppData()).toReview
  const saveFailed = useSaveFailed()

  const cls = (n: NavItem) => {
    const active = n.to === '/' ? pathname === '/' : [n.to, ...(n.also ?? [])].some((p) => pathname.startsWith(p))
    return `relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs sm:min-h-0 sm:flex-none sm:flex-row sm:gap-2 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm ${
      active ? 'text-indigo-700 sm:bg-indigo-50 font-semibold' : 'text-slate-600 hover:text-slate-900'
    }`
  }

  const items = (mobile: boolean) =>
    NAV.map((n) => (
      <NavLink key={n.to} to={n.to} className={cls(n)}>
        <span aria-hidden className={mobile ? 'text-lg' : ''}>
          {n.icon}
        </span>
        {n.label}
        {n.to === '/wrong' && toReview > 0 && (
          <span className="absolute top-0 right-1 rounded-full bg-rose-600 px-1.5 text-[10px] leading-4 text-white sm:static sm:px-1.5">
            {toReview}
          </span>
        )}
      </NavLink>
    ))

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <header className="sticky top-0 z-10 hidden border-b border-slate-200 bg-white/90 backdrop-blur sm:block">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-2">
          <span className="font-bold text-indigo-700">小型車筆試練習</span>
          <nav className="flex gap-1">{items(false)}</nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-4">
        {saveFailed && (
          <p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
            ⚠️ 這個瀏覽器目前存不了紀錄（可能是無痕模式或空間已滿），關掉網頁後紀錄會不見。請到「成績與備份」先把紀錄存成檔案。
          </p>
        )}
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
        {items(true)}
      </nav>
    </div>
  )
}
