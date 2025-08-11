import { NextResponse } from 'next/server'
import { User } from '@/utils/userManagerRedis'
import * as nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'

// 管理者用の統計情報取得
const getAdminStats = async () => {
  try {
    // ユーザー管理者APIを内部的に呼び出し
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/users`)
    if (!response.ok) throw new Error('Stats fetch failed')
    
    const data = await response.json()
    return data.success ? { users: data.users, stats: data.stats } : null
  } catch (error) {
    console.error('統計情報取得エラー:', error)
    return null
  }
}

// 日次レポートメール送信
export async function POST() {
  try {
    // メール設定を読み込み
    const settingsFile = path.join(process.cwd(), 'settings', 'email-settings.json')
    if (!fs.existsSync(settingsFile)) {
      return NextResponse.json(
        { error: 'メール設定が見つかりません' },
        { status: 404 }
      )
    }

    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))
    
    if (!settings.enabled || !settings.emailAddresses || settings.emailAddresses.length === 0) {
      return NextResponse.json(
        { error: 'メール通知が無効または送信先が設定されていません' },
        { status: 400 }
      )
    }

    // 統計情報を取得
    const statsData = await getAdminStats()
    if (!statsData) {
      return NextResponse.json(
        { error: '統計情報の取得に失敗しました' },
        { status: 500 }
      )
    }

    const { users, stats } = statsData
    const today = new Date().toLocaleDateString('ja-JP')
    
    // Gmail SMTP設定
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false // 開発環境での自己署名証明書を許可
      }
    })

    // レポート内容生成
    let reportContent = ''

    // 全体統計
    if (settings.includeStats) {
      reportContent += `
        <div class="section">
          <h2>📊 全体統計</h2>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-number">${stats.totalUsers}</div>
              <div class="stat-label">総ユーザー数</div>
              <div class="stat-sub">アクティブ: ${stats.activeUsers}</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${stats.totalDailyRequests}</div>
              <div class="stat-label">今日のリクエスト</div>
              <div class="stat-sub">今月: ${stats.totalMonthlyRequests}</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">$${(stats.totalDailyRequests * 0.078).toFixed(2)}</div>
              <div class="stat-label">今日の推定コスト</div>
              <div class="stat-sub">月間: $${stats.estimatedCost.toFixed(2)}</div>
            </div>
          </div>
        </div>
      `
    }

    // ユーザー活動状況
    if (settings.includeUserActivity) {
      const activeUsersToday = users.filter((u: User) => u.usage.dailyRequests > 0)
      reportContent += `
        <div class="section">
          <h2>👥 ユーザー別活動状況</h2>
          <p><strong>今日アクティブなユーザー:</strong> ${activeUsersToday.length}名</p>
          <div class="user-table">
            <table>
              <thead>
                <tr>
                  <th>ユーザー</th>
                  <th>今日の使用</th>
                  <th>月間使用</th>
                  <th>クレジット消費</th>
                </tr>
              </thead>
              <tbody>
                ${activeUsersToday.map((user: User) => `
                  <tr>
                    <td><strong>${user.name}</strong> (${user.id})</td>
                    <td>${user.usage.dailyRequests} requests</td>
                    <td>${user.usage.monthlyRequests} requests</td>
                    <td>${user.usage.monthlyCreditsUsed}/${user.limits.monthlyCredits}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `
    }

    // コスト内訳
    if (settings.includeCostBreakdown) {
      const whisperCost = stats.totalDailyRequests * 0.03 // 仮の料金
      const gptCost = stats.totalDailyRequests * 0.048 // 仮の料金
      reportContent += `
        <div class="section">
          <h2>💰 コスト内訳（今日）</h2>
          <div class="cost-breakdown">
            <div class="cost-item">
              <span class="cost-service">Whisper API (音声認識)</span>
              <span class="cost-amount">$${whisperCost.toFixed(3)}</span>
            </div>
            <div class="cost-item">
              <span class="cost-service">GPT API (テキスト生成)</span>
              <span class="cost-amount">$${gptCost.toFixed(3)}</span>
            </div>
            <div class="cost-item total">
              <span class="cost-service"><strong>合計</strong></span>
              <span class="cost-amount"><strong>$${(whisperCost + gptCost).toFixed(3)}</strong></span>
            </div>
          </div>
          <p class="cost-note">※ 推定値です。実際の請求額とは異なる場合があります。</p>
        </div>
      `
    }

    // 複数のメールアドレスに送信
    const sendResults = []
    const totalEmails = settings.emailAddresses.length
    
    for (const emailAddress of settings.emailAddresses) {
      try {
        // メール内容
        const mailOptions = {
          from: process.env.SMTP_USER,
          to: emailAddress,
          subject: `📊 [AI テロップツール] 日次利用状況レポート - ${today}`,
          html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .section { margin-bottom: 30px; }
            .section h2 { color: #4a5568; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
            .stat-item { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; }
            .stat-number { font-size: 2.5em; font-weight: bold; color: #4299e1; }
            .stat-label { font-size: 1.1em; color: #4a5568; margin-top: 5px; }
            .stat-sub { font-size: 0.9em; color: #718096; margin-top: 5px; }
            .user-table { margin: 20px 0; }
            .user-table table { width: 100%; border-collapse: collapse; }
            .user-table th, .user-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            .user-table th { background-color: #f7fafc; font-weight: 600; }
            .cost-breakdown { background: #f7fafc; border-radius: 8px; padding: 20px; }
            .cost-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .cost-item.total { border-top: 2px solid #4299e1; border-bottom: none; margin-top: 10px; font-size: 1.1em; }
            .cost-note { font-size: 0.9em; color: #718096; margin-top: 15px; }
            .alert { background: #fed7d7; border: 1px solid #fc8181; color: #742a2a; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .success { background: #c6f6d5; border: 1px solid #68d391; color: #22543d; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #718096; font-size: 12px; padding: 20px; background: #f7fafc; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 日次利用状況レポート</h1>
              <p>AI テロップ作成ツール v2 - ${today}</p>
            </div>
            
            <div class="content">
              ${stats.totalDailyRequests > 0 
                ? `<div class="success">✅ 本日もシステムが正常に稼働し、${stats.totalDailyRequests}件のリクエストを処理しました。</div>`
                : `<div class="alert">ℹ️ 本日はまだリクエストが処理されていません。</div>`
              }
              
              ${reportContent}
              
              <div class="section">
                <h2>🔧 システム情報</h2>
                <ul>
                  <li><strong>レポート生成時刻:</strong> ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</li>
                  <li><strong>設定送信時刻:</strong> ${settings.sendTime}</li>
                  <li><strong>システム状態:</strong> 正常稼働中</li>
                </ul>
              </div>
            </div>
            
            <div class="footer">
              <p>
                このメールは AI テロップ作成ツール v2 の自動レポート機能から送信されています。<br>
                設定変更は管理画面の「メール通知設定」から行えます。
              </p>
            </div>
          </div>
        </body>
        </html>
          `
        }

        // メール送信
        await transporter.sendMail(mailOptions)
        sendResults.push({ email: emailAddress, success: true })
        
      } catch (error) {
        console.error(`メール送信エラー (${emailAddress}):`, error)
        sendResults.push({ 
          email: emailAddress, 
          success: false, 
          error: error instanceof Error ? error.message : '不明なエラー'
        })
      }
    }

    // 送信結果の集計
    const successCount = sendResults.filter(r => r.success).length
    const failureCount = sendResults.filter(r => !r.success).length
    
    // 最終送信日時を記録（少なくとも1件成功した場合）
    if (successCount > 0) {
      settings.lastSent = new Date().toISOString()
      fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2))
    }

    return NextResponse.json({
      success: successCount > 0,
      message: `日次レポートを送信しました: ${successCount}/${totalEmails}件成功`,
      details: {
        total: totalEmails,
        success: successCount,
        failure: failureCount,
        results: sendResults
      },
      stats: {
        totalUsers: stats.totalUsers,
        dailyRequests: stats.totalDailyRequests,
        estimatedCost: (stats.totalDailyRequests * 0.078).toFixed(2)
      }
    })

  } catch (error) {
    console.error('日次レポート送信エラー:', error)
    return NextResponse.json(
      { error: '日次レポートの送信に失敗しました' },
      { status: 500 }
    )
  }
}