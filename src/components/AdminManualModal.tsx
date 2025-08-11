'use client'

import { useState } from 'react'

interface AdminManualModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AdminManualModal({ isOpen, onClose }: AdminManualModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'email' | 'monitoring' | 'troubleshooting'>('overview')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden m-4">
        <div className="flex justify-between items-center p-6 border-b bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>管理者マニュアル</span>
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-yellow-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* タブ */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'overview'
                ? 'text-yellow-600 border-b-2 border-yellow-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🏠 概要
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'users'
                ? 'text-yellow-600 border-b-2 border-yellow-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            👥 ユーザー管理
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'email'
                ? 'text-yellow-600 border-b-2 border-yellow-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📧 メール通知
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'monitoring'
                ? 'text-yellow-600 border-b-2 border-yellow-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📊 監視・分析
          </button>
          <button
            onClick={() => setActiveTab('troubleshooting')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'troubleshooting'
                ? 'text-yellow-600 border-b-2 border-yellow-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🔧 トラブルシューティング
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900">システム概要</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-800 mb-2">🎯 システムの役割</h4>
                  <p className="text-blue-700 text-sm">
                    AI テロップ作成ツール v2 の管理・運用を行うための管理者システムです。
                    ユーザー管理、使用状況監視、メール通知設定などを一元管理できます。
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">主要機能</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                      <span className="text-2xl">👥</span>
                      <span>ユーザー管理</span>
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• ユーザーの作成・編集・削除</li>
                      <li>• 権限設定（管理者/一般ユーザー）</li>
                      <li>• 使用制限設定（クレジット・時間）</li>
                      <li>• ユーザーの有効化/無効化</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                      <span className="text-2xl">📊</span>
                      <span>使用状況監視</span>
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• リアルタイムの統計表示</li>
                      <li>• ユーザー別使用状況</li>
                      <li>• コスト分析</li>
                      <li>• パフォーマンス監視</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                      <span className="text-2xl">📧</span>
                      <span>メール通知</span>
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 日次レポート自動送信</li>
                      <li>• 複数アドレス対応</li>
                      <li>• カスタマイズ可能な内容</li>
                      <li>• テスト送信機能</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                      <span className="text-2xl">🛡️</span>
                      <span>セキュリティ</span>
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 管理者権限の制御</li>
                      <li>• セッション管理</li>
                      <li>• ログイン制限</li>
                      <li>• データ保護</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">アクセス権限</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">⚠️ 重要な注意事項</h4>
                  <ul className="text-yellow-700 text-sm space-y-2">
                    <li>• 管理者パネルは <strong>管理者権限を持つユーザー</strong> のみアクセス可能</li>
                    <li>• ユーザー情報の変更は <strong>システム全体</strong> に影響します</li>
                    <li>• 削除操作は <strong>取り消しできません</strong></li>
                    <li>• メール設定の変更は <strong>即座に反映</strong> されます</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900">ユーザー管理</h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">新規ユーザー作成</h4>
                    <div className="bg-gray-50 border rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                        <li><strong>ユーザーID</strong>: 英数字で一意のIDを設定（変更不可）</li>
                        <li><strong>パスワード</strong>: 6文字以上の安全なパスワード</li>
                        <li><strong>名前</strong>: ユーザーの表示名</li>
                        <li><strong>権限</strong>: ユーザー/管理者を選択</li>
                        <li><strong>月次クレジット</strong>: 使用可能時間の上限（60クレジット = 1時間）</li>
                        <li><strong>最大ファイル時間</strong>: 1回にアップロード可能な最大時間</li>
                      </ol>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">ユーザー編集</h4>
                    <div className="bg-gray-50 border rounded-lg p-4">
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li>• <strong>編集ボタン</strong>: ユーザー一覧から「編集」をクリック</li>
                        <li>• <strong>パスワード変更</strong>: 空欄のままで変更しない、入力すると更新</li>
                        <li>• <strong>クレジットリセット</strong>: 月初に自動リセット（手動リセット不可）</li>
                        <li>• <strong>admin用户</strong>: IDとパスワード変更不可（安全のため）</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">ユーザー状態管理</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <h5 className="font-medium mb-2 text-green-700">✅ 有効化</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• ツールへのログイン可能</li>
                          <li>• 全機能の利用可能</li>
                          <li>• クレジット消費が発生</li>
                        </ul>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h5 className="font-medium mb-2 text-red-700">❌ 無効化</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• ツールへのログイン不可</li>
                          <li>• 既存セッションも無効</li>
                          <li>• データは保持される</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">クレジットシステム</h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-medium text-blue-800 mb-2">💰 料金計算</h5>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• <strong>1分 = 1クレジット</strong> として計算</li>
                        <li>• <strong>300クレジット = 5時間分</strong> の利用が可能</li>
                        <li>• 月初に自動でクレジットがリセット</li>
                        <li>• 超過分は利用不可（エラーメッセージ表示）</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900">メール通知設定</h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">基本設定</h4>
                    <div className="bg-gray-50 border rounded-lg p-4">
                      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                        <li><strong>通知有効化</strong>: メール送信のON/OFFを切り替え</li>
                        <li><strong>送信先追加</strong>: 複数のメールアドレスを設定可能</li>
                        <li><strong>送信時刻</strong>: 日本時間での送信時刻を指定</li>
                        <li><strong>レポート内容</strong>: 送信する情報の種類を選択</li>
                      </ol>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">複数アドレス管理</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <h5 className="font-medium mb-2 text-blue-700">✉️ 追加方法</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 入力欄にメールアドレス入力</li>
                          <li>• 「追加」ボタンまたはEnterキー</li>
                          <li>• 自動で形式チェック実行</li>
                          <li>• 重複チェックも自動実行</li>
                        </ul>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h5 className="font-medium mb-2 text-red-700">🗑️ 削除方法</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 各アドレスの削除ボタンクリック</li>
                          <li>• 即座に一覧から削除</li>
                          <li>• 確認ダイアログなし</li>
                          <li>• 設定保存で確定</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">レポート内容</h4>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3">
                        <h5 className="font-medium mb-1 text-gray-800">📊 全体統計</h5>
                        <p className="text-sm text-gray-600">総ユーザー数、アクティブユーザー数、今日・今月のリクエスト数、推定コスト</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h5 className="font-medium mb-1 text-gray-800">👥 ユーザー別活動状況</h5>
                        <p className="text-sm text-gray-600">今日アクティブなユーザー一覧、使用クレジット、リクエスト数の詳細</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h5 className="font-medium mb-1 text-gray-800">💰 コスト内訳</h5>
                        <p className="text-sm text-gray-600">Whisper API（音声認識）とGPT API（テキスト生成）の個別コスト</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">送信スケジュール</h4>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h5 className="font-medium text-green-800 mb-2">⏰ 自動送信システム</h5>
                      <ul className="text-green-700 text-sm space-y-1">
                        <li>• <strong>Vercel Cron</strong>により毎時0分に実行チェック</li>
                        <li>• 設定時刻の<strong>±5分</strong>の範囲で送信実行</li>
                        <li>• <strong>1日1回のみ</strong>送信（重複防止）</li>
                        <li>• 送信失敗時は次回実行時に再試行</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">テスト送信</h4>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h5 className="font-medium text-yellow-800 mb-2">🧪 動作確認</h5>
                      <ul className="text-yellow-700 text-sm space-y-1">
                        <li>• 設定した<strong>全アドレス</strong>に一括送信</li>
                        <li>• 送信結果を個別に表示</li>
                        <li>• 失敗したアドレスはエラー詳細を表示</li>
                        <li>• 本番レポートと同じ送信システムを使用</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'monitoring' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900">監視・分析</h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">統計ダッシュボード</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="font-medium text-blue-800 mb-1">総ユーザー数</h5>
                        <p className="text-sm text-blue-600">登録済み全ユーザー、アクティブユーザー数</p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h5 className="font-medium text-green-800 mb-1">総リクエスト数</h5>
                        <p className="text-sm text-green-600">今日、今月の処理件数</p>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h5 className="font-medium text-purple-800 mb-1">推定コスト</h5>
                        <p className="text-sm text-purple-600">API利用料金の概算</p>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h5 className="font-medium text-orange-800 mb-1">今日の使用量</h5>
                        <p className="text-sm text-orange-600">当日のアクティビティ</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">コスト分析</h4>
                    <div className="bg-gray-50 border rounded-lg p-4">
                      <h5 className="font-medium mb-3 text-gray-800">💰 料金体系</h5>
                      <div className="space-y-2 text-sm text-gray-700">
                        <div className="flex justify-between">
                          <span>Whisper API（音声認識）:</span>
                          <span className="font-mono">$0.030 / リクエスト（概算）</span>
                        </div>
                        <div className="flex justify-between">
                          <span>GPT API（テキスト生成）:</span>
                          <span className="font-mono">$0.048 / リクエスト（概算）</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-medium">
                          <span>合計:</span>
                          <span className="font-mono">$0.078 / リクエスト</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        ※ 実際の料金は使用量・地域により変動します
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">パフォーマンス監視</h4>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3">
                        <h5 className="font-medium mb-1 text-gray-800">📈 リアルタイム統計</h5>
                        <p className="text-sm text-gray-600">ダッシュボードは管理画面アクセス時にリアルタイム更新</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h5 className="font-medium mb-1 text-gray-800">⏱️ 処理時間監視</h5>
                        <p className="text-sm text-gray-600">平均処理時間、レスポンス時間の追跡</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h5 className="font-medium mb-1 text-gray-800">🚨 エラー監視</h5>
                        <p className="text-sm text-gray-600">システムログ、エラー率の監視</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">使用状況の解釈</h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-medium text-blue-800 mb-2">📊 データの見方</h5>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• <strong>アクティブユーザー</strong>: 今月1回以上利用したユーザー</li>
                        <li>• <strong>平均使用量</strong>: 総リクエスト数 ÷ アクティブユーザー数</li>
                        <li>• <strong>クレジット使用状況</strong>: 全ユーザーの今月の消費合計</li>
                        <li>• <strong>推定コスト</strong>: API利用料の概算（実際の請求額とは異なる）</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'troubleshooting' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900">トラブルシューティング</h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">よくある問題</h4>
                    
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <h5 className="font-medium mb-2 text-red-700">❌ ユーザーがログインできない</h5>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>確認項目:</strong></p>
                          <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>ユーザーアカウントが「有効」になっているか</li>
                            <li>正しいユーザーID・パスワードを使用しているか</li>
                            <li>ブラウザのキャッシュをクリアしてもらう</li>
                            <li>管理者パネルでパスワードリセット</li>
                          </ul>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h5 className="font-medium mb-2 text-red-700">❌ メール通知が送信されない</h5>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>確認項目:</strong></p>
                          <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>メール通知設定が「有効」になっているか</li>
                            <li>送信先メールアドレスが正しく設定されているか</li>
                            <li>SMTP認証情報（環境変数）が正しいか</li>
                            <li>テストメール送信で動作確認</li>
                            <li>スパムフォルダも確認してもらう</li>
                          </ul>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h5 className="font-medium mb-2 text-red-700">❌ ユーザーの使用制限が正しく動作しない</h5>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>確認項目:</strong></p>
                          <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>月次クレジット制限が正しく設定されているか</li>
                            <li>Redis接続が正常に動作しているか</li>
                            <li>月初のクレジットリセットが実行されているか</li>
                            <li>ユーザーのクレジット使用状況を確認</li>
                          </ul>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h5 className="font-medium mb-2 text-red-700">❌ 統計情報が更新されない</h5>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>確認項目:</strong></p>
                          <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>ブラウザのページリロード</li>
                            <li>Redis接続の確認</li>
                            <li>API処理が正常に完了しているか</li>
                            <li>サーバーログでエラーチェック</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">緊急時の対応</h4>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h5 className="font-medium text-red-800 mb-2">🚨 システム障害時</h5>
                      <ol className="text-red-700 text-sm space-y-1 list-decimal list-inside">
                        <li>影響範囲の確認（全ユーザー/特定ユーザー）</li>
                        <li>サーバーログの確認</li>
                        <li>Redis・外部API接続の確認</li>
                        <li>必要に応じてユーザーへの告知</li>
                        <li>復旧作業の実施</li>
                      </ol>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">メンテナンス作業</h4>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3">
                        <h5 className="font-medium mb-1 text-gray-800">📅 定期メンテナンス</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 月初: 全ユーザーのクレジット使用状況確認</li>
                          <li>• 週次: 統計データの整合性確認</li>
                          <li>• 月次: システムログの確認・アーカイブ</li>
                        </ul>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h5 className="font-medium mb-1 text-gray-800">💾 バックアップ</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• ユーザーデータ（Redis）の定期バックアップ</li>
                          <li>• 設定ファイルのバックアップ</li>
                          <li>• フィードバックデータの保存</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">ログとデバッグ</h4>
                    <div className="bg-gray-50 border rounded-lg p-4">
                      <h5 className="font-medium mb-2 text-gray-800">🔍 ログの場所</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• <strong>Vercel</strong>: Functions → ログタブ</li>
                        <li>• <strong>Redis</strong>: Upstash Console → Analytics</li>
                        <li>• <strong>メール送信</strong>: 管理画面 → テスト送信で確認</li>
                        <li>• <strong>フィードバック</strong>: <code>feedback/feedback.json</code></li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium mb-3 text-gray-800">サポート連絡先</h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-medium text-blue-800 mb-2">💬 困った時は</h5>
                      <p className="text-blue-700 text-sm">
                        解決できない問題が発生した場合は、ツール内の「フィードバック」機能を使用して
                        詳細な状況を報告してください。エラーメッセージ、発生時刻、影響範囲などの
                        情報を含めていただくと、迅速な対応が可能です。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}