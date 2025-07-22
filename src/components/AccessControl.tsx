'use client'

import React, { useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  role: 'admin' | 'user'
  active: boolean
  limits: {
    dailyRequests: number
    monthlyRequests: number
    monthlyCredits: number
    maxFileSize: number
  }
  usage: {
    totalRequests: number
    dailyRequests: number
    monthlyRequests: number
    monthlyCreditsUsed: number
    lastRequestDate: string | null
    lastResetDate: string | null
  }
}

interface AccessControlProps {
  children: React.ReactNode
}

export default function AccessControl({ children }: AccessControlProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // ローカルストレージから認証状態を確認
    const checkAuth = async () => {
      const authStatus = localStorage.getItem('telop-auth')
      const storedUserId = localStorage.getItem('telop-userId')
      
      if (authStatus === 'authenticated' && storedUserId) {
        console.log('🔍 AccessControl: Checking stored user:', storedUserId)
        
        try {
          const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getUser', userId: storedUserId })
          })
          
          const result = await response.json()
          console.log('🔍 AccessControl: User found:', result.user ? `${result.user.name} (${result.user.active ? 'active' : 'inactive'})` : 'null')
          
          if (result.success && result.user && result.user.active) {
            setIsAuthenticated(true)
            setCurrentUser(result.user)
            setUserId(storedUserId)
          } else {
            console.log('❌ AccessControl: User not found or inactive, clearing localStorage')
            localStorage.removeItem('telop-auth')
            localStorage.removeItem('telop-userId')
          }
        } catch (error) {
          console.error('AccessControl: Auth check error:', error)
          localStorage.removeItem('telop-auth')
          localStorage.removeItem('telop-userId')
        }
      }
      setIsLoading(false)
    }
    
    checkAuth()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userId.trim()) {
      setError('ユーザーIDを入力してください')
      return
    }
    
    console.log('🔍 Login attempt:', userId)
    
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'authenticate', userId, password })
      })
      
      const result = await response.json()
      console.log('🔍 Authentication result:', result.user ? `${result.user.name} (${result.user.active ? 'active' : 'inactive'})` : 'null')
      
      if (result.success && result.user) {
        setIsAuthenticated(true)
        setCurrentUser(result.user)
        localStorage.setItem('telop-auth', 'authenticated')
        localStorage.setItem('telop-userId', userId)
        setError('')
      } else {
        setError('ユーザーIDまたはパスワードが間違っています')
        setPassword('')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('ログインエラーが発生しました')
      setPassword('')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
    localStorage.removeItem('telop-auth')
    localStorage.removeItem('telop-userId')
    setUserId('')
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
              Magnetメンバー限定ツール
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-300 mb-2">
                ユーザーID
              </label>
              <input
                type="text"
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ユーザーIDを入力"
                required
              />
            </div>
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
                placeholder="パスワードを入力"
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
            <p>このツールはMagnetメンバー限定です</p>
            <p>ユーザーIDとパスワードがわからない場合は、Magnet内でお問い合わせください</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ヘッダーにユーザー情報とログアウトボタンを追加 */}
      <div className="bg-gray-800 p-4 flex justify-between items-center">
        <div className="text-white font-medium">
          🎬 AI Telop Generator v2 - {currentUser?.name || 'ユーザー'}
          {currentUser?.role === 'admin' && (
            <span className="ml-2 px-2 py-1 bg-yellow-600 text-xs rounded">管理者</span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {currentUser && (
            <div className="text-gray-300 text-sm">
              💳 クレジット: {currentUser.limits.monthlyCredits - currentUser.usage.monthlyCreditsUsed}/{currentUser.limits.monthlyCredits}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>
      
      {/* メインコンテンツ */}
      <div className="min-h-screen bg-gray-900">
        {React.cloneElement(children as React.ReactElement, { currentUserId: userId })}
      </div>
    </div>
  )
}