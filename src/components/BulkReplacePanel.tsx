'use client'

import { useState, useEffect } from 'react'

interface ReplaceRule {
  id: string
  from: string
  to: string
}

interface BulkReplacePanelProps {
  originalText: string
  onTextChange: (newText: string) => void
  onSaveToDictionary?: (rules: ReplaceRule[]) => void
}

export default function BulkReplacePanel({ originalText, onTextChange, onSaveToDictionary }: BulkReplacePanelProps) {
  const [replaceRules, setReplaceRules] = useState<ReplaceRule[]>([])
  const [previewText, setPreviewText] = useState(originalText)
  const [newRuleFrom, setNewRuleFrom] = useState('')
  const [newRuleTo, setNewRuleTo] = useState('')

  // originalTextが変更されたらpreviewTextも更新
  useEffect(() => {
    setPreviewText(originalText)
    setReplaceRules([])
  }, [originalText])

  const createRule = (from: string, to: string): ReplaceRule => ({
    id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    from,
    to
  })

  const addRule = () => {
    if (!newRuleFrom.trim() || !newRuleTo.trim()) return

    const newRule = createRule(newRuleFrom.trim(), newRuleTo.trim())
    const updatedRules = [...replaceRules, newRule]
    setReplaceRules(updatedRules)
    setNewRuleFrom('')
    setNewRuleTo('')
    
    // プレビューを更新
    updatePreview(updatedRules)
  }

  const removeRule = (id: string) => {
    const updatedRules = replaceRules.filter(rule => rule.id !== id)
    setReplaceRules(updatedRules)
    updatePreview(updatedRules)
  }

  const updateRule = (id: string, from: string, to: string) => {
    const updatedRules = replaceRules.map(rule =>
      rule.id === id ? { ...rule, from, to } : rule
    )
    setReplaceRules(updatedRules)
    updatePreview(updatedRules)
  }

  const updatePreview = (rules: ReplaceRule[]) => {
    let text = originalText
    rules.forEach(rule => {
      if (rule.from && rule.to) {
        const regex = new RegExp(rule.from, 'g')
        text = text.replace(regex, rule.to)
      }
    })
    setPreviewText(text)
  }

  const applyReplacements = () => {
    onTextChange(previewText)
    // ルールをクリア
    setReplaceRules([])
    setPreviewText(originalText)
  }

  const applyAndSaveToDictionary = () => {
    if (replaceRules.length === 0) return
    
    // 先に辞書に保存
    if (onSaveToDictionary) {
      onSaveToDictionary(replaceRules)
    }
    
    // その後でテキストに適用
    onTextChange(previewText)
    
    // ルールをクリア（適用されたテキストが新しい原文になる）
    setReplaceRules([])
    // 注意: previewTextは親コンポーネントで更新されたテキストに基づいて更新される
  }

  const resetPreview = () => {
    setReplaceRules([])
    setPreviewText(originalText)
    setNewRuleFrom('')
    setNewRuleTo('')
  }

  // 自動検出機能：ひらがな/カタカナの単語を抽出
  const detectSuspiciousWords = () => {
    const hiraganaWords = originalText.match(/[\u3040-\u309F]+/g) || []
    const katakanaWords = originalText.match(/[\u30A0-\u30FF]+/g) || []
    
    const allWords = [...new Set([...hiraganaWords, ...katakanaWords])]
      .filter(word => word.length >= 2) // 2文字以上
      .slice(0, 5) // 最初の5個まで

    const suggestedRules = allWords.map(word => createRule(word, ''))
    setReplaceRules(suggestedRules)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">クイック置換</h3>
        <div className="flex space-x-2">
          <button
            onClick={detectSuspiciousWords}
            className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
          >
            自動検出
          </button>
          <button
            onClick={resetPreview}
            className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
          >
            リセット
          </button>
        </div>
      </div>

      {/* 置換ルール一覧 */}
      <div className="space-y-2 mb-4">
        {replaceRules.map((rule) => (
          <div key={rule.id} className="flex items-center space-x-2">
            <input
              type="text"
              value={rule.from}
              onChange={(e) => updateRule(rule.id, e.target.value, rule.to)}
              placeholder="置換前"
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <span className="text-gray-500">→</span>
            <input
              type="text"
              value={rule.to}
              onChange={(e) => updateRule(rule.id, rule.from, e.target.value)}
              placeholder="置換後"
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <button
              onClick={() => removeRule(rule.id)}
              className="text-red-600 hover:text-red-800 px-2"
            >
              削除
            </button>
          </div>
        ))}
      </div>

      {/* 新規ルール追加 */}
      <div className="flex items-center space-x-2 mb-4">
        <input
          type="text"
          value={newRuleFrom}
          onChange={(e) => setNewRuleFrom(e.target.value)}
          placeholder="置換前の文字"
          className="flex-1 px-3 py-2 border rounded-lg text-sm"
          onKeyPress={(e) => e.key === 'Enter' && addRule()}
        />
        <span className="text-gray-500">→</span>
        <input
          type="text"
          value={newRuleTo}
          onChange={(e) => setNewRuleTo(e.target.value)}
          placeholder="置換後の文字"
          className="flex-1 px-3 py-2 border rounded-lg text-sm"
          onKeyPress={(e) => e.key === 'Enter' && addRule()}
        />
        <button
          onClick={addRule}
          disabled={!newRuleFrom.trim() || !newRuleTo.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          追加
        </button>
      </div>

      {/* プレビュー */}
      {replaceRules.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">プレビュー:</h4>
          <div className="bg-gray-50 p-3 rounded-lg border">
            <pre className="text-sm whitespace-pre-wrap font-sans">{previewText}</pre>
          </div>
        </div>
      )}

      {/* アクションボタン */}
      {replaceRules.length > 0 && (
        <div className="flex space-x-2">
          <button
            onClick={applyReplacements}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            適用
          </button>
          {onSaveToDictionary && (
            <button
              onClick={applyAndSaveToDictionary}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              適用して辞書に保存
            </button>
          )}
        </div>
      )}
    </div>
  )
}