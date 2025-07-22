'use client'

import { useState, useEffect } from 'react'
import { videoConverter } from '@/utils/videoConverter'
import { DictionaryStorageRedis } from '@/utils/dictionaryStorageRedis'
import DictionaryManager from '@/components/DictionaryManager'
import BulkReplacePanel from '@/components/BulkReplacePanel'
import AccessControl from '@/components/AccessControl'
import AdminPanel from '@/components/AdminPanel'

interface Segment {
  start: number
  end: number
  text: string
}

interface MainAppProps {
  currentUserId?: string
}

function MainApp({ currentUserId }: MainAppProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [transcription, setTranscription] = useState<string>('')
  const [segments, setSegments] = useState<Segment[]>([])
  const [rewrittenText, setRewrittenText] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [step, setStep] = useState<'upload' | 'convert' | 'transcribe' | 'rewrite'>('upload')
  const [showOriginalText, setShowOriginalText] = useState(false)
  const [summaryLevel, setSummaryLevel] = useState<0 | 1 | 2 | 3>(1)
  const [showDictionaryManager, setShowDictionaryManager] = useState(false)
  const [activeDictionaries, setActiveDictionaries] = useState<string[]>([])
  const [appliedTermsCount, setAppliedTermsCount] = useState(0)
  const [showBulkReplace, setShowBulkReplace] = useState(false)
  const [originalRewrittenText, setOriginalRewrittenText] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [maxCharsPerLine, setMaxCharsPerLine] = useState(20)
  const [maxLines, setMaxLines] = useState(2)
  const [politeStyle, setPoliteStyle] = useState<'auto' | 'polite' | 'casual'>('auto')
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'converting' | 'transcribing' | 'generating' | 'completed'>('idle')
  const [progressPercent, setProgressPercent] = useState(0)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const getStatusMessage = () => {
    switch (processingStatus) {
      case 'converting': return '動画変換中...'
      case 'transcribing': return '音声認識中...'
      case 'generating': return 'テロップ生成中...'
      case 'completed': return '✅ 完了'
      default: return null
    }
  }

  useEffect(() => {
    const initializeUser = async () => {
      // propsまたはローカルストレージからユーザーIDを取得
      const finalUserId = currentUserId || localStorage.getItem('telop-userId')
      console.log('🔧 useEffect userId check:', { currentUserId, localStorage: localStorage.getItem('telop-userId'), finalUserId })
      setUserId(finalUserId)
      
      if (finalUserId) {
        // アクティブな辞書を読み込み
        const activeDicts = await DictionaryStorageRedis.getActiveDictionaries(finalUserId)
        setActiveDictionaries(activeDicts)
        
        // 管理者チェック
        fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'isAdmin', userId: finalUserId })
        })
        .then(r => r.json())
        .then(result => setIsAdmin(result.isAdmin || false))
        .catch(() => setIsAdmin(false))
      } else {
        setIsAdmin(false)
        setActiveDictionaries([])
      }
    }
    
    initializeUser()
  }, [currentUserId])

  const handleDictionariesChange = async () => {
    if (userId) {
      const activeDicts = await DictionaryStorageRedis.getActiveDictionaries(userId)
      setActiveDictionaries(activeDicts)
    }
  }

  const applyDictionaries = async (text: string): Promise<string> => {
    if (!userId) return text
    
    const result = await DictionaryStorageRedis.applyDictionaries(userId, text, activeDictionaries)
    setAppliedTermsCount(result.appliedTerms.length)
    return result.text
  }

  // ファイル時間取得ヘルパー関数
  const getFileDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const isVideo = file.type.startsWith('video/')
      const element = isVideo ? document.createElement('video') : document.createElement('audio')
      
      element.preload = 'metadata'
      element.onloadedmetadata = () => {
        URL.revokeObjectURL(element.src)
        resolve(element.duration)
      }
      element.onerror = () => {
        URL.revokeObjectURL(element.src)
        reject(new Error('メディアファイルの読み込みに失敗しました'))
      }
      
      element.src = URL.createObjectURL(file)
    })
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
      
      // ファイルサイズチェック（OpenAI Whisper API 25MB制限）
      const fileSizeMB = file.size / (1024 * 1024)
      console.log(`File size check: ${fileSizeMB.toFixed(2)}MB`)
      
      if (fileSizeMB > 25) {
        alert(`ファイルサイズが大きすぎます\n\n現在のファイル: ${fileSizeMB.toFixed(1)}MB\n制限サイズ: 25MB\n\nより小さなファイルをアップロードしてください。`)
        event.target.value = ''
        return
      }
      
      // 大きなファイル（5MB以上）への警告
      if (fileSizeMB > 5) {
        const proceed = confirm(`大きなファイルです (${fileSizeMB.toFixed(1)}MB)\n\nアップロードに時間がかかる可能性があります。\n続行しますか？`)
        if (!proceed) {
          event.target.value = ''
          return
        }
      }
      
      try {
        // ファイル時間をチェック
        const durationSeconds = await getFileDuration(file)
        const durationMinutes = durationSeconds / 60
        
        console.log(`File duration: ${durationMinutes.toFixed(2)} minutes, File size: ${fileSizeMB.toFixed(1)}MB`)
        
        // 時間制限チェック（30分制限）
        if (durationMinutes > 30) {
          const currentTime = `${Math.floor(durationMinutes)}分${Math.floor((durationMinutes % 1) * 60)}秒`
          alert(`ファイルの時間が制限を超えています\n\n現在のファイル: ${currentTime}\n制限時間: 30分\n\n30分以内のファイルをアップロードしてください。`)
          event.target.value = ''
          return
        }
        
        // ユーザー固有の制限チェック（ログイン済みかつRedis利用可能な場合）
        if (userId) {
          try {
            const response = await fetch('/api/check-duration', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                userId, 
                durationMinutes: durationMinutes 
              })
            })
            
            if (response.ok) {
              const result = await response.json()
              
              if (!result.canUpload) {
                alert(result.reason || 'ファイルの時間が制限を超えています')
                event.target.value = ''
                return
              }
            } else {
              // Redis接続エラーの場合は基本制限のみ適用して続行
              console.warn('User-specific duration check failed, using basic 30min limit only')
            }
          } catch (error) {
            // エラーが発生した場合は基本制限のみ適用して続行
            console.warn('Duration check API error:', error)
          }
        }
      } catch (error) {
        console.error('Duration check failed:', error)
        alert('ファイルの時間取得に失敗しました')
        event.target.value = ''
        return
      }
      
      // ファイルタイプの判定を拡張
      const isVideoFile = file.type.startsWith('video/') || 
                         file.name.toLowerCase().endsWith('.mp4') ||
                         file.name.toLowerCase().endsWith('.mov') ||
                         file.name.toLowerCase().endsWith('.avi') ||
                         file.name.toLowerCase().endsWith('.mkv') ||
                         file.name.toLowerCase().endsWith('.webm')
      
      if (isVideoFile) {
        console.log('Video file detected, starting conversion...')
        const controller = new AbortController()
        setAbortController(controller)
        setIsConverting(true)
        setStep('convert')
        setProcessingStatus('converting')
        setProgressPercent(10)
        
        try {
          const convertedAudio = await videoConverter.convertMP4ToMP3(file, controller.signal)
          if (!controller.signal.aborted) {
            setAudioFile(convertedAudio)
            console.log('Video conversion successful')
          }
        } catch (error) {
          if (controller.signal.aborted) {
            console.log('Video conversion aborted by user')
            alert('動画変換がキャンセルされました。')
          } else {
            console.error('Video conversion failed:', error)
            // フォールバック: 簡単な音声抽出を試行
            try {
              const extractedAudio = await videoConverter.extractAudioSimple(file, controller.signal)
              if (!controller.signal.aborted) {
                setAudioFile(extractedAudio)
                console.log('Fallback audio extraction successful')
              }
            } catch (fallbackError) {
              console.error('Audio extraction failed:', fallbackError)
              if (!controller.signal.aborted) {
                alert('動画ファイルの変換に失敗しました。音声ファイルを直接アップロードしてください。')
              }
            }
          }
        } finally {
          setIsConverting(false)
          setAbortController(null)
          setStep('upload')
          if (processingStatus === 'converting') {
            setProcessingStatus('idle')
            setProgressPercent(0)
          }
        }
      } else {
        console.log('Audio file detected, using directly')
        setAudioFile(file)
      }
    }
  }

  // チャンクアップロード関数
  const handleChunkUpload = async (file: File): Promise<{transcription: string, segments?: Segment[], language?: string, duration?: number, method: string}> => {
    const CHUNK_SIZE = 1024 * 1024 // 1MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.log(`🔄 Starting chunk upload: ${totalChunks} chunks for ${file.name}`)
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)
      
      console.log(`📤 Uploading chunk ${i + 1}/${totalChunks} (${chunk.size} bytes)`)
      
      const formData = new FormData()
      formData.append('action', 'upload-chunk')
      formData.append('uploadId', uploadId)
      formData.append('chunkIndex', i.toString())
      formData.append('totalChunks', totalChunks.toString())
      formData.append('chunk', chunk)
      formData.append('filename', file.name)
      if (userId) {
        formData.append('userId', userId)
      }
      
      const response = await fetch('/api/transcribe-chunks', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`Chunk upload failed: ${response.status}`)
      }
      
      const result = await response.json()
      
      // 全チャンクが完了した場合は結果を返す
      if (result.transcription) {
        console.log('✅ Chunk upload and transcription completed')
        return result
      }
      
      // プログレス更新
      const chunkProgress = ((i + 1) / totalChunks) * 60 // 60%まで
      setProgressPercent(20 + chunkProgress)
    }
    
    throw new Error('Chunk upload completed but no transcription received')
  }

  const handleTranscribe = async () => {
    // CRITICAL FIX: Force rebuild 2025-01-22-v2 - chunk upload implementation
    if (!audioFile) return
    
    setIsLoading(true)
    setStep('transcribe')
    setProcessingStatus('transcribing')
    setProgressPercent(20)
    
    try {
      console.log('Starting transcription for file:', audioFile.name, audioFile.type)
      console.log('🔍 Client-side userId check:', userId)
      console.log('🔍 localStorage userId:', localStorage.getItem('telop-userId'))
      console.log('🔍 localStorage auth:', localStorage.getItem('telop-auth'))
      
      // ファイルサイズを再計算
      const fileSizeMB = audioFile.size / (1024 * 1024)
      console.log(`Transcription file size: ${fileSizeMB.toFixed(2)}MB`)
      
      let data: {transcription: string, segments?: Segment[], language?: string, duration?: number, method?: string} | null = null
      
      // APIの試行順序: 標準API → チャンクアップロード
      let uploadSucceeded = false
      
      // 1. 標準APIを試行
      if (!uploadSucceeded) {
        try {
          const formData = new FormData()
          formData.append('audio', audioFile)
          if (userId) {
            console.log('✅ Adding userId to formData:', userId)
            formData.append('userId', userId)
          } else {
            console.log('❌ No userId to add to formData')
          }
          
          console.log('FormData details:', Array.from(formData.entries()).map(([key, value]) => 
            [key, typeof value === 'string' ? value : `File(${(value as File).name}, ${(value as File).size} bytes)`]
          ))
          
          console.log(`🔄 Trying standard API for ${fileSizeMB.toFixed(1)}MB file`)
          
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
          })
          
          console.log('Standard API response status:', response.status)
          
          if (response.ok) {
            data = await response.json()
            console.log('✅ Standard API succeeded')
            uploadSucceeded = true
          } else if (response.status === 413) {
            console.log('❌ Standard API failed with 413')
          } else {
            let errorMessage = `HTTP error! status: ${response.status}`
            try {
              const errorData = await response.json()
              console.log('Error response data:', errorData)
              errorMessage = errorData.error || errorMessage
            } catch {
              console.log('Failed to parse error response as JSON')
            }
            throw new Error(errorMessage)
          }
        } catch (error) {
          if (error instanceof Error && !error.message.includes('413')) {
            throw error
          }
          console.log('Standard API failed, will try chunk upload')
        }
      }
      
      // 2. 標準APIが失敗した場合、チャンクアップロードを試行
      if (!uploadSucceeded) {
        try {
          console.log('🔄 Switching to chunk upload method')
          data = await handleChunkUpload(audioFile)
          uploadSucceeded = true
        } catch (error) {
          console.error('Chunk upload also failed:', error)
          throw error
        }
      }
      
      console.log('Transcription response data:', data)
      
      if (data.transcription) {
        setTranscription(data.transcription)
        setProgressPercent(80)
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
      setProcessingStatus('idle')
      setProgressPercent(0)
    }
  }

  const handleRewrite = async (text: string, segmentsData?: Segment[]) => {
    setStep('rewrite')
    setProcessingStatus('generating')
    setProgressPercent(80)
    
    try {
      console.log('Starting text rewrite for:', text.substring(0, 100) + '...')
      console.log('Segments data for rewrite:', segmentsData ? segmentsData.length : 0)
      console.log('Summary level:', summaryLevel)
      
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text, 
          segments: segmentsData || segments, 
          summaryLevel, 
          userId,
          maxCharsPerLine,
          maxLines,
          politeStyle
        }),
      })
      
      console.log('Rewrite response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Rewrite response data:', data)
      
      if (data.rewrittenText) {
        // 辞書を適用してテロップテキストを修正
        const processedText = await applyDictionaries(data.rewrittenText)
        setOriginalRewrittenText(processedText) // 元のテキストを保存
        setRewrittenText(processedText)
        setShowBulkReplace(false) // 新しい結果が来たら置換パネルを閉じる
        setProcessingStatus('completed')
        setProgressPercent(100)
        
        // 3秒後に完了表示をクリア
        setTimeout(() => {
          setProcessingStatus('idle')
          setProgressPercent(0)
        }, 3000)
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
      // エラーの場合のみリセット（成功時はcompletedのまま保持）
      if (processingStatus === 'generating') {
        setProcessingStatus('idle')
        setProgressPercent(0)
      }
    }
  }

  const handleAbort = () => {
    if (abortController) {
      abortController.abort()
      setIsConverting(false)
      setAbortController(null)
      setStep('upload')
      setProcessingStatus('idle')
      setProgressPercent(0)
    }
  }

  const handleReset = () => {
    // 進行中の処理がある場合は中止
    if (abortController) {
      handleAbort()
    }
    setAudioFile(null)
    setTranscription('')
    setSegments([])
    setRewrittenText('')
    setOriginalRewrittenText('')
    setStep('upload')
    setShowOriginalText(false)
    setAppliedTermsCount(0)
    setShowBulkReplace(false)
    setProcessingStatus('idle')
    setProgressPercent(0)
  }

  const handleBulkReplaceTextChange = (newText: string) => {
    setRewrittenText(newText)
    setShowBulkReplace(false)
  }

  const handleSaveToDictionary = async (rules: { id: string, from: string, to: string }[]) => {
    if (!userId) return
    
    // アクティブな辞書があれば最初の辞書に保存、なければ新規作成
    const dictionaries = await DictionaryStorageRedis.getDictionaries(userId)
    const activeDictionaries = await DictionaryStorageRedis.getActiveDictionaries(userId)
    
    let targetDictionary = null
    if (activeDictionaries.length > 0) {
      targetDictionary = dictionaries.find(d => d.id === activeDictionaries[0])
    }
    
    if (!targetDictionary) {
      // 新規辞書を作成
      const newDict = DictionaryStorageRedis.createDictionary('クイック置換から追加')
      await DictionaryStorageRedis.addDictionary(userId, newDict)
      targetDictionary = newDict
    }
    
    // 用語を追加
    const newTerms = rules.map(rule => 
      DictionaryStorageRedis.createTerm(rule.from, rule.to)
    )
    
    const updatedTerms = [...targetDictionary.terms, ...newTerms]
    await DictionaryStorageRedis.updateDictionary(userId, targetDictionary.id, { terms: updatedTerms })
    
    // アクティブ辞書リストを更新
    await handleDictionariesChange()
    
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
    if (!rewrittenText || segments.length === 0) {
      console.log('Export failed: rewrittenText or segments missing', { rewrittenText: !!rewrittenText, segments: segments.length })
      return
    }

    // テロップ用テキストと元のセグメントタイムスタンプを対応付け
    const telopLines = rewrittenText.split('\n').filter(line => line.trim())
    console.log('Telop lines:', telopLines)
    console.log('Available segments:', segments.length)
    
    let srtContent = ''
    let telopIndex = 0
    let srtIndex = 1

    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = Math.floor(seconds % 60)
      const ms = Math.floor((seconds % 1) * 1000)
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
    }

    telopLines.forEach((line, index) => {
      // [MM:SS.S] 形式のタイムスタンプを検出
      const timestampMatch = line.match(/^\[(\d+):(\d+\.\d+)\]\s*(.*)/)
      
      console.log(`Line ${index}: "${line}" - Match:`, timestampMatch)
      
      if (timestampMatch) {
        const minutes = parseInt(timestampMatch[1])
        const seconds = parseFloat(timestampMatch[2])
        const text = timestampMatch[3].trim()
        
        if (text) {
          const targetTime = minutes * 60 + seconds
          
          // 対応する元のセグメントを探す
          let bestSegment = segments[0]
          let minDiff = Math.abs(segments[0].start - targetTime)
          
          for (let i = 1; i < segments.length; i++) {
            const diff = Math.abs(segments[i].start - targetTime)
            if (diff < minDiff) {
              minDiff = diff
              bestSegment = segments[i]
            }
          }
          
          console.log(`Found segment for time ${targetTime}:`, bestSegment)
          
          // 元のセグメントのタイムスタンプを使用
          srtContent += `${srtIndex}\n`
          srtContent += `${formatTime(bestSegment.start)} --> ${formatTime(bestSegment.end)}\n`
          srtContent += `${text}\n\n`
          srtIndex++
        }
      } else if (line.trim()) {
        // タイムスタンプがない場合は対応するセグメントを使用
        if (telopIndex < segments.length) {
          const segment = segments[telopIndex]
          console.log(`Using segment ${telopIndex} for line without timestamp:`, segment)
          srtContent += `${srtIndex}\n`
          srtContent += `${formatTime(segment.start)} --> ${formatTime(segment.end)}\n`
          srtContent += `${line.trim()}\n\n`
          srtIndex++
          telopIndex++
        }
      }
    })

    console.log('Final SRT content:', srtContent)

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
            {userId && isAdmin && (
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
                      <div className="text-center mt-2">
                        <span className="text-sm text-gray-500 block">
                          対応形式: MP3, WAV, M4A, MP4, MOV, AVI等
                        </span>
                        <span className="text-sm text-blue-600 font-medium block mt-1">
                          ⏱️ 最大30分まで
                        </span>
                      </div>
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
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSummaryLevel(0)}
                        className={`px-3 py-2 text-sm rounded-lg border ${
                          summaryLevel === 0 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        原文ベース<br/><span className="text-xs">口癖削除のみ</span>
                      </button>
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
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
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
                  
                  {/* テロップ形式設定 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      テロップ形式設定
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">1行の文字数</label>
                        <select
                          value={maxCharsPerLine}
                          onChange={(e) => setMaxCharsPerLine(parseInt(e.target.value))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={10}>10文字</option>
                          <option value={15}>15文字</option>
                          <option value={20}>20文字</option>
                          <option value={25}>25文字</option>
                          <option value={30}>30文字</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">同時表示行数</label>
                        <select
                          value={maxLines}
                          onChange={(e) => setMaxLines(parseInt(e.target.value))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={1}>1行</option>
                          <option value={2}>2行</option>
                          <option value={3}>3行</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 敬語設定 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      敬語設定
                    </label>
                    <select
                      value={politeStyle}
                      onChange={(e) => setPoliteStyle(e.target.value as 'auto' | 'polite' | 'casual')}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="auto">元の調子を保持</option>
                      <option value="polite">です・ます調（丁寧語）</option>
                      <option value="casual">だ・である調（常体）</option>
                    </select>
                  </div>

                  {/* ステータス表示とプログレスバー */}
                  {processingStatus !== 'idle' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {getStatusMessage()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            {progressPercent}%
                          </span>
                          {processingStatus === 'converting' && abortController && (
                            <button
                              onClick={handleAbort}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              中止
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            processingStatus === 'completed' ? 'bg-green-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={handleTranscribe}
                    disabled={isLoading || isConverting}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {getStatusMessage() || '文字起こし開始'}
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
        userId={userId || undefined}
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
