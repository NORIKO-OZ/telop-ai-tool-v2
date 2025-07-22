import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { UserManagerRedis as UserManager } from '@/utils/userManagerRedis'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const maxDuration = 300; // 5 minutes timeout
export const runtime = 'nodejs';

// Next.js App Router specific configuration
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  console.log('=== NEW Transcribe API called ===')
  console.log('Environment check:')
  console.log('- API Key exists:', !!process.env.OPENAI_API_KEY)
  
  try {
    // APIキーの詳細チェック
    const hasValidKey = process.env.OPENAI_API_KEY && 
                       process.env.OPENAI_API_KEY.trim() !== '' && 
                       process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'
    
    console.log('Has valid API key:', hasValidKey)
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
    console.log('Request method:', request.method)
    console.log('Content-Length header:', request.headers.get('content-length'))
    console.log('Content-Type header:', request.headers.get('content-type'))
    
    let formData: FormData
    try {
      console.log('Attempting to parse FormData...')
      // Request size check before parsing
      const contentLength = request.headers.get('content-length')
      if (contentLength) {
        const sizeInMB = parseInt(contentLength) / (1024 * 1024)
        console.log(`Request size: ${sizeInMB.toFixed(2)}MB`)
        
        if (sizeInMB > 25) {
          console.log('❌ Request too large before FormData parsing')
          return NextResponse.json({ 
            error: `リクエストサイズが大きすぎます (${sizeInMB.toFixed(1)}MB > 25MB)`,
            fileSize: sizeInMB,
            maxSize: 25
          }, { status: 413 })
        }
      }
      
      formData = await request.formData()
      console.log('✅ FormData parsed successfully')
    } catch (error) {
      console.error('❌ Failed to parse FormData:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown FormData error'
      
      // 413 error specific handling
      if (errorMessage.includes('413') || errorMessage.includes('too large') || errorMessage.includes('PayloadTooLargeError')) {
        return NextResponse.json({ 
          error: 'ファイルサイズが制限を超えています。25MB以下のファイルをアップロードしてください。',
          details: errorMessage
        }, { status: 413 })
      }
      
      return NextResponse.json({ 
        error: 'FormData解析エラー',
        details: errorMessage
      }, { status: 400 })
    }
    
    console.log('=== FormData Analysis ===')
    console.log('FormData entries:', Array.from(formData.entries()).map(([key, value]) => [key, typeof value === 'string' ? value : `File(${(value as File).name})`]))
    
    const audioFile = formData.get('audio') as File
    const userId = formData.get('userId') as string | null
    
    console.log('Extracted audioFile:', audioFile?.name || 'null')
    console.log('Extracted userId:', userId || 'null')
    
    console.log('Audio file info:', audioFile ? {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    } : 'No file')
    console.log('User ID from formData:', userId)
    console.log('FormData keys:', Array.from(formData.keys()))
    
    // userIdの詳細確認
    if (userId) {
      console.log('✅ UserID received:', userId)
    } else {
      console.log('❌ No UserID in request')
    }
    
    if (!audioFile) {
      console.log('No audio file provided')
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }

    // ユーザー認証と使用量・ファイルサイズチェック
    if (userId) {
      console.log('🔍 Redis: Getting user:', userId)
      const user = await UserManager.getUser(userId)
      console.log('🔍 Redis: User found:', user ? `${user.name} (${user.active ? 'active' : 'inactive'})` : 'null')
      
      if (!user || !user.active) {
        console.log('❌ User not found or inactive:', userId)
        console.log('❌ User object:', user)
        return NextResponse.json({ 
          error: 'User not found or inactive',
          debug: { userId, userExists: !!user, userActive: user?.active }
        }, { status: 401 })
      }
      
      // OpenAI Whisper APIの制限チェック（25MB）
      const fileSizeMB = audioFile.size / (1024 * 1024)
      if (fileSizeMB > 25) {
        console.log('File size exceeds OpenAI Whisper API limit (25MB):', fileSizeMB, 'MB')
        return NextResponse.json({ 
          error: `ファイルサイズがOpenAI APIの制限を超えています（${fileSizeMB.toFixed(1)}MB > 25MB）。より小さなファイルをアップロードするか、ファイルを分割してください。`,
          fileSize: fileSizeMB,
          maxSize: 25
        }, { status: 413 })
      }
      
      // ユーザー固有のファイルサイズチェック
      const fileSizeCheck = await UserManager.checkFileSize(userId, fileSizeMB)
      if (!fileSizeCheck.canUpload) {
        console.log('File size limit exceeded for user:', userId, fileSizeCheck.reason)
        return NextResponse.json({ error: fileSizeCheck.reason }, { status: 413 })
      }
      
      // 使用量制限チェック
      const usageCheck = await UserManager.checkUsageLimit(userId)
      if (!usageCheck.canUse) {
        console.log('Usage limit exceeded for user:', userId, usageCheck.reason)
        return NextResponse.json({ error: usageCheck.reason }, { status: 429 })
      }
    }

    if (!hasValidKey) {
      // デモモード
      console.log('Running in demo mode')
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const fileName = audioFile.name.toLowerCase()
      let demoText = ''
      let demoDurationMinutes = 3.0 // デモ用の仮想音声時間
      
      if (fileName.includes('sample') || fileName.includes('test')) {
        demoText = 'えー、今日はですね、みなさんにお話ししたいことがあるんですけども、まあ、動画編集っていうのは、あの、とても大変な作業でして、特にテロップの作成なんかは、えー、すごく時間がかかるんですよね。'
        demoDurationMinutes = 2.5
      } else {
        demoText = 'こんにちは、今日は新しいツールについて説明します。このツールを使うことで、動画編集の作業が大幅に効率化されると思います。まあ、実際に使ってみていただければ分かると思うんですけども。'
        demoDurationMinutes = 3.0
      }
      
      const requiredCredits = Math.ceil(demoDurationMinutes)
      console.log(`Demo mode: ${demoDurationMinutes} minutes, ${requiredCredits} credits required`)
      
      // 使用量を記録とクレジット消費
      if (userId) {
        // クレジット消費
        await UserManager.consumeCredits(userId, demoDurationMinutes)
        // 従来の使用量記録も保持
        await UserManager.recordUsage(userId)
      }
      
      console.log('Returning demo text:', demoText.substring(0, 50) + '...')
      
      // デバッグ用：クレジット消費結果を確認  
      const userAfterCredit = userId ? await UserManager.getUser(userId) : null
      
      return NextResponse.json({ 
        transcription: demoText,
        demo: true,
        creditDebug: {
          userId: userId || 'null',
          creditsBefore: userId ? (userAfterCredit ? userAfterCredit.limits.monthlyCredits - userAfterCredit.usage.monthlyCreditsUsed + Math.ceil(demoDurationMinutes) : 'unknown') : 'no user',
          creditsAfter: userId ? (userAfterCredit ? userAfterCredit.limits.monthlyCredits - userAfterCredit.usage.monthlyCreditsUsed : 'unknown') : 'no user',
          creditsConsumed: userId ? Math.ceil(demoDurationMinutes) : 0,
          demoDurationMinutes: demoDurationMinutes
        }
      })
    }

    // 実際のWhisper APIを使用（タイムスタンプ付き）
    console.log('Using real OpenAI Whisper API with timestamps')
    
    const apiResult = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ja',
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment']
    })

    console.log('Whisper API success with timestamps')
    console.log('Segments:', apiResult.segments?.length || 0)
    console.log('Audio duration:', apiResult.duration || 0, 'seconds')
    
    // セグメント情報を整理
    const segments = apiResult.segments?.map(segment => ({
      start: segment.start,
      end: segment.end,
      text: segment.text.trim()
    })) || []

    // 音声の長さからクレジット計算
    const audioDurationMinutes = (apiResult.duration || 0) / 60
    const requiredCredits = UserManager.calculateCreditsFromDuration(apiResult.duration || 0)
    
    console.log(`Audio length: ${audioDurationMinutes.toFixed(2)} minutes, Credits required: ${requiredCredits}`)

    // 使用量を記録とクレジット消費
    if (userId) {
      // クレジット消費
      await UserManager.consumeCredits(userId, audioDurationMinutes)
      // 従来の使用量記録も保持
      await UserManager.recordUsage(userId)
    }

    // デバッグ用：クレジット消費結果を確認
    const userAfterCredit = userId ? await UserManager.getUser(userId) : null
    
    return NextResponse.json({ 
      transcription: apiResult.text,
      segments: segments,
      language: apiResult.language,
      duration: apiResult.duration,
      creditDebug: {
        userId: userId || 'null',
        creditsBefore: userId ? (userAfterCredit ? userAfterCredit.limits.monthlyCredits - userAfterCredit.usage.monthlyCreditsUsed + Math.ceil(audioDurationMinutes) : 'unknown') : 'no user',
        creditsAfter: userId ? (userAfterCredit ? userAfterCredit.limits.monthlyCredits - userAfterCredit.usage.monthlyCreditsUsed : 'unknown') : 'no user',
        creditsConsumed: userId ? Math.ceil(audioDurationMinutes) : 0,
        audioDurationMinutes: audioDurationMinutes
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('Transcription error:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Transcription failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}