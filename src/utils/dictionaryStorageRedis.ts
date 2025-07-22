import { Dictionary, TermPair } from '@/types/dictionary'

export class DictionaryStorageRedis {
  static async getDictionaries(userId: string): Promise<Dictionary[]> {
    try {
      const response = await fetch('/api/dictionaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', userId })
      })
      
      const data = await response.json()
      return data.success ? data.dictionaries || [] : []
    } catch (error) {
      console.error('Failed to load dictionaries:', error)
      return []
    }
  }

  static async getActiveDictionaries(userId: string): Promise<string[]> {
    try {
      const response = await fetch('/api/dictionaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getActive', userId })
      })
      
      const data = await response.json()
      return data.success ? data.activeDictionaryIds || [] : []
    } catch (error) {
      console.error('Failed to load active dictionaries:', error)
      return []
    }
  }

  static async saveDictionaries(userId: string, dictionaries: Dictionary[], activeDictionaryIds: string[] = []): Promise<boolean> {
    try {
      const response = await fetch('/api/dictionaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'save', 
          userId, 
          dictionaries, 
          activeDictionaryIds 
        })
      })
      
      const data = await response.json()
      return data.success
    } catch (error) {
      console.error('Failed to save dictionaries:', error)
      return false
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

  static async addDictionary(userId: string, dictionary: Dictionary): Promise<boolean> {
    try {
      const dictionaries = await this.getDictionaries(userId)
      const activeDictionaries = await this.getActiveDictionaries(userId)
      
      dictionaries.push(dictionary)
      return await this.saveDictionaries(userId, dictionaries, activeDictionaries)
    } catch (error) {
      console.error('Failed to add dictionary:', error)
      return false
    }
  }

  static async updateDictionary(userId: string, id: string, updates: Partial<Dictionary>): Promise<boolean> {
    try {
      const dictionaries = await this.getDictionaries(userId)
      const activeDictionaries = await this.getActiveDictionaries(userId)
      
      const index = dictionaries.findIndex(d => d.id === id)
      if (index !== -1) {
        dictionaries[index] = { ...dictionaries[index], ...updates, updatedAt: new Date().toISOString() }
        return await this.saveDictionaries(userId, dictionaries, activeDictionaries)
      }
      return false
    } catch (error) {
      console.error('Failed to update dictionary:', error)
      return false
    }
  }

  static async deleteDictionary(userId: string, id: string): Promise<boolean> {
    try {
      const dictionaries = await this.getDictionaries(userId)
      const activeDictionaries = await this.getActiveDictionaries(userId)
      
      const filteredDictionaries = dictionaries.filter(d => d.id !== id)
      const filteredActiveDictionaries = activeDictionaries.filter(dictId => dictId !== id)
      
      return await this.saveDictionaries(userId, filteredDictionaries, filteredActiveDictionaries)
    } catch (error) {
      console.error('Failed to delete dictionary:', error)
      return false
    }
  }

  static async setActiveDictionaries(userId: string, activeDictionaryIds: string[]): Promise<boolean> {
    try {
      const dictionaries = await this.getDictionaries(userId)
      return await this.saveDictionaries(userId, dictionaries, activeDictionaryIds)
    } catch (error) {
      console.error('Failed to set active dictionaries:', error)
      return false
    }
  }

  static async applyDictionaries(userId: string, text: string, dictionaryIds?: string[]): Promise<{ text: string, appliedTerms: TermPair[] }> {
    try {
      const dictionaries = await this.getDictionaries(userId)
      const activeDictionaries = dictionaryIds || await this.getActiveDictionaries(userId)
      
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
          this.incrementTermUsage(userId, term.id)
        }
      })
      
      return { text: processedText, appliedTerms }
    } catch (error) {
      console.error('Failed to apply dictionaries:', error)
      return { text, appliedTerms: [] }
    }
  }

  static async incrementTermUsage(userId: string, termId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/dictionaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'incrementUsage', 
          userId, 
          termId 
        })
      })
      
      const data = await response.json()
      return data.success
    } catch (error) {
      console.error('Failed to increment term usage:', error)
      return false
    }
  }

  static async exportDictionary(userId: string, id: string): Promise<string | null> {
    try {
      const dictionaries = await this.getDictionaries(userId)
      const dictionary = dictionaries.find(d => d.id === id)
      return dictionary ? JSON.stringify(dictionary, null, 2) : null
    } catch (error) {
      console.error('Failed to export dictionary:', error)
      return null
    }
  }

  static async importDictionary(userId: string, jsonData: string): Promise<boolean> {
    try {
      const dictionary: Dictionary = JSON.parse(jsonData)
      
      // 基本的なバリデーション
      if (!dictionary.id || !dictionary.name || !Array.isArray(dictionary.terms)) {
        return false
      }
      
      // IDの重複を避けるため新しいIDを生成
      dictionary.id = `dict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      dictionary.updatedAt = new Date().toISOString()
      
      return await this.addDictionary(userId, dictionary)
    } catch (error) {
      console.error('Failed to import dictionary:', error)
      return false
    }
  }
}