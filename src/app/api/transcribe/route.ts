import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { UserManager } from '@/utils/userManager'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
    
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const userId = formData.get('userId') as string
    
    console.log('Audio file info:', audioFile ? {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    } : 'No file')
    console.log('User ID:', userId)
    
    if (!audioFile) {
      console.log('No audio file provided')
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }

    // ユーザー認証と使用量・ファイルサイズチェック
    if (userId) {
      const user = UserManager.getUser(userId)
      
      if (!user || !user.active) {
        console.log('User not found or inactive:', userId)
        return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
      }
      
      // ファイルサイズチェック
      const fileSizeMB = audioFile.size / (1024 * 1024)
      const fileSizeCheck = UserManager.checkFileSize(userId, fileSizeMB)
      if (!fileSizeCheck.canUpload) {
        console.log('File size limit exceeded for user:', userId, fileSizeCheck.reason)
        return NextResponse.json({ error: fileSizeCheck.reason }, { status: 413 })
      }
      
      // 使用量制限チェック
      const usageCheck = UserManager.checkUsageLimit(userId)
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
        UserManager.consumeCredits(userId, demoDurationMinutes)
        // 従来の使用量記録も保持
        UserManager.recordUsage(userId)
      }
      
      console.log('Returning demo text:', demoText.substring(0, 50) + '...')
      return NextResponse.json({ 
        transcription: demoText,
        demo: true
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
      UserManager.consumeCredits(userId, audioDurationMinutes)
      // 従来の使用量記録も保持
      UserManager.recordUsage(userId)
    }

    return NextResponse.json({ 
      transcription: apiResult.text,
      segments: segments,
      language: apiResult.language,
      duration: apiResult.duration
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