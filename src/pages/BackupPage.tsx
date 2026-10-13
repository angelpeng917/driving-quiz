import { useRef, useState } from 'react'
import SegmentTabs from '../components/SegmentTabs'
import { buildBackup, mergeData, parseBackup } from '../lib/backup'
import { emptyData, setData, useAppData } from '../lib/storage'
import type { AppData } from '../types'
import { fmtDate, RECORD_TABS } from './HistoryPage'

const summary = (d: AppData) => `${d.attempts.length} 筆測驗歷史、${Object.keys(d.progress).length} 題作答進度`

export default function BackupPage() {
  const data = useAppData()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ data: AppData; exportedAt?: string; name: string } | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const download = () => {
    const blob = new Blob([buildBackup(data)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `driving-quiz-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMessage({ ok: true, text: '備份好了，換手機也不用擔心。檔案在你的「下載」資料夾。' })
  }

  const onFile = async (file?: File) => {
    if (!file) return
    const r = parseBackup(await file.text())
    if (!r.ok) {
      setPending(null)
      setMessage({ ok: false, text: r.error })
    } else {
      setMessage(null)
      setPending({ data: r.data, exportedAt: r.exportedAt, name: file.name })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const apply = (mode: 'replace' | 'merge') => {
    if (!pending) return
    setData(mode === 'replace' ? pending.data : mergeData(data, pending.data))
    setMessage({ ok: true, text: mode === 'replace' ? '已用檔案裡的紀錄取代現在的紀錄。' : '已把檔案裡的紀錄和現在的合在一起。' })
    setPending(null)
  }

  return (
    <div className="space-y-4">
      <SegmentTabs tabs={RECORD_TABS} />
      <div className="card space-y-3">
        <h2 className="font-semibold">把我的紀錄存成檔案</h2>
        <p className="text-sm text-slate-600">目前有 {summary(data)}。換手機或清掉瀏覽器資料之前，先按下面的按鈕存起來；存好的檔案之後可以再放回來。</p>
        <button className="btn-primary" onClick={download}>
          存成備份檔
        </button>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">把存好的紀錄放回來</h2>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={(e) => onFile(e.target.files?.[0])} className="block text-sm" />
        {pending && (
          <div className="space-y-2 rounded-lg bg-indigo-50 p-3 text-sm">
            <p>
              檔案「{pending.name}」：{summary(pending.data)}
              {pending.exportedAt && `（匯出於 ${fmtDate(pending.exportedAt)}）`}
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => apply('merge')}>
                兩邊都保留（建議）
              </button>
              <button className="btn-ghost" onClick={() => apply('replace')}>
                只用檔案裡的紀錄（會蓋掉現在的）
              </button>
              <button className="btn-ghost" onClick={() => setPending(null)}>
                取消
              </button>
            </div>
            <p className="text-xs text-slate-600">「兩邊都保留」：成績紀錄全部留下，同一題以最近一次作答的紀錄為準。「只用檔案裡的」：現在這台的紀錄會被取代。</p>
          </div>
        )}
      </div>

      {message && (
        <p role="status" className={`rounded-lg p-3 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          {message.text}
        </p>
      )}

      <div className="card space-y-3">
        <h2 className="font-semibold">刪除所有紀錄</h2>
        {!confirmReset ? (
          <button className="btn-ghost text-rose-700" onClick={() => setConfirmReset(true)}>
            刪除…
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>要把所有練習紀錄都刪掉嗎？刪掉就找不回來囉。</span>
            <button
              className="btn-danger"
              onClick={() => {
                setData(emptyData())
                setConfirmReset(false)
                setMessage({ ok: true, text: '已刪除所有紀錄。' })
              }}
            >
              確定刪除
            </button>
            <button className="btn-ghost" onClick={() => setConfirmReset(false)}>
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
