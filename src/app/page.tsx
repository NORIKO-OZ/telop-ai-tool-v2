'use client'

import { useState, useEffect } from 'react'
import { videoConverter } from '@/utils/videoConverter'
import { DictionaryStorage } from '@/utils/dictionaryStorage'
import DictionaryManager from '@/components/DictionaryManager'
import BulkReplacePanel from '@/components/BulkReplacePanel'
import AccessControl from '@/components/AccessControl'
import AdminPanel from '@/components/AdminPanel'
import { UserManager } from '@/utils/userManager'

interface Segment {
  start: number
  end: number
  text: string
}

function MainApp() {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [transcription, setTranscription] = useState<string>('')
  const [segments, setSegments] = useState<Segment[]>([])
  const [rewrittenText, setRewrittenText] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [step, setStep] = useState<'upload' | 'convert' | 'transcribe' | 'rewrite'>('upload')
  const [showOriginalText, setShowOriginalText] = useState(false)
  const [summaryLevel, setSummaryLevel] = useState<1 | 2 | 3>(2)
  const [showDictionaryManager, setShowDictionaryManager] = useState(false)
  const [activeDictionaries, setActiveDictionaries] = useState<string[]>([])
  const [appliedTermsCount, setAppliedTermsCount] = useState(0)
  const [showBulkReplace, setShowBulkReplace] = useState(false)
  const [originalRewrittenText, setOriginalRewrittenText] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [showAdminPanel, setShowAdminPanel] = useState(false)

  useEffect(() => {
    // アクティブな辞書を読み込み
    setActiveDictionaries(DictionaryStorage.getActiveDictionaries())
    
    // ローカルストレージからユーザーIDを取得
    const storedUserId = localStorage.getItem('telop-userId')
    setUserId(storedUserId)
  }, [])

  const handleDictionariesChange = () => {
    setActiveDictionaries(DictionaryStorage.getActiveDictionaries())
  }

  const applyDictionaries = (text: string): string => {
    const result = DictionaryStorage.applyDictionaries(text, activeDictionaries)
    setAppliedTermsCount(result.appliedTerms.length)
    return result.text
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    
    // 処理中の場合は新しいアップロードを拒否
    if (isLoading || isConverting) {
      alert('現在処理中です。完了してから新しいファイルをアップロードしてください。')
      // ファイル入力をリセット
      event.target.value = ''
      return
    }
    
    if (file) {
      console.log('File uploaded:', file.name, file.type, file.size)
      
      // ファイルタイプの判定を拡張
      const isVideoFile = file.type.startsWith('video/') || 
                         file.name.toLowerCase().endsWith('.mp4') ||
                         file.name.toLowerCase().endsWith('.mov') ||
                         file.name.toLowerCase().endsWith('.avi') ||
                         file.name.toLowerCase().endsWith('.mkv') ||
                         file.name.toLowerCase().endsWith('.webm')
      
      if (isVideoFile) {
        console.log('Video file detected, starting conversion...')
        setIsConverting(true)
        setStep('convert')
        try {
          const convertedAudio = await videoConverter.convertMP4ToMP3(file)
          setAudioFile(convertedAudio)
          console.log('Video conversion successful')
        } catch (error) {
          console.error('Video conversion failed:', error)
          // フォールバック: 簡単な音声抽出を試行
          try {
            const extractedAudio = await videoConverter.extractAudioSimple(file)
            setAudioFile(extractedAudio)
            console.log('Fallback audio extraction successful')
          } catch (fallbackError) {
            console.error('Audio extraction failed:', fallbackError)
            alert('動画ファイルの変換に失敗しました。音声ファイルを直接アップロードしてください。')
          }
        } finally {
          setIsConverting(false)
          setStep('upload')
        }
      } else {
        console.log('Audio file detected, using directly')
        setAudioFile(file)
      }
    }
  }

  const handleTranscribe = async () => {
    if (!audioFile) return
    
    setIsLoading(true)
    setStep('transcribe')
    
    try {
      console.log('Starting transcription for file:', audioFile.name, audioFile.type)
      const formData = new FormData()
      formData.append('audio', audioFile)
      if (userId) {
        formData.append('userId', userId)
      }
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })
      
      console.log('Transcription response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Transcription response data:', data)
      
      if (data.transcription) {
        setTranscription(data.transcription)
        if (data.segments) {
          setSegments(data.segments)
          console.log('Segments received:', data.segments.length)
          await handleRewrite(data.transcription, data.segments)
        } else {
          await handleRewrite(data.transcription)
        }
      } else if (data.error) {
        console.error('Server error details:', data.details)
        throw new Error(`${data.error}${data.details ? ': ' + data.details : ''}`)
      } else {
        throw new Error('No transcription data received')
      }
    } catch (error) {
      console.error('Transcription error:', error)
      alert(`文字起こしエラー: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsLoading(false)
      setStep('upload')
    }
  }

  const handleRewrite = async (text: string, segmentsData?: Segment[]) => {
    setStep('rewrite')
    
    try {
      console.log('Starting text rewrite for:', text.substring(0, 100) + '...')
      console.log('Segments data for rewrite:', segmentsData ? segmentsData.length : 0)
      console.log('Summary level:', summaryLevel)
      
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, segments: segmentsData || segments, summaryLevel, userId }),
      })
      
      console.log('Rewrite response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Rewrite response data:', data)
      
      if (data.rewrittenText) {
        // 辞書を適用してテロップテキストを修正
        const processedText = applyDictionaries(data.rewrittenText)
        setOriginalRewrittenText(processedText) // 元のテキストを保存
        setRewrittenText(processedText)
        setShowBulkReplace(false) // 新しい結果が来たら置換パネルを閉じる
      } else if (data.error) {
        console.error('Rewrite server error details:', data.details)
        throw new Error(`${data.error}${data.details ? ': ' + data.details : ''}`)
      } else {
        throw new Error('No rewritten text received')
      }
    } catch (error) {
      console.error('Rewrite error:', error)
      alert(`テロップ変換エラー: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setAudioFile(null)
    setTranscription('')
    setSegments([])
    setRewrittenText('')
    setOriginalRewrittenText('')
    setStep('upload')
    setShowOriginalText(false)
    setAppliedTermsCount(0)
    setShowBulkReplace(false)
  }

  const handleBulkReplaceTextChange = (newText: string) => {
    setRewrittenText(newText)
    setShowBulkReplace(false)
  }

  const handleSaveToDictionary = (rules: { id: string, from: string, to: string }[]) => {
    // アクティブな辞書があれば最初の辞書に保存、なければ新規作成
    const dictionaries = DictionaryStorage.getDictionaries()
    const activeDictionaries = DictionaryStorage.getActiveDictionaries()
    
    let targetDictionary = null
    if (activeDictionaries.length > 0) {
      targetDictionary = dictionaries.find(d => d.id === activeDictionaries[0])
    }
    
    if (!targetDictionary) {
      // 新規辞書を作成
      const newDict = DictionaryStorage.createDictionary('クイック置換から追加')
      DictionaryStorage.addDictionary(newDict)
      targetDictionary = newDict
    }
    
    // 用語を追加
    const newTerms = rules.map(rule => 
      DictionaryStorage.createTerm(rule.from, rule.to)
    )
    
    const updatedTerms = [...targetDictionary.terms, ...newTerms]
    DictionaryStorage.updateDictionary(targetDictionary.id, { terms: updatedTerms })
    
    // アクティブ辞書リストを更新
    handleDictionariesChange()
    
    alert(`${rules.length}個の用語を辞書に保存しました`)
  }

  const exportOriginalSRT = () => {
    if (segments.length === 0) return

    let srtContent = ''
    segments.forEach((segment, index) => {
      const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = Math.floor(seconds % 60)
        const ms = Math.floor((seconds % 1) * 1000)
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
      }

      srtContent += `${index + 1}\n`
      srtContent += `${formatTime(segment.start)} --> ${formatTime(segment.end)}\n`
      srtContent += `${segment.text}\n\n`
    })

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${audioFile?.name.replace(/\.[^/.]+$/, '') || 'transcript'}_original.srt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportTelopSRT = () => {
    if (!rewrittenText) return

    // テロップ用テキストからタイムスタンプを抽出してSRT形式に変換
    const lines = rewrittenText.split('\n').filter(line => line.trim())
    let srtContent = ''
    let index = 1

    lines.forEach((line) => {
      // [MM:SS.S] 形式のタイムスタンプを検出
      const timestampMatch = line.match(/^\[(\d+):(\d+\.\d+)\]\s*(.*)/)
      
      if (timestampMatch) {
        const minutes = parseInt(timestampMatch[1])
        const seconds = parseFloat(timestampMatch[2])
        const text = timestampMatch[3].trim()
        
        if (text) {
          const startSeconds = minutes * 60 + seconds
          const endSeconds = startSeconds + 3 // デフォルト3秒表示
          
          const formatTime = (totalSeconds: number) => {
            const hours = Math.floor(totalSeconds / 3600)
            const mins = Math.floor((totalSeconds % 3600) / 60)
            const secs = Math.floor(totalSeconds % 60)
            const ms = Math.floor((totalSeconds % 1) * 1000)
            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
          }

          srtContent += `${index}\n`
          srtContent += `${formatTime(startSeconds)} --> ${formatTime(endSeconds)}\n`
          srtContent += `${text}\n\n`
          index++
        }
      } else if (line.trim()) {
        // タイムスタンプがない場合のフォールバック
        srtContent += `${index}\n`
        srtContent += `00:00:00,000 --> 00:00:03,000\n`
        srtContent += `${line.trim()}\n\n`
        index++
      }
    })

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${audioFile?.name.replace(/\.[^/.]+$/, '') || 'telop'}_telop.srt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <div></div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                AI テロップ作成ツール v2
              </h1>
              <p className="text-gray-600">
                音声を文字起こしして、テロップ用の短文に自動変換します
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowDictionaryManager(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>用語辞書</span>
            </button>
            {userId && UserManager.isAdmin(userId) && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>管理者パネル</span>
              </button>
            )}
          </div>
          
          {/* 辞書状態表示 */}
          {activeDictionaries.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-center space-x-4 text-sm text-blue-700">
                <span>📚 有効な辞書: {activeDictionaries.length}個</span>
                {appliedTermsCount > 0 && (
                  <span>🔄 適用された用語: {appliedTermsCount}個</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ステップインジケーター */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${step === 'upload' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span>ファイルアップロード</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${step === 'convert' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'convert' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span>動画変換</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${step === 'transcribe' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'transcribe' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span>文字起こし</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${step === 'rewrite' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'rewrite' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                4
              </div>
              <span>テロップ化</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左側: アップロード・制御 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">音声・動画ファイル</h2>
              
              {!audioFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept="audio/*,video/*,.mp4,.mov,.avi,.mkv,.webm,.mp3,.wav,.m4a,.aac,.ogg"
                    onChange={handleFileUpload}
                    disabled={isLoading || isConverting}
                    className="hidden"
                    id="audio-upload"
                  />
                  <label
                    htmlFor="audio-upload"
                    className={`flex flex-col items-center ${isLoading || isConverting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-gray-600">
                      {isLoading || isConverting ? '処理中...' : '音声・動画ファイルをドラッグ&ドロップまたはクリック'}
                    </span>
                    {!isLoading && !isConverting && (
                      <span className="text-sm text-gray-500 mt-2">
                        対応形式: MP3, WAV, M4A, MP4, MOV, AVI等
                      </span>
                    )}
                    {(isLoading || isConverting) && (
                      <span className="text-sm text-orange-500 mt-2">
                        現在他のファイルを処理中です
                      </span>
                    )}
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">{audioFile.name}</span>
                    <button
                      onClick={handleReset}
                      className="text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
                  </div>
                  
                  {/* 要約レベル選択 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      テロップの要約レベル
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setSummaryLevel(1)}
                        className={`px-3 py-2 text-sm rounded-lg border ${
                          summaryLevel === 1 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        レベル1<br/><span className="text-xs">詳細(80%)</span>
                      </button>
                      <button
                        onClick={() => setSummaryLevel(2)}
                        className={`px-3 py-2 text-sm rounded-lg border ${
                          summaryLevel === 2 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        レベル2<br/><span className="text-xs">標準(50%)</span>
                      </button>
                      <button
                        onClick={() => setSummaryLevel(3)}
                        className={`px-3 py-2 text-sm rounded-lg border ${
                          summaryLevel === 3 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        レベル3<br/><span className="text-xs">簡潔(30%)</span>
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleTranscribe}
                    disabled={isLoading || isConverting}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isConverting ? '動画変換中...' : isLoading ? '処理中...' : '文字起こし開始'}
                  </button>
                </div>
              )}
            </div>

            {/* 元の文字起こし */}
            {transcription && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">元の文字起こし</h2>
                  <button
                    onClick={() => setShowOriginalText(!showOriginalText)}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200"
                  >
                    {showOriginalText ? '隠す' : '表示'}
                  </button>
                </div>
                {showOriginalText && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 leading-relaxed">{transcription}</p>
                  </div>
                )}
              </div>
            )}

            {/* タイムスタンプ付きセグメント */}
            {segments.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">タイムスタンプ付きセグメント</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {segments.map((segment, index) => (
                    <div key={index} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                      <div className="text-xs text-blue-600 font-mono min-w-[80px]">
                        {Math.floor(segment.start / 60)}:{(segment.start % 60).toFixed(1).padStart(4, '0')}
                      </div>
                      <div className="text-xs text-gray-500">→</div>
                      <div className="text-xs text-blue-600 font-mono min-w-[80px]">
                        {Math.floor(segment.end / 60)}:{(segment.end % 60).toFixed(1).padStart(4, '0')}
                      </div>
                      <div className="text-sm text-gray-700 flex-1">
                        {segment.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <button
                    onClick={exportOriginalSRT}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                  >
                    元音声SRTをダウンロード
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 右側: 結果表示 */}
          <div className="space-y-6">
            {rewrittenText && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">テロップ用テキスト</h2>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <pre className="text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                    {rewrittenText}
                  </pre>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(rewrittenText)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    コピー
                  </button>
                  <button
                    onClick={exportTelopSRT}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                  >
                    テロップSRTをダウンロード
                  </button>
                  <button
                    onClick={() => setShowBulkReplace(!showBulkReplace)}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
                  >
                    {showBulkReplace ? '置換を閉じる' : 'クイック置換'}
                  </button>
                  <button
                    onClick={handleReset}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                  >
                    リセット
                  </button>
                </div>
              </div>
            )}

            {/* クイック置換パネル */}
            {rewrittenText && showBulkReplace && (
              <BulkReplacePanel
                originalText={originalRewrittenText || rewrittenText}
                onTextChange={handleBulkReplaceTextChange}
                onSaveToDictionary={handleSaveToDictionary}
              />
            )}

            {/* 使い方説明 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">使い方</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>音声ファイル（mp3、wav、m4a等）または動画ファイル（mp4、mov、avi等）をアップロード</li>
                <li>動画ファイルの場合は自動で音声に変換</li>
                <li>「文字起こし開始」ボタンをクリック</li>
                <li>自動でテロップ用の短文に変換されます</li>
                <li>結果をコピーして動画編集ソフトで使用</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* 辞書管理モーダル */}
      <DictionaryManager
        isOpen={showDictionaryManager}
        onClose={() => setShowDictionaryManager(false)}
        onDictionariesChange={handleDictionariesChange}
      />

      {/* 管理者パネル */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-2xl font-bold">管理者パネル</h2>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <AdminPanel />
          </div>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <AccessControl>
      <MainApp />
    </AccessControl>
  )
}
