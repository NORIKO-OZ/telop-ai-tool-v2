import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const maxDuration = 300;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  console.log('=== Stream Transcribe API called ===')
  
  try {
    // より効率的な方法でリクエストボディを処理
    const buffer = await request.arrayBuffer()
    const size = buffer.byteLength
    const sizeMB = size / (1024 * 1024)
    
    console.log(`Received buffer size: ${sizeMB.toFixed(2)}MB`)
    
    if (sizeMB > 25) {
      return NextResponse.json({
        error: `ファイルサイズが大きすぎます (${sizeMB.toFixed(1)}MB > 25MB)`,
        fileSize: sizeMB,
        maxSize: 25
      }, { status: 413 })
    }
    
    // バッファからFormDataを再構築
    const uint8Array = new Uint8Array(buffer)
    const blob = new Blob([uint8Array])
    const file = new File([blob], 'audio.mp3', { type: 'audio/mpeg' })
    
    // OpenAI APIに送信
    const apiResult = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'ja',
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment']
    })
    
    console.log('Stream transcription successful')
    
    return NextResponse.json({
      transcription: apiResult.text,
      segments: apiResult.segments?.map(segment => ({
        start: segment.start,
        end: segment.end,
        text: segment.text.trim()
      })) || [],
      language: apiResult.language,
      duration: apiResult.duration,
      stream: true
    })
    
  } catch (error) {
    console.error('Stream transcription error:', error)
    return NextResponse.json({
      error: 'Stream transcription failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}