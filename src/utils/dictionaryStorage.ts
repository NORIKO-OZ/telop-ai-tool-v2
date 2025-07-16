import { Dictionary, DictionaryManager, TermPair } from '@/types/dictionary'

const STORAGE_KEY = 'telop-dictionaries'

export class DictionaryStorage {
  static getDictionaries(): Dictionary[] {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      
      const data: DictionaryManager = JSON.parse(stored)
      return data.dictionaries || []
    } catch (error) {
      console.error('Failed to load dictionaries:', error)
      return []
    }
  }

  static getActiveDictionaries(): string[] {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      
      const data: DictionaryManager = JSON.parse(stored)
      return data.activeDictionaryIds || []
    } catch (error) {
      console.error('Failed to load active dictionaries:', error)
      return []
    }
  }

  static saveDictionaries(dictionaries: Dictionary[], activeDictionaryIds: string[] = []): void {
    if (typeof window === 'undefined') return
    
    try {
      const data: DictionaryManager = {
        dictionaries,
        activeDictionaryIds
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save dictionaries:', error)
    }
  }

  static createDictionary(name: string, description?: string): Dictionary {
    const now = new Date().toISOString()
    return {
      id: `dict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      terms: [],
      createdAt: now,
      updatedAt: now,
      isActive: true
    }
  }

  static createTerm(from: string, to: string): TermPair {
    const now = new Date().toISOString()
    return {
      id: `term_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from,
      to,
      usage: 0,
      createdAt: now
    }
  }

  static addDictionary(dictionary: Dictionary): void {
    const dictionaries = this.getDictionaries()
    const activeDictionaries = this.getActiveDictionaries()
    
    dictionaries.push(dictionary)
    this.saveDictionaries(dictionaries, activeDictionaries)
  }

  static updateDictionary(id: string, updates: Partial<Dictionary>): void {
    const dictionaries = this.getDictionaries()
    const activeDictionaries = this.getActiveDictionaries()
    
    const index = dictionaries.findIndex(d => d.id === id)
    if (index !== -1) {
      dictionaries[index] = { ...dictionaries[index], ...updates, updatedAt: new Date().toISOString() }
      this.saveDictionaries(dictionaries, activeDictionaries)
    }
  }

  static deleteDictionary(id: string): void {
    const dictionaries = this.getDictionaries()
    const activeDictionaries = this.getActiveDictionaries()
    
    const filteredDictionaries = dictionaries.filter(d => d.id !== id)
    const filteredActiveDictionaries = activeDictionaries.filter(dictId => dictId !== id)
    
    this.saveDictionaries(filteredDictionaries, filteredActiveDictionaries)
  }

  static setActiveDictionaries(activeDictionaryIds: string[]): void {
    const dictionaries = this.getDictionaries()
    this.saveDictionaries(dictionaries, activeDictionaryIds)
  }

  static applyDictionaries(text: string, dictionaryIds?: string[]): { text: string, appliedTerms: TermPair[] } {
    const dictionaries = this.getDictionaries()
    const activeDictionaries = dictionaryIds || this.getActiveDictionaries()
    
    let processedText = text
    const appliedTerms: TermPair[] = []
    
    // アクティブな辞書から用語を収集
    const allTerms: TermPair[] = []
    dictionaries.forEach(dict => {
      if (activeDictionaries.includes(dict.id)) {
        allTerms.push(...dict.terms)
      }
    })
    
    // 使用頻度順にソート（よく使う用語を優先）
    allTerms.sort((a, b) => b.usage - a.usage)
    
    // 用語置換を実行
    allTerms.forEach(term => {
      const regex = new RegExp(term.from, 'g')
      const matches = processedText.match(regex)
      
      if (matches && matches.length > 0) {
        processedText = processedText.replace(regex, term.to)
        appliedTerms.push(term)
        
        // 使用回数を増加
        this.incrementTermUsage(term.id)
      }
    })
    
    return { text: processedText, appliedTerms }
  }

  static incrementTermUsage(termId: string): void {
    const dictionaries = this.getDictionaries()
    const activeDictionaries = this.getActiveDictionaries()
    
    let updated = false
    dictionaries.forEach(dict => {
      dict.terms.forEach(term => {
        if (term.id === termId) {
          term.usage++
          updated = true
        }
      })
    })
    
    if (updated) {
      this.saveDictionaries(dictionaries, activeDictionaries)
    }
  }

  static exportDictionary(id: string): string | null {
    const dictionaries = this.getDictionaries()
    const dictionary = dictionaries.find(d => d.id === id)
    return dictionary ? JSON.stringify(dictionary, null, 2) : null
  }

  static importDictionary(jsonData: string): boolean {
    try {
      const dictionary: Dictionary = JSON.parse(jsonData)
      
      // 基本的なバリデーション
      if (!dictionary.id || !dictionary.name || !Array.isArray(dictionary.terms)) {
        return false
      }
      
      // IDの重複を避けるため新しいIDを生成
      dictionary.id = `dict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      dictionary.updatedAt = new Date().toISOString()
      
      this.addDictionary(dictionary)
      return true
    } catch (error) {
      console.error('Failed to import dictionary:', error)
      return false
    }
  }
}