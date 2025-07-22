'use client'

import { useState, useEffect } from 'react'
import { User } from '@/utils/userManagerRedis'

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
    </div>
  )
}