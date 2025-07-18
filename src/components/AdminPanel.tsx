'use client'

import { useState, useEffect } from 'react'
import { UserManager, User } from '@/utils/userManager'

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
    dailyRequests: 10,
    monthlyRequests: 100,
    monthlyCredits: 300,
    maxFileSize: 50
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = () => {
    setIsLoading(true)
    try {
      const allUsers = UserManager.getAllUsers()
      setUsers(allUsers)
      
      // 全体統計も取得
      const stats = UserManager.getOverallUsageStats()
      setOverallStats(stats)
    } catch {
      setError('ユーザー情報の読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = () => {
    if (!newUser.id || !newUser.password || !newUser.name) {
      setError('必須項目をすべて入力してください')
      return
    }

    const success = UserManager.createUser({
      id: newUser.id,
      password: newUser.password,
      name: newUser.name,
      role: newUser.role,
      limits: {
        dailyRequests: newUser.dailyRequests,
        monthlyRequests: newUser.monthlyRequests,
        monthlyCredits: newUser.monthlyCredits,
        maxFileSize: newUser.maxFileSize
      },
      active: true
    })

    if (success) {
      setSuccess('ユーザーを作成しました')
      setNewUser({
        id: '',
        password: '',
        name: '',
        role: 'user',
        dailyRequests: 10,
        monthlyRequests: 100,
        monthlyCredits: 300,
        maxFileSize: 50
      })
      loadUsers()
    } else {
      setError('ユーザー作成に失敗しました（IDが重複している可能性があります）')
    }
  }

  const handleDeleteUser = (userId: string) => {
    if (window.confirm(`ユーザー「${userId}」を削除してもよろしいですか？`)) {
      const success = UserManager.deleteUser(userId)
      if (success) {
        setSuccess('ユーザーを削除しました')
        loadUsers()
      } else {
        setError('ユーザー削除に失敗しました')
      }
    }
  }

  const handleToggleActive = (userId: string) => {
    const success = UserManager.toggleActive(userId)
    if (success) {
      setSuccess('ユーザーのステータスを更新しました')
      loadUsers()
    } else {
      setError('ステータス更新に失敗しました')
    }
  }

  const handleUpdateLimits = () => {
    if (!selectedUser) return

    const success = UserManager.updateLimits(selectedUser.id, selectedUser.limits)
    if (success) {
      setSuccess('制限を更新しました')
      setSelectedUser(null)
      loadUsers()
    } else {
      setError('制限の更新に失敗しました')
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

      {/* コスト詳細パネル */}
      {overallStats && (
        <div className="mb-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">コスト詳細分析</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3 text-gray-300">API別コスト内訳</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 px-3 bg-gray-700 rounded">
                  <span>Whisper API (音声認識)</span>
                  <span className="font-mono">${overallStats.costBreakdown.whisperCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-gray-700 rounded">
                  <span>GPT-4 API (テキスト生成)</span>
                  <span className="font-mono">${overallStats.costBreakdown.gptCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-blue-600 rounded font-semibold">
                  <span>合計</span>
                  <span className="font-mono">${overallStats.costBreakdown.totalCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3 text-gray-300">コスト予測</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 px-3 bg-gray-700 rounded">
                  <span>今日の予測 (24時間)</span>
                  <span className="font-mono">${(overallStats.totalDailyRequests * 0.078).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-gray-700 rounded">
                  <span>今月の予測 (30日)</span>
                  <span className="font-mono">${(overallStats.totalMonthlyRequests * 0.078).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-green-600 rounded font-semibold">
                  <span>月間予算目安</span>
                  <span className="font-mono">${((overallStats.totalMonthlyRequests * 0.078) * 1.2).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-yellow-900 bg-opacity-50 rounded-lg border border-yellow-600">
            <h4 className="text-yellow-300 font-medium mb-2">💡 コスト計算について</h4>
            <ul className="text-sm text-yellow-200 space-y-1">
              <li>• Whisper API: $0.006/分 × 平均3分 = $0.018/リクエスト</li>
              <li>• GPT-4 API: $0.03/1K入力トークン + $0.06/1K出力トークン ≈ $0.06/リクエスト</li>
              <li>• 合計: 約$0.078/リクエスト (実際の使用量により変動)</li>
            </ul>
          </div>
          <div className="mt-4 p-4 bg-blue-900 bg-opacity-50 rounded-lg border border-blue-600">
            <h4 className="text-blue-300 font-medium mb-2">💳 クレジットシステムについて</h4>
            <ul className="text-sm text-blue-200 space-y-1">
              <li>• 1分の音声処理 = 1クレジット</li>
              <li>• 動画→音声変換は無料（クライアント側処理）</li>
              <li>• ユーザーは月間クレジット制限内で自由に利用可能</li>
              <li>• 短い動画を多数処理する場合に特に有効</li>
            </ul>
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
            <label className="block text-sm font-medium mb-2">日次制限</label>
            <input
              type="number"
              value={newUser.dailyRequests}
              onChange={(e) => setNewUser({ ...newUser, dailyRequests: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">月次制限</label>
            <input
              type="number"
              value={newUser.monthlyRequests}
              onChange={(e) => setNewUser({ ...newUser, monthlyRequests: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              min="0"
            />
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
            <label className="block text-sm font-medium mb-2">最大ファイルサイズ (MB)</label>
            <input
              type="number"
              value={newUser.maxFileSize}
              onChange={(e) => setNewUser({ ...newUser, maxFileSize: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              min="0"
            />
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
                <th className="text-left p-2">日次使用</th>
                <th className="text-left p-2">月次使用</th>
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
                    {user.usage.dailyRequests}/{user.limits.dailyRequests}
                  </td>
                  <td className="p-2">
                    {user.usage.monthlyRequests}/{user.limits.monthlyRequests}
                  </td>
                  <td className="p-2">
                    {user.usage.monthlyCreditsUsed}/{user.limits.monthlyCredits}
                  </td>
                  <td className="p-2 text-xs">
                    日:{user.limits.dailyRequests} 月:{user.limits.monthlyRequests} クレ:{user.limits.monthlyCredits} サイズ:{user.limits.maxFileSize}MB
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

      {/* 制限編集モーダル */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">制限編集: {selectedUser.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">日次制限</label>
                <input
                  type="number"
                  value={selectedUser.limits.dailyRequests}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    limits: {
                      ...selectedUser.limits,
                      dailyRequests: parseInt(e.target.value) || 0
                    }
                  })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">月次制限</label>
                <input
                  type="number"
                  value={selectedUser.limits.monthlyRequests}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    limits: {
                      ...selectedUser.limits,
                      monthlyRequests: parseInt(e.target.value) || 0
                    }
                  })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                  min="0"
                />
              </div>
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
              <div>
                <label className="block text-sm font-medium mb-2">最大ファイルサイズ (MB)</label>
                <input
                  type="number"
                  value={selectedUser.limits.maxFileSize}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    limits: {
                      ...selectedUser.limits,
                      maxFileSize: parseInt(e.target.value) || 0
                    }
                  })}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                  min="0"
                />
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
                onClick={handleUpdateLimits}
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