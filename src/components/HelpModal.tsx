'use client'

import { useState } from 'react'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'tips'>('basic')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden m-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">使い方ガイド</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* タブ */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'basic'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            基本的な使い方
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'advanced'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            高度な機能
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'tips'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            コツ・注意点
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {activeTab === 'basic' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">基本的な流れ</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <h4 className="font-medium text-gray-900">ファイルをアップロード</h4>
                      <p className="text-gray-600 text-sm">音声ファイル（mp3, wav, m4a等）または動画ファイル（mp4, mov, avi等）をアップロードします。</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <h4 className="font-medium text-gray-900">設定を調整</h4>
                      <p className="text-gray-600 text-sm">要約レベル、文字数、行数、敬語設定を必要に応じて調整します。</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <h4 className="font-medium text-gray-900">文字起こし開始</h4>
                      <p className="text-gray-600 text-sm">「文字起こし開始」ボタンをクリックして処理を開始します。</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div>
                      <h4 className="font-medium text-gray-900">結果を活用</h4>
                      <p className="text-gray-600 text-sm">生成されたテロップをコピーまたはSRTファイルとしてダウンロードします。</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">対応ファイル形式</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">音声ファイル</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• MP3</li>
                      <li>• WAV</li>
                      <li>• M4A</li>
                      <li>• AAC</li>
                      <li>• OGG</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">動画ファイル</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• MP4</li>
                      <li>• MOV</li>
                      <li>• AVI</li>
                      <li>• MKV</li>
                      <li>• WEBM</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">制限事項</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li>• ファイル時間: 最大30分まで</li>
                    <li>• ファイルサイズ: 音声ファイルは最大25MBまで</li>
                    <li>• 動画ファイルは変換後のサイズが制限対象</li>
                    <li>• 処理時間は元ファイルの長さに応じて変動</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">要約レベルの選択</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">原文ベース</h4>
                    <p className="text-sm text-gray-600 mb-2">口癖や重複表現のみを削除し、元の内容をほぼそのまま保持します。</p>
                    <p className="text-xs text-blue-600">適用場面: 正確性を重視する場合</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">レベル1（詳細80%）</h4>
                    <p className="text-sm text-gray-600 mb-2">重要な情報を保持しながら、軽微な簡略化を行います。</p>
                    <p className="text-xs text-blue-600">適用場面: 詳細な説明が必要な場合</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">レベル2（標準50%）</h4>
                    <p className="text-sm text-gray-600 mb-2">適度に要約し、重要なポイントを抽出します。</p>
                    <p className="text-xs text-blue-600">適用場面: 一般的なテロップ用途</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">レベル3（簡潔30%）</h4>
                    <p className="text-sm text-gray-600 mb-2">最も重要な要点のみを残し、大幅に簡略化します。</p>
                    <p className="text-xs text-blue-600">適用場面: 短いテロップが必要な場合</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">用語辞書機能</h3>
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm">用語辞書を使用して、特定の単語や表現を自動的に置き換えることができます。</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">使い方</h4>
                    <ol className="text-sm text-gray-700 space-y-2">
                      <li>1. 「用語辞書」ボタンをクリック</li>
                      <li>2. 新規辞書を作成または既存辞書を選択</li>
                      <li>3. 置換ルールを追加（例: &quot;AI&quot; → &quot;人工知能&quot;）</li>
                      <li>4. 辞書を有効化</li>
                      <li>5. テロップ生成時に自動適用</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">クイック置換機能</h3>
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm">生成されたテロップに対して、一時的な置換を行うことができます。</p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">機能</h4>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li>• 複数の単語を一度に置換</li>
                      <li>• 置換ルールを辞書に保存</li>
                      <li>• リアルタイムプレビュー</li>
                      <li>• 元のテキストに戻す機能</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">SRTファイル出力</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">元音声SRT</h4>
                    <p className="text-sm text-gray-600">元の文字起こし結果をタイムスタンプ付きでSRT形式で出力します。</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">テロップSRT</h4>
                    <p className="text-sm text-gray-600">生成されたテロップをタイムスタンプ付きでSRT形式で出力します。</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tips' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">音声品質のコツ</h3>
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">✅ 推奨</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• クリアな音声（雑音が少ない）</li>
                      <li>• 適度な音量（大きすぎず小さすぎず）</li>
                      <li>• はっきりとした発音</li>
                      <li>• 適度な話速（速すぎない）</li>
                    </ul>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">❌ 避けるべき</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• 背景雑音が多い音声</li>
                      <li>• 複数人が同時に話す音声</li>
                      <li>• 音声が小さすぎる・大きすぎる</li>
                      <li>• 早口すぎる話し方</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">効率的な使い方</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">💡</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">事前準備</h4>
                      <p className="text-sm text-gray-600">よく使う置換ルールは用語辞書に登録しておきましょう。</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">💡</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">設定の保存</h4>
                      <p className="text-sm text-gray-600">よく使う設定（文字数、行数等）はブラウザが記憶します。</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">💡</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">段階的な調整</h4>
                      <p className="text-sm text-gray-600">まずは標準設定で試し、必要に応じて調整しましょう。</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">重要な注意点</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">テロップ生成の変動性について</h4>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm text-orange-700 mb-2">
                        同じ音声ファイルでも、毎回異なるテロップが生成される場合があります。
                      </p>
                      <ul className="text-sm text-orange-600 space-y-1">
                        <li>• <strong>原文ベース</strong>: 最も一貫性が高い</li>
                        <li>• <strong>レベル1</strong>: 比較的安定した結果</li>
                        <li>• <strong>レベル2-3</strong>: 創造性重視のため変動が大きい</li>
                      </ul>
                      <p className="text-xs text-orange-600 mt-2">
                        💡 一貫した結果が必要な場合は「原文ベース」をお試しください
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">トラブルシューティング</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">文字起こしが正確でない場合</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 音声品質を確認（雑音除去など）</li>
                      <li>• 話速を調整（ゆっくり話す）</li>
                      <li>• マイクとの距離を調整</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">テロップ結果が期待と異なる場合</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 要約レベルを調整（原文ベース→レベル1→レベル2→レベル3）</li>
                      <li>• 用語辞書で専門用語や固有名詞を登録</li>
                      <li>• クイック置換機能で部分的に修正</li>
                      <li>• 何度か実行して最適な結果を選択</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">処理が遅い場合</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• ファイルサイズを確認（大きすぎないか）</li>
                      <li>• インターネット接続を確認</li>
                      <li>• ブラウザを再起動</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">エラーが発生する場合</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• ファイル形式を確認</li>
                      <li>• ファイルサイズ・時間制限を確認</li>
                      <li>• ページを再読み込み</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">💬 フィードバック</h4>
                <p className="text-sm text-blue-700">
                  問題が解決しない場合や、機能改善のご要望がございましたら、
                  画面右上の「フィードバック」ボタンからお知らせください。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}