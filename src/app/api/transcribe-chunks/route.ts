import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { UserManagerRedis as UserManager } from '@/utils/userManagerRedis'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const maxDuration = 300;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// チャンクストレージ
const chunkStorage = new Map<string, { chunks: Buffer[], totalChunks: number, metadata: {filename: string, userId?: string} }>()

export async function POST(request: NextRequest) {
  console.log('=== Chunk Upload API called ===')
  
  try {
    const formData = await request.formData()
    const action = formData.get('action') as string
    
    if (action === 'upload-chunk') {
      // チャンクアップロード処理
      const uploadId = formData.get('uploadId') as string
      const chunkIndex = parseInt(formData.get('chunkIndex') as string)
      const totalChunks = parseInt(formData.get('totalChunks') as string)
      const chunkData = formData.get('chunk') as File
      
      console.log(`Receiving chunk ${chunkIndex + 1}/${totalChunks} for upload ${uploadId}`)
      
      if (!uploadId || chunkIndex === null || !totalChunks || !chunkData) {
        return NextResponse.json({ error: 'Missing chunk parameters' }, { status: 400 })
      }
      
      // チャンクデータを保存
      const buffer = Buffer.from(await chunkData.arrayBuffer())
      
      if (!chunkStorage.has(uploadId)) {
        chunkStorage.set(uploadId, {
          chunks: new Array(totalChunks),
          totalChunks,
          metadata: {
            filename: formData.get('filename') || 'audio.mp3',
            userId: formData.get('userId')
          }
        })
      }
      
      const storage = chunkStorage.get(uploadId)!
      storage.chunks[chunkIndex] = buffer
      
      // 全チャンクが揃ったかチェック
      const completedChunks = storage.chunks.filter(chunk => chunk !== undefined).length
      console.log(`Upload ${uploadId}: ${completedChunks}/${totalChunks} chunks received`)
      
      if (completedChunks === totalChunks) {
        // 全チャンクが揃った - ファイルを再構築して文字起こし
        console.log(`All chunks received for ${uploadId}, starting transcription`)
        
        const fullBuffer = Buffer.concat(storage.chunks)
        const blob = new Blob([fullBuffer])
        const file = new File([blob], storage.metadata.filename, { type: 'audio/mpeg' })
        
        // ユーザー認証チェック
        const userId = storage.metadata.userId
        if (userId) {
          const user = await UserManager.getUser(userId)
          if (!user || !user.active) {
            chunkStorage.delete(uploadId)
            return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
          }
        }
        
        try {
          // OpenAI Whisper APIで文字起こし
          const apiResult = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
            language: 'ja',
            response_format: 'verbose_json',
            timestamp_granularities: ['word', 'segment']
          })
          
          console.log('Chunk transcription successful')
          
          // 使用量記録
          if (userId) {
            const audioDurationMinutes = (apiResult.duration || 0) / 60
            await UserManager.consumeCredits(userId, audioDurationMinutes)
            await UserManager.recordUsage(userId)
          }
          
          // ストレージクリーンアップ
          chunkStorage.delete(uploadId)
          
          return NextResponse.json({
            transcription: apiResult.text,
            segments: apiResult.segments?.map(segment => ({
              start: segment.start,
              end: segment.end,
              text: segment.text.trim()
            })) || [],
            language: apiResult.language,
            duration: apiResult.duration,
            method: 'chunks'
          })
          
        } catch (error) {
          console.error('Transcription error:', error)
          chunkStorage.delete(uploadId)
          return NextResponse.json({
            error: 'Transcription failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 })
        }
        
      } else {
        // まだ全チャンクが揃っていない
        return NextResponse.json({
          success: true,
          chunksReceived: completedChunks,
          totalChunks,
          uploadId
        })
      }
      
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Chunk upload error:', error)
    return NextResponse.json({
      error: 'Chunk upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}