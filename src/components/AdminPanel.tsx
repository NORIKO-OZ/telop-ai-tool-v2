'use client'

import { useState, useEffect } from 'react'
import { User } from '@/utils/userManagerRedis'
import AdminManualModal from './AdminManualModal'

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [overallStats, setOverallStats] = useState<{
    totalUsers: number
    activeUsers: number
    totalRequests: number
    totalDailyRequests: number
    totalMonthlyRequests: number
    estimatedCost: number
    costBreakdown: {
      whisperCost: number
      gptCost: number
      totalCost: number
    }
  } | null>(null)

  // メール通知設定用の状態
  const [emailSettings, setEmailSettings] = useState({
    enabled: false,
    emailAddresses: [] as string[],
    sendTime: '09:00',
    includeStats: true,
    includeUserActivity: true,
    includeCostBreakdown: true
  })
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false)
  const [newEmailAddress, setNewEmailAddress] = useState('')
  const [isManualOpen, setIsManualOpen] = useState(false)

  // 新規ユーザー作成フォーム
  const [newUser, setNewUser] = useState({
    id: '',
    password: '',
    name: '',
    role: 'user' as 'admin' | 'user',
    monthlyCredits: 300,
    maxDurationMinutes: 30
  })

  useEffect(() => {
    loadUsers()
    loadEmailSettings()
  }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.users)
        setOverallStats(data.stats)
      } else {
        setError('ユーザー情報の読み込みに失敗しました')
      }
    } catch {
      setError('ユーザー情報の読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.id || !newUser.password || !newUser.name) {
      setError('必須項目をすべて入力してください')
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          user: {
            id: newUser.id,
            password: newUser.password,
            name: newUser.name,
            role: newUser.role,
            limits: {
              dailyRequests: 999,
              monthlyRequests: 999,
              monthlyCredits: newUser.monthlyCredits,
              maxFileSize: 999999, // ファイルサイズ制限なし
              maxDurationMinutes: newUser.maxDurationMinutes
            },
            active: true
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess('ユーザーを作成しました')
        setNewUser({
          id: '',
          password: '',
          name: '',
          role: 'user',
          monthlyCredits: 300,
          maxDurationMinutes: 30
        })
        loadUsers()
      } else {
        setError('ユーザー作成に失敗しました（IDが重複している可能性があります）')
      }
    } catch {
      setError('ユーザー作成に失敗しました')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm(`ユーザー「${userId}」を削除してもよろしいですか？`)) {
      try {
        const response = await fetch('/api/admin/users', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        })

        const data = await response.json()
        
        if (data.success) {
          setSuccess('ユーザーを削除しました')
          loadUsers()
        } else {
          setError('ユーザー削除に失敗しました')
        }
      } catch {
        setError('ユーザー削除に失敗しました')
      }
    }
  }

  const handleToggleActive = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleActive', userId })
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess('ユーザーのステータスを更新しました')
        loadUsers()
      } else {
        setError('ステータス更新に失敗しました')
      }
    } catch {
      setError('ステータス更新に失敗しました')
    }
  }

  const handleUpdateUserInfo = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update', 
          userId: selectedUser.id,
          updates: selectedUser
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess('ユーザー情報を更新しました')
        setSelectedUser(null)
        loadUsers()
      } else {
        setError(data.error || 'ユーザー情報の更新に失敗しました')
      }
    } catch {
      setError('ユーザー情報の更新中にエラーが発生しました')
    }
  }

  const loadEmailSettings = async () => {
    try {
      const response = await fetch('/api/admin/email-settings')
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setEmailSettings(data.settings)
        }
      }
    } catch (error) {
      console.warn('メール設定の読み込みに失敗しました:', error)
    }
  }

  const addEmailAddress = () => {
    const email = newEmailAddress.trim()
    if (!email) {
      setError('メールアドレスを入力してください')
      return
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('有効なメールアドレス形式で入力してください')
      return
    }
    
    if (emailSettings.emailAddresses.includes(email)) {
      setError('このメールアドレスは既に追加されています')
      return
    }
    
    setEmailSettings({
      ...emailSettings,
      emailAddresses: [...emailSettings.emailAddresses, email]
    })
    setNewEmailAddress('')
    clearMessages()
  }

  const removeEmailAddress = (emailToRemove: string) => {
    setEmailSettings({
      ...emailSettings,
      emailAddresses: emailSettings.emailAddresses.filter(email => email !== emailToRemove)
    })
  }

  const saveEmailSettings = async () => {
    if (emailSettings.enabled && emailSettings.emailAddresses.length === 0) {
      setError('メールアドレスを少なくとも1つ追加してください')
      return
    }

    try {
      const response = await fetch('/api/admin/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailSettings)
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccess('メール通知設定を保存しました')
        setIsEmailSettingsOpen(false)
      } else {
        setError(data.error || 'メール設定の保存に失敗しました')
      }
    } catch {
      setError('メール設定の保存中にエラーが発生しました')
    }
  }

  const sendTestEmail = async () => {
    if (emailSettings.emailAddresses.length === 0) {
      setError('テスト送信するメールアドレスを追加してください')
      return
    }

    try {
      // 複数アドレスに順次送信
      const results = []
      for (const emailAddress of emailSettings.emailAddresses) {
        const response = await fetch('/api/admin/send-test-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailAddress })
        })
        
        const data = await response.json()
        results.push({ email: emailAddress, success: data.success, error: data.error })
      }
      
      const successCount = results.filter(r => r.success).length
      const failureCount = results.filter(r => !r.success).length
      
      if (failureCount === 0) {
        setSuccess(`${successCount}件のテストメールを送信しました`)
      } else {
        setError(`${successCount}件成功、${failureCount}件失敗しました`)
      }
    } catch {
      setError('テストメール送信中にエラーが発生しました')
    }
  }

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-900 text-white min-h-screen">
        <h1 className="text-2xl font-bold mb-4">管理者パネル</h1>
        <div>読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">管理者パネル</h1>

      {/* メッセージ表示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-600 text-white rounded-md">
          {error}
          <button onClick={clearMessages} className="ml-2 text-sm underline">
            閉じる
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-600 text-white rounded-md">
          {success}
          <button onClick={clearMessages} className="ml-2 text-sm underline">
            閉じる
          </button>
        </div>
      )}

      {/* 全体統計ダッシュボード */}
      {overallStats && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div className="bg-blue-600 text-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">総ユーザー数</h3>
            <p className="text-3xl font-bold">{overallStats.totalUsers}</p>
            <p className="text-sm opacity-80">アクティブ: {overallStats.activeUsers}</p>
          </div>
          
          <div className="bg-green-600 text-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">総リクエスト数</h3>
            <p className="text-3xl font-bold">{overallStats.totalRequests.toLocaleString()}</p>
            <p className="text-sm opacity-80">今日: {overallStats.totalDailyRequests} / 今月: {overallStats.totalMonthlyRequests}</p>
          </div>
          
          <div className="bg-purple-600 text-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">推定コスト</h3>
            <p className="text-3xl font-bold">${overallStats.estimatedCost.toFixed(2)}</p>
            <p className="text-sm opacity-80">1リクエスト: $0.078</p>
          </div>
          
          <div className="bg-orange-600 text-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">今日の使用量</h3>
            <p className="text-3xl font-bold">{overallStats.totalDailyRequests}</p>
            <p className="text-sm opacity-80">推定コスト: ${(overallStats.totalDailyRequests * 0.078).toFixed(2)}</p>
          </div>
          
          <div className="bg-red-600 text-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">今月の使用量</h3>
            <p className="text-3xl font-bold">{overallStats.totalMonthlyRequests}</p>
            <p className="text-sm opacity-80">推定コスト: ${(overallStats.totalMonthlyRequests * 0.078).toFixed(2)}</p>
          </div>
          
          <div className="bg-gray-600 text-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">平均使用量</h3>
            <p className="text-3xl font-bold">{overallStats.activeUsers > 0 ? (overallStats.totalRequests / overallStats.activeUsers).toFixed(1) : '0'}</p>
            <p className="text-sm opacity-80">リクエスト/ユーザー</p>
          </div>
          
          <div className="bg-indigo-600 text-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">クレジット使用状況</h3>
            <p className="text-3xl font-bold">{users.reduce((sum, user) => sum + user.usage.monthlyCreditsUsed, 0)}</p>
            <p className="text-sm opacity-80">総クレジット消費 / 今月</p>
          </div>
          
          <div className="bg-teal-600 text-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">平均処理時間</h3>
            <p className="text-3xl font-bold">{overallStats.totalRequests > 0 ? (users.reduce((sum, user) => sum + user.usage.monthlyCreditsUsed, 0) / overallStats.totalRequests).toFixed(1) : '0'}</p>
            <p className="text-sm opacity-80">分/リクエスト</p>
          </div>
        </div>
      )}

      {/* 管理ツールボタン */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setIsEmailSettingsOpen(true)}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white px-6 py-3 rounded-lg hover:from-cyan-600 hover:to-cyan-700 flex items-center space-x-2 shadow-md transition-all duration-200 hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="font-medium">メール通知設定</span>
          {emailSettings.enabled && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              ON ({emailSettings.emailAddresses.length})
            </span>
          )}
        </button>
        
        <button
          onClick={() => setIsManualOpen(true)}
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-6 py-3 rounded-lg hover:from-yellow-600 hover:to-yellow-700 flex items-center space-x-2 shadow-md transition-all duration-200 hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-medium">管理者マニュアル</span>
        </button>
      </div>

      {/* ユーザー作成フォーム */}
      <div className="mb-8 p-4 bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">新規ユーザー作成</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">ユーザーID</label>
            <input
              type="text"
              value={newUser.id}
              onChange={(e) => setNewUser({ ...newUser, id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              placeholder="例: user001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">パスワード</label>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">名前</label>
            <input
              type="text"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              placeholder="例: 田中太郎"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">権限</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'user' })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
            >
              <option value="user">ユーザー</option>
              <option value="admin">管理者</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">月次クレジット制限</label>
            <input
              type="number"
              value={newUser.monthlyCredits}
              onChange={(e) => setNewUser({ ...newUser, monthlyCredits: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              min="0"
              placeholder="例: 300 (5時間分)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">最大ファイル時間 (分)</label>
            <input
              type="number"
              value={newUser.maxDurationMinutes}
              onChange={(e) => setNewUser({ ...newUser, maxDurationMinutes: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              min="0"
              max="30"
              placeholder="最大30分"
            />
            <p className="text-xs text-gray-400 mt-1">現在の仕様では最大30分に統一されています</p>
          </div>
        </div>
        <button
          onClick={handleCreateUser}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
        >
          ユーザー作成
        </button>
      </div>

      {/* ユーザー一覧 */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">ユーザー一覧</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">名前</th>
                <th className="text-left p-2">権限</th>
                <th className="text-left p-2">状態</th>
                <th className="text-left p-2">クレジット</th>
                <th className="text-left p-2">制限</th>
                <th className="text-left p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-700">
                  <td className="p-2 font-mono">{user.id}</td>
                  <td className="p-2">{user.name}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.role === 'admin' ? 'bg-yellow-600' : 'bg-gray-600'
                    }`}>
                      {user.role === 'admin' ? '管理者' : 'ユーザー'}
                    </span>
                  </td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.active ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                      {user.active ? '有効' : '無効'}
                    </span>
                  </td>
                  <td className="p-2">
                    {user.usage.monthlyCreditsUsed}/{user.limits.monthlyCredits}
                  </td>
                  <td className="p-2 text-xs">
                    クレ:{user.limits.monthlyCredits} 時間制限:{user.limits.maxDurationMinutes}分
                  </td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-xs rounded"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id)}
                        className={`px-2 py-1 text-xs rounded ${
                          user.active 
                            ? 'bg-yellow-600 hover:bg-yellow-700' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {user.active ? '無効化' : '有効化'}
                      </button>
                      {user.id !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-xs rounded"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ユーザー情報編集モーダル */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-xl font-semibold mb-4">ユーザー編集: {selectedUser.name}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">ユーザーID</label>
                  <input
                    type="text"
                    value={selectedUser.id}
                    onChange={(e) => setSelectedUser({
                      ...selectedUser,
                      id: e.target.value
                    })}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                    disabled={selectedUser.id === 'admin'}
                  />
                  {selectedUser.id === 'admin' && (
                    <p className="text-xs text-gray-400 mt-1">管理者のIDは変更できません</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">名前</label>
                  <input
                    type="text"
                    value={selectedUser.name}
                    onChange={(e) => setSelectedUser({
                      ...selectedUser,
                      name: e.target.value
                    })}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">パスワード</label>
                <input
                  type="password"
                  value={selectedUser.password || ''}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    password: e.target.value
                  })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                  placeholder="新しいパスワード（6文字以上）"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">月次クレジット制限</label>
                  <input
                    type="number"
                    value={selectedUser.limits.monthlyCredits}
                    onChange={(e) => setSelectedUser({
                      ...selectedUser,
                      limits: {
                        ...selectedUser.limits,
                        monthlyCredits: parseInt(e.target.value) || 0
                      }
                    })}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                    min="0"
                    placeholder="例: 300 (5時間分)"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">最大ファイル時間 (分)</label>
                <input
                  type="number"
                  value={selectedUser.limits.maxDurationMinutes}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    limits: {
                      ...selectedUser.limits,
                      maxDurationMinutes: parseInt(e.target.value) || 0
                    }
                  })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                  min="0"
                  max="30"
                  placeholder="最大30分"
                />
                <p className="text-xs text-gray-400 mt-1">現在の仕様では最大30分に統一されています</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateUserInfo}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メール通知設定モーダル */}
      {isEmailSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">メール通知設定</h3>
              <button
                onClick={() => setIsEmailSettingsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* 通知有効化 */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={emailSettings.enabled}
                    onChange={(e) => setEmailSettings({
                      ...emailSettings,
                      enabled: e.target.checked
                    })}
                    className="w-5 h-5 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                  />
                  <span className="text-lg font-medium">日次メール通知を有効にする</span>
                </label>
                <p className="text-sm text-gray-400 mt-1">毎日指定時刻に使用状況レポートをメール送信します</p>
              </div>

              {/* メールアドレス */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  通知先メールアドレス <span className="text-red-500">*</span>
                </label>
                
                {/* 既存のメールアドレス一覧 */}
                {emailSettings.emailAddresses.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {emailSettings.emailAddresses.map((email, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-700 border border-gray-600 rounded-md px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-white">{email}</span>
                        </div>
                        <button
                          onClick={() => removeEmailAddress(email)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 rounded"
                          title="削除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 新しいメールアドレス追加 */}
                <div className="flex space-x-2">
                  <input
                    type="email"
                    value={newEmailAddress}
                    onChange={(e) => setNewEmailAddress(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addEmailAddress()}
                    className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-cyan-500 focus:ring-cyan-500"
                    placeholder="新しいメールアドレスを追加..."
                  />
                  <button
                    onClick={addEmailAddress}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>追加</span>
                  </button>
                </div>
                
                <p className="text-xs text-gray-400 mt-2">
                  複数のメールアドレスに同じレポートが送信されます
                </p>
              </div>

              {/* 送信時刻 */}
              <div>
                <label className="block text-sm font-medium mb-2">送信時刻</label>
                <input
                  type="time"
                  value={emailSettings.sendTime}
                  onChange={(e) => setEmailSettings({
                    ...emailSettings,
                    sendTime: e.target.value
                  })}
                  className={`px-3 py-2 text-white rounded-md border focus:border-cyan-500 focus:ring-cyan-500 ${
                    emailSettings.enabled 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-gray-800 border-gray-700 opacity-75'
                  }`}
                />
                <p className="text-sm text-gray-400 mt-1">日本時間での送信時刻を指定してください</p>
              </div>

              {/* レポート内容 */}
              <div>
                <label className="block text-sm font-medium mb-3">レポートに含める内容</label>
                <div className="space-y-3">
                  <label className={`flex items-center space-x-3 cursor-pointer ${!emailSettings.enabled ? 'opacity-75' : ''}`}>
                    <input
                      type="checkbox"
                      checked={emailSettings.includeStats}
                      onChange={(e) => setEmailSettings({
                        ...emailSettings,
                        includeStats: e.target.checked
                      })}
                      className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                    />
                    <span>📊 全体統計（総ユーザー数、リクエスト数、推定コスト）</span>
                  </label>
                  <label className={`flex items-center space-x-3 cursor-pointer ${!emailSettings.enabled ? 'opacity-75' : ''}`}>
                    <input
                      type="checkbox"
                      checked={emailSettings.includeUserActivity}
                      onChange={(e) => setEmailSettings({
                        ...emailSettings,
                        includeUserActivity: e.target.checked
                      })}
                      className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                    />
                    <span>👥 ユーザー別活動状況（使用クレジット、リクエスト数）</span>
                  </label>
                  <label className={`flex items-center space-x-3 cursor-pointer ${!emailSettings.enabled ? 'opacity-75' : ''}`}>
                    <input
                      type="checkbox"
                      checked={emailSettings.includeCostBreakdown}
                      onChange={(e) => setEmailSettings({
                        ...emailSettings,
                        includeCostBreakdown: e.target.checked
                      })}
                      className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                    />
                    <span>💰 コスト内訳（Whisper API、GPT API別）</span>
                  </label>
                </div>
              </div>

              {/* プレビュー情報 */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium mb-2">📋 レポート例</h4>
                <div className="text-sm text-gray-300 space-y-1">
                  <p>🔹 件名: [AI テロップツール] 日次利用状況レポート - {new Date().toLocaleDateString('ja-JP')}</p>
                  <p>🔹 送信先: {emailSettings.emailAddresses.length > 0 ? `${emailSettings.emailAddresses.length}件のアドレス` : '未設定'}</p>
                  <p>🔹 総ユーザー数: {overallStats?.totalUsers || 0}名</p>
                  <p>🔹 今日のリクエスト数: {overallStats?.totalDailyRequests || 0}件</p>
                  <p>🔹 推定日次コスト: ${overallStats ? (overallStats.totalDailyRequests * 0.078).toFixed(2) : '0.00'}</p>
                  <p>🔹 アクティブユーザー一覧と使用状況</p>
                </div>
              </div>

              {/* ボタン */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-600">
                <button
                  onClick={sendTestEmail}
                  disabled={emailSettings.emailAddresses.length === 0}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md text-sm flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>テストメール送信</span>
                  {emailSettings.emailAddresses.length > 0 && (
                    <span className="bg-yellow-800 text-yellow-100 text-xs px-1.5 py-0.5 rounded">
                      {emailSettings.emailAddresses.length}
                    </span>
                  )}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsEmailSettingsOpen(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={saveEmailSettings}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md"
                  >
                    設定を保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 管理者マニュアルモーダル */}
      <AdminManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />
    </div>
  )
}