import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface FeedbackData {
  id?: string
  type: 'feedback' | 'bug' | 'feature'
  email?: string
  subject?: string
  message: string
  rating?: number | null
  timestamp: string
  userAgent?: string
  url?: string
  processed?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const data: FeedbackData = await request.json()
    
    // バリデーション
    if (!data.message || !data.message.trim()) {
      return NextResponse.json(
        { error: 'メッセージは必須です' },
        { status: 400 }
      )
    }

    if (!data.type || !['feedback', 'bug', 'feature'].includes(data.type)) {
      return NextResponse.json(
        { error: '無効なフィードバックタイプです' },
        { status: 400 }
      )
    }

    // フィードバックデータの準備
    const feedbackEntry = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: data.type,
      email: data.email || '',
      subject: data.subject || '',
      message: data.message.trim(),
      rating: data.rating || null,
      timestamp: data.timestamp || new Date().toISOString(),
      userAgent: data.userAgent || '',
      url: data.url || '',
      processed: false
    }

    // フィードバックファイルのパス
    const feedbackDir = path.join(process.cwd(), 'feedback')
    const feedbackFile = path.join(feedbackDir, 'feedback.json')

    // フィードバックディレクトリが存在しない場合は作成
    if (!fs.existsSync(feedbackDir)) {
      fs.mkdirSync(feedbackDir, { recursive: true })
    }

    // 既存のフィードバックデータを読み込み
    let feedbackList: FeedbackData[] = []
    if (fs.existsSync(feedbackFile)) {
      try {
        const existingData = fs.readFileSync(feedbackFile, 'utf-8')
        feedbackList = JSON.parse(existingData)
      } catch (error) {
        console.error('既存のフィードバックファイルの読み込みに失敗:', error)
        feedbackList = []
      }
    }

    // 新しいフィードバックを追加
    feedbackList.push(feedbackEntry)

    // ファイルに保存
    fs.writeFileSync(feedbackFile, JSON.stringify(feedbackList, null, 2))

    // 管理者用のサマリーファイルも更新
    const summaryFile = path.join(feedbackDir, 'summary.json')
    const summary = {
      totalCount: feedbackList.length,
      unprocessedCount: feedbackList.filter(f => !f.processed).length,
      typeCount: {
        feedback: feedbackList.filter(f => f.type === 'feedback').length,
        bug: feedbackList.filter(f => f.type === 'bug').length,
        feature: feedbackList.filter(f => f.type === 'feature').length
      },
      lastUpdated: new Date().toISOString()
    }
    
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2))

    // 開発環境ではコンソールにも出力
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 新しいフィードバックを受信:')
      console.log(`  タイプ: ${feedbackEntry.type}`)
      console.log(`  件名: ${feedbackEntry.subject || '(なし)'}`)
      console.log(`  メッセージ: ${feedbackEntry.message.substring(0, 100)}...`)
      console.log(`  評価: ${feedbackEntry.rating || '(なし)'}`)
      console.log(`  メール: ${feedbackEntry.email || '(なし)'}`)
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'フィードバックを受信しました',
        id: feedbackEntry.id
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('フィードバック処理エラー:', error)
    return NextResponse.json(
      { error: 'フィードバックの処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 管理者用: フィードバック一覧取得（簡単な認証付き）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const adminKey = searchParams.get('key')

    // 簡易認証（本番環境では適切な認証を実装）
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const feedbackDir = path.join(process.cwd(), 'feedback')
    const feedbackFile = path.join(feedbackDir, 'feedback.json')
    const summaryFile = path.join(feedbackDir, 'summary.json')

    if (action === 'summary') {
      // サマリー情報を返す
      if (fs.existsSync(summaryFile)) {
        const summaryData = fs.readFileSync(summaryFile, 'utf-8')
        return NextResponse.json(JSON.parse(summaryData))
      } else {
        return NextResponse.json({
          totalCount: 0,
          unprocessedCount: 0,
          typeCount: { feedback: 0, bug: 0, feature: 0 },
          lastUpdated: null
        })
      }
    } else {
      // 全フィードバックを返す
      if (fs.existsSync(feedbackFile)) {
        const feedbackData = fs.readFileSync(feedbackFile, 'utf-8')
        const feedbackList = JSON.parse(feedbackData)
        
        // 最新順にソート
        feedbackList.sort((a: FeedbackData, b: FeedbackData) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        
        return NextResponse.json(feedbackList)
      } else {
        return NextResponse.json([])
      }
    }

  } catch (error) {
    console.error('フィードバック取得エラー:', error)
    return NextResponse.json(
      { error: 'フィードバックの取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}