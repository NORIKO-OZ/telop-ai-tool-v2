import { NextRequest, NextResponse } from 'next/server'
import * as nodemailer from 'nodemailer'

// テストメール送信
export async function POST(request: NextRequest) {
  try {
    const { emailAddress } = await request.json()

    if (!emailAddress) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      )
    }

    // Gmail SMTP設定（環境変数から取得）
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER, // Gmail address
        pass: process.env.SMTP_PASS  // App password
      },
      tls: {
        rejectUnauthorized: false // 開発環境での自己署名証明書を許可
      }
    })

    // テストメールの内容
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: emailAddress,
      subject: '🧪 [AI テロップツール] メール通知テスト',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .info { background: #e7f3ff; border: 1px solid #b8daff; color: #004085; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #6c757d; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🧪 メール通知テスト</h1>
              <p>AI テロップ作成ツール v2</p>
            </div>
            
            <div class="content">
              <div class="success">
                <strong>✅ テスト送信成功！</strong><br>
                メール通知システムが正常に動作しています。
              </div>
              
              <h2>📋 設定確認</h2>
              <ul>
                <li><strong>送信先:</strong> ${emailAddress}</li>
                <li><strong>送信日時:</strong> ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</li>
                <li><strong>システム状態:</strong> 正常稼働中</li>
              </ul>
              
              <div class="info">
                <strong>📅 日次レポートについて</strong><br>
                実際の日次レポートでは以下の情報をお届けします：
                <ul>
                  <li>総ユーザー数とアクティブユーザー数</li>
                  <li>日次・月次のリクエスト統計</li>
                  <li>推定API利用コスト</li>
                  <li>ユーザー別の活動状況</li>
                  <li>システムの稼働状況</li>
                </ul>
              </div>
              
              <h3>🔧 次回の日次レポート送信</h3>
              <p>設定した時刻に自動で送信されます。設定を変更したい場合は管理画面からいつでも調整できます。</p>
              
              <div class="footer">
                <p>
                  このメールは AI テロップ作成ツール v2 の管理システムから送信されています。<br>
                  設定変更は管理画面の「メール通知設定」から行えます。
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    }

    // メール送信
    await transporter.sendMail(mailOptions)

    return NextResponse.json({
      success: true,
      message: 'テストメールを送信しました'
    })

  } catch (error) {
    console.error('テストメール送信エラー:', error)
    
    // エラーの詳細を含めて返す（開発環境のみ）
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `テストメール送信に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      : 'テストメール送信に失敗しました'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}