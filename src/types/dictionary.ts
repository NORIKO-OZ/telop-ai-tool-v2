export interface TermPair {
  id: string
  from: string // 置換前
  to: string   // 置換後
  usage: number // 使用回数
  createdAt: string
}

export interface Dictionary {
  id: string
  name: string
  description?: string
  terms: TermPair[]
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export interface DictionaryManager {
  dictionaries: Dictionary[]
  activeDictionaryIds: string[]
}