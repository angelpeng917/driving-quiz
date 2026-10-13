import raw from '../data/questions.json'
import type { Question } from '../types'

export const QUESTIONS = raw as Question[]

const byId = new Map(QUESTIONS.map((q) => [q.id, q]))
export const getQuestion = (id: number) => byId.get(id)

/** 圖片網址；BASE_URL 讓網站可部署在子路徑 */
export const imageUrl = (name: string) => `${import.meta.env.BASE_URL}images/questions/${name}`

/** 分類顯示名稱：去掉括號說明，例如「路口安全」 */
export const shortCategory = (c: string) => c.replace(/（.*$/, '')

export const CATEGORIES = Array.from(new Set(QUESTIONS.map((q) => q.category)))
