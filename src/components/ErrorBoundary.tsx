import { Component, type ReactNode } from 'react'
import { STORAGE_KEY } from '../lib/storage'

/** 最後一道防線：畫面出錯時不要整頁白屏，提供重新整理與（最後手段的）清除資料 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="mb-2 text-xl font-bold">哎呀，出了點狀況</h1>
        <p className="mb-4 text-sm text-slate-600">請先重新整理看看。如果還是一樣，可能是紀錄資料有問題，可以把紀錄清掉重新開始（清掉前會先幫你留一份原始內容在瀏覽器裡）。</p>
        <div className="flex flex-col gap-2">
          <button className="btn-primary" onClick={() => location.reload()}>
            重新整理
          </button>
          <button
            className="btn-ghost text-rose-700"
            onClick={() => {
              try {
                const raw = localStorage.getItem(STORAGE_KEY)
                if (raw) localStorage.setItem(STORAGE_KEY + ':corrupt', raw)
                localStorage.removeItem(STORAGE_KEY)
                localStorage.removeItem('driving-quiz:exam-draft')
              } catch {
                /* 忽略 */
              }
              location.reload()
            }}
          >
            清除紀錄並重新開始
          </button>
        </div>
      </div>
    )
  }
}
