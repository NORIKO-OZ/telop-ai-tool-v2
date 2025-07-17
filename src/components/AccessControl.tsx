'use client'

import { useState, useEffect } from 'react'

interface AccessControlProps {
  children: React.ReactNode
}

export default function AccessControl({ children }: AccessControlProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // サロンメンバー用のパスワード（実際の使用時は環境変数から取得）
  const SALON_PASSWORD = 'telop2024'

  useEffect(() => {
    // ローカルストレージから認証状態を確認
    const authStatus = localStorage.getItem('telop-auth')
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password === SALON_PASSWORD) {
      setIsAuthenticated(true)
      localStorage.setItem('telop-auth', 'authenticated')
      setError('')
    } else {
      setError('パスワードが間違っています')
      setPassword('')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('telop-auth')
    setPassword('')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">読み込み中...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              🎬 AI Telop Generator v2
            </h1>
            <p className="text-gray-300 text-sm">
              サロンメンバー限定ツール
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                パスワード
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="サロンメンバー用パスワードを入力"
                required
              />
            </div>
            
            {error && (
              <div className="text-red-400 text-sm text-center">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              ログイン
            </button>
          </form>
          
          <div className="mt-6 text-center text-gray-400 text-sm">
            <p>このツールはサロンメンバー限定です</p>
            <p>パスワードがわからない場合は、サロン内でお問い合わせください</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ヘッダーにログアウトボタンを追加 */}
      <div className="bg-gray-800 p-4 flex justify-between items-center">
        <div className="text-white font-medium">
          🎬 AI Telop Generator v2 - サロンメンバー限定
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
        >
          ログアウト
        </button>
      </div>
      
      {/* メインコンテンツ */}
      <div className="min-h-screen bg-gray-900">
        {children}
      </div>
    </div>
  )
}