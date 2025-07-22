'use client'

import { useState, useEffect } from 'react'
import { Dictionary, TermPair } from '@/types/dictionary'
import { DictionaryStorageRedis } from '@/utils/dictionaryStorageRedis'

interface DictionaryManagerProps {
  isOpen: boolean
  onClose: () => void
  onDictionariesChange: () => void
  userId?: string
}

export default function DictionaryManager({ isOpen, onClose, onDictionariesChange, userId }: DictionaryManagerProps) {
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([])
  const [activeDictionaries, setActiveDictionaries] = useState<string[]>([])
  const [selectedDictionary, setSelectedDictionary] = useState<Dictionary | null>(null)
  const [newDictName, setNewDictName] = useState('')
  const [newDictDescription, setNewDictDescription] = useState('')
  const [newTermFrom, setNewTermFrom] = useState('')
  const [newTermTo, setNewTermTo] = useState('')
  const [editingTerm, setEditingTerm] = useState<TermPair | null>(null)

  useEffect(() => {
    if (isOpen && userId) {
      loadDictionaries()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId])

  const loadDictionaries = async () => {
    if (!userId) return
    
    try {
      const dicts = await DictionaryStorageRedis.getDictionaries(userId)
      const activeDicts = await DictionaryStorageRedis.getActiveDictionaries(userId)
      setDictionaries(dicts)
      setActiveDictionaries(activeDicts)
    } catch (error) {
      console.error('Failed to load dictionaries:', error)
    }
  }

  const handleCreateDictionary = async () => {
    if (!newDictName.trim() || !userId) return

    const newDict = DictionaryStorageRedis.createDictionary(newDictName.trim(), newDictDescription.trim())
    await DictionaryStorageRedis.addDictionary(userId, newDict)
    
    setNewDictName('')
    setNewDictDescription('')
    await loadDictionaries()
    onDictionariesChange()
  }

  const handleDeleteDictionary = async (id: string) => {
    if (!userId || !confirm('この辞書を削除しますか？')) return
    
    await DictionaryStorageRedis.deleteDictionary(userId, id)
    if (selectedDictionary?.id === id) {
      setSelectedDictionary(null)
    }
    await loadDictionaries()
    onDictionariesChange()
  }

  const handleToggleActive = async (id: string) => {
    if (!userId) return
    
    const newActiveDictionaries = activeDictionaries.includes(id)
      ? activeDictionaries.filter(dictId => dictId !== id)
      : [...activeDictionaries, id]
    
    setActiveDictionaries(newActiveDictionaries)
    await DictionaryStorageRedis.setActiveDictionaries(userId, newActiveDictionaries)
    onDictionariesChange()
  }

  const handleAddTerm = async () => {
    if (!selectedDictionary || !newTermFrom.trim() || !newTermTo.trim() || !userId) return

    const newTerm = DictionaryStorageRedis.createTerm(newTermFrom.trim(), newTermTo.trim())
    const updatedTerms = [...selectedDictionary.terms, newTerm]
    
    await DictionaryStorageRedis.updateDictionary(userId, selectedDictionary.id, { terms: updatedTerms })
    
    setNewTermFrom('')
    setNewTermTo('')
    await loadDictionaries()
    
    // 選択中の辞書を更新
    const dicts = await DictionaryStorageRedis.getDictionaries(userId)
    const updatedDict = dicts.find(d => d.id === selectedDictionary.id)
    if (updatedDict) {
      setSelectedDictionary(updatedDict)
    }
    onDictionariesChange()
  }

  const handleEditTerm = (term: TermPair) => {
    setEditingTerm(term)
    setNewTermFrom(term.from)
    setNewTermTo(term.to)
  }

  const handleUpdateTerm = async () => {
    if (!selectedDictionary || !editingTerm || !newTermFrom.trim() || !newTermTo.trim() || !userId) return

    const updatedTerms = selectedDictionary.terms.map(term =>
      term.id === editingTerm.id
        ? { ...term, from: newTermFrom.trim(), to: newTermTo.trim() }
        : term
    )
    
    await DictionaryStorageRedis.updateDictionary(userId, selectedDictionary.id, { terms: updatedTerms })
    
    setEditingTerm(null)
    setNewTermFrom('')
    setNewTermTo('')
    await loadDictionaries()
    
    // 選択中の辞書を更新
    const dicts = await DictionaryStorageRedis.getDictionaries(userId)
    const updatedDict = dicts.find(d => d.id === selectedDictionary.id)
    if (updatedDict) {
      setSelectedDictionary(updatedDict)
    }
    onDictionariesChange()
  }

  const handleDeleteTerm = async (termId: string) => {
    if (!selectedDictionary || !userId) return
    
    const updatedTerms = selectedDictionary.terms.filter(term => term.id !== termId)
    await DictionaryStorageRedis.updateDictionary(userId, selectedDictionary.id, { terms: updatedTerms })
    
    await loadDictionaries()
    
    // 選択中の辞書を更新
    const dicts = await DictionaryStorageRedis.getDictionaries(userId)
    const updatedDict = dicts.find(d => d.id === selectedDictionary.id)
    if (updatedDict) {
      setSelectedDictionary(updatedDict)
    }
    onDictionariesChange()
  }

  const handleExportDictionary = async (id: string) => {
    if (!userId) return
    
    const jsonData = await DictionaryStorageRedis.exportDictionary(userId, id)
    if (jsonData) {
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dictionary_${dictionaries.find(d => d.id === id)?.name || 'export'}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleImportDictionary = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userId) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const content = e.target?.result as string
      if (await DictionaryStorageRedis.importDictionary(userId, content)) {
        await loadDictionaries()
        onDictionariesChange()
        alert('辞書をインポートしました')
      } else {
        alert('辞書のインポートに失敗しました')
      }
    }
    reader.readAsText(file)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">用語辞書管理</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左側: 辞書一覧 */}
          <div className="w-1/3 border-r flex flex-col">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold mb-3">辞書一覧</h3>
              
              {/* 新規辞書作成 */}
              <div className="space-y-2 mb-4">
                <input
                  type="text"
                  placeholder="辞書名"
                  value={newDictName}
                  onChange={(e) => setNewDictName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="text"
                  placeholder="説明（任意）"
                  value={newDictDescription}
                  onChange={(e) => setNewDictDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <button
                  onClick={handleCreateDictionary}
                  disabled={!newDictName.trim()}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  新規作成
                </button>
              </div>

              {/* インポート */}
              <label className="block">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportDictionary}
                  className="hidden"
                />
                <span className="block w-full bg-green-600 text-white py-2 px-4 rounded-lg text-sm text-center cursor-pointer hover:bg-green-700">
                  辞書をインポート
                </span>
              </label>
            </div>

            {/* 辞書リスト */}
            <div className="flex-1 overflow-y-auto p-4">
              {dictionaries.map(dict => (
                <div
                  key={dict.id}
                  className={`border rounded-lg p-3 mb-2 cursor-pointer ${
                    selectedDictionary?.id === dict.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedDictionary(dict)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{dict.name}</h4>
                    <label className="flex items-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={activeDictionaries.includes(dict.id)}
                        onChange={() => handleToggleActive(dict.id)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600">有効</span>
                    </label>
                  </div>
                  {dict.description && (
                    <p className="text-sm text-gray-600 mb-2">{dict.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{dict.terms.length}個の用語</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleExportDictionary(dict.id)
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        出力
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteDictionary(dict.id)
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右側: 用語編集 */}
          <div className="flex-1 flex flex-col">
            {selectedDictionary ? (
              <>
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold mb-3">{selectedDictionary.name} の用語</h3>
                  
                  {/* 用語追加/編集 */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="置換前（ひらがな等）"
                      value={newTermFrom}
                      onChange={(e) => setNewTermFrom(e.target.value)}
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="置換後（漢字・カタカナ等）"
                      value={newTermTo}
                      onChange={(e) => setNewTermTo(e.target.value)}
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex space-x-2">
                    {editingTerm ? (
                      <>
                        <button
                          onClick={handleUpdateTerm}
                          disabled={!newTermFrom.trim() || !newTermTo.trim()}
                          className="bg-blue-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          更新
                        </button>
                        <button
                          onClick={() => {
                            setEditingTerm(null)
                            setNewTermFrom('')
                            setNewTermTo('')
                          }}
                          className="bg-gray-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-gray-700"
                        >
                          キャンセル
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleAddTerm}
                        disabled={!newTermFrom.trim() || !newTermTo.trim()}
                        className="bg-green-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        追加
                      </button>
                    )}
                  </div>
                </div>

                {/* 用語一覧 */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-2">
                    {selectedDictionary.terms
                      .sort((a, b) => b.usage - a.usage) // 使用頻度順
                      .map(term => (
                      <div key={term.id} className="border rounded-lg p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {term.from}
                            </span>
                            <span className="text-gray-500">→</span>
                            <span className="font-mono text-sm bg-blue-100 px-2 py-1 rounded">
                              {term.to}
                            </span>
                            <span className="text-xs text-gray-500">
                              使用: {term.usage}回
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditTerm(term)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDeleteTerm(term.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                辞書を選択してください
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}