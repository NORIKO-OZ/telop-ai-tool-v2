import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface EmailSettings {
  enabled: boolean
  emailAddresses: string[]
  sendTime: string
  includeStats: boolean
  includeUserActivity: boolean
  includeCostBreakdown: boolean
  lastSent?: string
}

const SETTINGS_FILE = path.join(process.cwd(), 'settings', 'email-settings.json')

// 設定ファイルの読み込み
const loadEmailSettings = (): EmailSettings => {
  try {
    const settingsDir = path.dirname(SETTINGS_FILE)
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true })
    }

    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('メール設定読み込みエラー:', error)
  }

  // デフォルト設定
  return {
    enabled: false,
    emailAddresses: [],
    sendTime: '09:00',
    includeStats: true,
    includeUserActivity: true,
    includeCostBreakdown: true
  }
}

// 設定ファイルの保存
const saveEmailSettings = (settings: EmailSettings): void => {
  try {
    const settingsDir = path.dirname(SETTINGS_FILE)
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true })
    }

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
  } catch (error) {
    console.error('メール設定保存エラー:', error)
    throw error
  }
}

// GET: 設定取得
export async function GET() {
  try {
    const settings = loadEmailSettings()
    return NextResponse.json({ 
      success: true, 
      settings 
    })
  } catch (error) {
    console.error('メール設定取得エラー:', error)
    return NextResponse.json(
      { error: 'メール設定の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST: 設定保存
export async function POST(request: NextRequest) {
  try {
    const settings: EmailSettings = await request.json()

    // バリデーション
    if (settings.enabled && (!settings.emailAddresses || settings.emailAddresses.length === 0)) {
      return NextResponse.json(
        { error: 'メールアドレスを少なくとも1つ設定してください' },
        { status: 400 }
      )
    }

    if (settings.enabled && settings.emailAddresses) {
      for (const email of settings.emailAddresses) {
        if (!email || !email.includes('@')) {
          return NextResponse.json(
            { error: `無効なメールアドレスです: ${email}` },
            { status: 400 }
          )
        }
        
        // より厳密なメールアドレス検証
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          return NextResponse.json(
            { error: `有効なメールアドレス形式で入力してください: ${email}` },
            { status: 400 }
          )
        }
      }
      
      // 重複チェック
      const uniqueEmails = [...new Set(settings.emailAddresses)]
      if (uniqueEmails.length !== settings.emailAddresses.length) {
        return NextResponse.json(
          { error: '重複するメールアドレスが含まれています' },
          { status: 400 }
        )
      }
    }

    // 送信時刻の検証
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(settings.sendTime)) {
      return NextResponse.json(
        { error: '有効な時刻を入力してください（HH:MM形式）' },
        { status: 400 }
      )
    }

    // 既存設定を読み込んで lastSent を保持
    const currentSettings = loadEmailSettings()
    const newSettings = {
      ...settings,
      lastSent: currentSettings.lastSent
    }

    saveEmailSettings(newSettings)

    // 開発環境でのログ
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 メール通知設定を更新:')
      console.log(`  有効: ${newSettings.enabled}`)
      console.log(`  メールアドレス: ${newSettings.emailAddresses.join(', ')}`)
      console.log(`  送信時刻: ${newSettings.sendTime}`)
      console.log(`  含む内容: 統計=${newSettings.includeStats}, ユーザー活動=${newSettings.includeUserActivity}, コスト=${newSettings.includeCostBreakdown}`)
    }

    return NextResponse.json({
      success: true,
      message: 'メール通知設定を保存しました'
    })

  } catch (error) {
    console.error('メール設定保存エラー:', error)
    return NextResponse.json(
      { error: 'メール設定の保存に失敗しました' },
      { status: 500 }
    )
  }
}