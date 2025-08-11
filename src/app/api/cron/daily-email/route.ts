import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Vercel Cron Job用のエンドポイント
// Vercelの場合: vercel.json でcronを設定
// 他のプラットフォーム: 外部cronサービス（cron-job.org等）で呼び出し

export async function GET(request: NextRequest) {
  try {
    // 認証確認（本番環境ではより厳密な認証を推奨）
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // メール設定を読み込み
    const settingsFile = path.join(process.cwd(), 'settings', 'email-settings.json')
    
    if (!fs.existsSync(settingsFile)) {
      console.log('📧 メール設定ファイルが見つかりません')
      return NextResponse.json({
        success: false,
        message: 'メール設定が見つかりません'
      })
    }

    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))
    
    if (!settings.enabled) {
      console.log('📧 メール通知が無効になっています')
      return NextResponse.json({
        success: true,
        message: 'メール通知は無効です'
      })
    }

    // 現在時刻を取得（日本時間）
    const now = new Date()
    const jstTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    const currentTime = `${jstTime.getHours().toString().padStart(2, '0')}:${jstTime.getMinutes().toString().padStart(2, '0')}`
    
    console.log(`📧 Cron実行時刻: ${currentTime}, 設定送信時刻: ${settings.sendTime}`)
    
    // 送信時刻をチェック（±5分の余裕を持たせる）
    const [targetHour, targetMinute] = settings.sendTime.split(':').map(Number)
    const [currentHour, currentMinute] = currentTime.split(':').map(Number)
    
    const targetMinutes = targetHour * 60 + targetMinute
    const currentMinutes = currentHour * 60 + currentMinute
    const timeDiff = Math.abs(currentMinutes - targetMinutes)
    
    // 5分以内なら送信実行
    if (timeDiff <= 5 || timeDiff >= 1435) { // 1435 = 24時間 - 5分（日を跨ぐ場合）
      // 今日既に送信済みかチェック
      const today = jstTime.toDateString()
      const lastSent = settings.lastSent ? new Date(settings.lastSent).toDateString() : null
      
      if (lastSent === today) {
        console.log('📧 今日は既にメール送信済みです')
        return NextResponse.json({
          success: true,
          message: '今日は既に送信済みです'
        })
      }

      // 日次レポートAPIを呼び出し
      try {
        const reportResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/send-daily-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        const reportData = await reportResponse.json()
        
        if (reportData.success) {
          console.log('📧 日次レポートを送信しました:', reportData.message)
          return NextResponse.json({
            success: true,
            message: '日次レポートを送信しました',
            stats: reportData.stats
          })
        } else {
          console.error('📧 日次レポート送信に失敗:', reportData.error)
          return NextResponse.json({
            success: false,
            error: reportData.error
          }, { status: 500 })
        }
      } catch (error) {
        console.error('📧 日次レポートAPI呼び出しエラー:', error)
        return NextResponse.json({
          success: false,
          error: 'レポート送信APIの呼び出しに失敗しました'
        }, { status: 500 })
      }
    } else {
      console.log(`📧 送信時刻ではありません。現在: ${currentTime}, 設定: ${settings.sendTime}`)
      return NextResponse.json({
        success: true,
        message: `送信時刻ではありません。現在: ${currentTime}, 設定: ${settings.sendTime}`
      })
    }

  } catch (error) {
    console.error('📧 Cronジョブエラー:', error)
    return NextResponse.json({
      success: false,
      error: 'Cronジョブの実行中にエラーが発生しました'
    }, { status: 500 })
  }
}

// POSTメソッドも対応（手動実行用）
export async function POST(request: NextRequest) {
  return GET(request)
}