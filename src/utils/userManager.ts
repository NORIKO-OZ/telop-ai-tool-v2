export interface UserLimits {
  dailyRequests: number
  monthlyRequests: number
  monthlyCredits: number  // 新しいクレジット制限
  maxFileSize: number
}

export interface UserUsage {
  totalRequests: number
  dailyRequests: number
  monthlyRequests: number
  monthlyCreditsUsed: number  // 新しいクレジット使用量
  lastRequestDate: string | null
  lastResetDate: string | null
}

export interface User {
  id: string
  password: string
  name: string
  role: 'admin' | 'user'
  limits: UserLimits
  usage: UserUsage
  createdAt: string
  active: boolean
}

// ユーザーデータを直接埋め込み
const defaultUsers: Record<string, User> = {
  admin: {
    id: "admin",
    password: "admin123",
    name: "管理者",
    role: "admin",
    limits: {
      dailyRequests: 999,
      monthlyRequests: 999,
      monthlyCredits: 9999,
      maxFileSize: 100
    },
    usage: {
      totalRequests: 0,
      dailyRequests: 0,
      monthlyRequests: 0,
      monthlyCreditsUsed: 0,
      lastRequestDate: null,
      lastResetDate: null
    },
    createdAt: "2025-01-01T00:00:00.000Z",
    active: true
  },
  user001: {
    id: "user001",
    password: "telop2024",
    name: "田中太郎",
    role: "user",
    limits: {
      dailyRequests: 10,
      monthlyRequests: 100,
      monthlyCredits: 300,  // 5時間分の動画処理可能
      maxFileSize: 500
    },
    usage: {
      totalRequests: 0,
      dailyRequests: 0,
      monthlyRequests: 0,
      monthlyCreditsUsed: 0,
      lastRequestDate: null,
      lastResetDate: null
    },
    createdAt: "2025-01-01T00:00:00.000Z",
    active: true
  },
  user002: {
    id: "user002",
    password: "salon2024",
    name: "佐藤花子",
    role: "user",
    limits: {
      dailyRequests: 5,
      monthlyRequests: 50,
      monthlyCredits: 150,  // 2.5時間分の動画処理可能
      maxFileSize: 300
    },
    usage: {
      totalRequests: 0,
      dailyRequests: 0,
      monthlyRequests: 0,
      monthlyCreditsUsed: 0,
      lastRequestDate: null,
      lastResetDate: null
    },
    createdAt: "2025-01-01T00:00:00.000Z",
    active: true
  },
  user003: {
    id: "user003",
    password: "video2024",
    name: "高橋一郎",
    role: "user",
    limits: {
      dailyRequests: 15,
      monthlyRequests: 150,
      monthlyCredits: 600,  // 10時間分の動画処理可能
      maxFileSize: 1000
    },
    usage: {
      totalRequests: 0,
      dailyRequests: 0,
      monthlyRequests: 0,
      monthlyCreditsUsed: 0,
      lastRequestDate: null,
      lastResetDate: null
    },
    createdAt: "2025-01-01T00:00:00.000Z",
    active: true
  }
}

export class UserManager {
  private static users: Record<string, User> = defaultUsers

  // ユーザー認証
  static authenticate(userId: string, password: string): User | null {
    const user = this.users[userId]
    if (!user || !user.active || user.password !== password) {
      return null
    }
    return user
  }

  // ユーザー情報取得
  static getUser(userId: string): User | null {
    return this.users[userId] || null
  }

  // 全ユーザー取得（管理者用）
  static getAllUsers(): User[] {
    return Object.values(this.users)
  }

  // 使用量チェック
  static checkUsageLimit(userId: string): { canUse: boolean; reason?: string } {
    const user = this.users[userId]
    if (!user || !user.active) {
      return { canUse: false, reason: 'ユーザーが見つかりません' }
    }

    const today = new Date().toISOString().split('T')[0]
    const currentMonth = new Date().toISOString().substring(0, 7)
    
    // 日付が変わったらリセット
    if (user.usage.lastRequestDate !== today) {
      user.usage.dailyRequests = 0
      user.usage.lastRequestDate = today
    }

    // 月が変わったらリセット
    if (user.usage.lastResetDate !== currentMonth) {
      user.usage.monthlyRequests = 0
      user.usage.monthlyCreditsUsed = 0
      user.usage.lastResetDate = currentMonth
    }

    // 日次制限チェック（削除済み - クレジット制限を使用）

    // 月次制限チェック（削除済み - クレジット制限のみ使用）

    // 月次クレジット制限チェック
    if (user.usage.monthlyCreditsUsed >= user.limits.monthlyCredits) {
      return { 
        canUse: false, 
        reason: `月次クレジット制限に達しました（${user.limits.monthlyCredits}クレジット/月）` 
      }
    }

    return { canUse: true }
  }

  // 使用量記録
  static recordUsage(userId: string): boolean {
    const user = this.users[userId]
    if (!user) return false

    const today = new Date().toISOString().split('T')[0]
    const currentMonth = new Date().toISOString().substring(0, 7)

    // 日付が変わったらリセット
    if (user.usage.lastRequestDate !== today) {
      user.usage.dailyRequests = 0
      user.usage.lastRequestDate = today
    }

    // 月が変わったらリセット
    if (user.usage.lastResetDate !== currentMonth) {
      user.usage.monthlyRequests = 0
      user.usage.monthlyCreditsUsed = 0
      user.usage.lastResetDate = currentMonth
    }

    user.usage.totalRequests++
    user.usage.dailyRequests++
    user.usage.monthlyRequests++

    // 実際の環境では、これをデータベースに保存する
    console.log(`Usage recorded for ${userId}:`, user.usage)
    return true
  }

  // クレジット使用可能チェック
  static checkCreditAvailability(userId: string, requiredCredits: number): { canUse: boolean; reason?: string } {
    const user = this.users[userId]
    if (!user || !user.active) {
      return { canUse: false, reason: 'ユーザーが見つかりません' }
    }

    const currentMonth = new Date().toISOString().substring(0, 7)
    
    // 月が変わったらリセット
    if (user.usage.lastResetDate !== currentMonth) {
      user.usage.monthlyCreditsUsed = 0
      user.usage.lastResetDate = currentMonth
    }

    const remainingCredits = user.limits.monthlyCredits - user.usage.monthlyCreditsUsed
    
    if (requiredCredits > remainingCredits) {
      return { 
        canUse: false, 
        reason: `クレジットが不足しています（必要: ${requiredCredits}, 残り: ${remainingCredits}）` 
      }
    }

    return { canUse: true }
  }

  // クレジット消費
  static consumeCredits(userId: string, audioLengthMinutes: number): boolean {
    const user = this.users[userId]
    if (!user) return false

    const currentMonth = new Date().toISOString().substring(0, 7)
    
    // 月が変わったらリセット
    if (user.usage.lastResetDate !== currentMonth) {
      user.usage.monthlyCreditsUsed = 0
      user.usage.lastResetDate = currentMonth
    }

    // 1分 = 1クレジット（端数は切り上げ）
    const creditsToConsume = Math.ceil(audioLengthMinutes)
    
    user.usage.monthlyCreditsUsed += creditsToConsume

    console.log(`Credits consumed for ${userId}: ${creditsToConsume} (${audioLengthMinutes.toFixed(2)} minutes)`)
    console.log(`User ${userId} current status: Used ${user.usage.monthlyCreditsUsed}/${user.limits.monthlyCredits} credits`)
    
    // ⚠️ 注意: サーバーレス環境ではメモリは永続化されません
    // 本番環境ではデータベースまたは外部ストレージが必要
    return true
  }

  // 音声時間からクレジット計算
  static calculateCreditsFromDuration(durationSeconds: number): number {
    const minutes = durationSeconds / 60
    return Math.ceil(minutes)
  }

  // ファイルサイズチェック
  static checkFileSize(userId: string, fileSizeMB: number): { canUpload: boolean; reason?: string } {
    const user = this.users[userId]
    if (!user) {
      return { canUpload: false, reason: 'ユーザーが見つかりません' }
    }

    if (fileSizeMB > user.limits.maxFileSize) {
      return { 
        canUpload: false, 
        reason: `ファイルサイズが制限を超えています（最大${user.limits.maxFileSize}MB）` 
      }
    }

    return { canUpload: true }
  }

  // 使用量統計取得
  static getUsageStats(userId: string): UserUsage | null {
    const user = this.users[userId]
    return user ? user.usage : null
  }

  // 全体の使用量統計を取得
  static getOverallUsageStats(): {
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
  } {
    const allUsers = this.getAllUsers()
    const activeUsers = allUsers.filter(user => user.active)
    
    const totalRequests = allUsers.reduce((sum, user) => sum + user.usage.totalRequests, 0)
    const totalDailyRequests = allUsers.reduce((sum, user) => sum + user.usage.dailyRequests, 0)
    const totalMonthlyRequests = allUsers.reduce((sum, user) => sum + user.usage.monthlyRequests, 0)
    
    // OpenAI API コスト計算 (2024年の参考価格)
    // Whisper API: $0.006 per minute (平均3分の音声と仮定)
    const whisperCostPerRequest = 0.006 * 3 // $0.018
    
    // GPT-4 API: 約 $0.03 per 1K tokens (入力) + $0.06 per 1K tokens (出力)
    // 平均的なリクエストで 1K input tokens + 0.5K output tokens と仮定
    const gptInputCost = 0.03 * 1 // $0.03
    const gptOutputCost = 0.06 * 0.5 // $0.03
    const gptCostPerRequest = gptInputCost + gptOutputCost // $0.06
    
    const totalCostPerRequest = whisperCostPerRequest + gptCostPerRequest // $0.078
    
    const whisperCost = totalRequests * whisperCostPerRequest
    const gptCost = totalRequests * gptCostPerRequest
    const estimatedCost = totalRequests * totalCostPerRequest
    
    return {
      totalUsers: allUsers.length,
      activeUsers: activeUsers.length,
      totalRequests,
      totalDailyRequests,
      totalMonthlyRequests,
      estimatedCost,
      costBreakdown: {
        whisperCost,
        gptCost,
        totalCost: estimatedCost
      }
    }
  }

  // 制限情報取得
  static getLimits(userId: string): UserLimits | null {
    const user = this.users[userId]
    return user ? user.limits : null
  }

  // 管理者権限チェック
  static isAdmin(userId: string): boolean {
    const user = this.users[userId]
    return user?.role === 'admin'
  }

  // ユーザー作成（管理者用）
  static createUser(newUser: Omit<User, 'usage' | 'createdAt'>): boolean {
    if (this.users[newUser.id]) {
      return false // 既に存在
    }

    this.users[newUser.id] = {
      ...newUser,
      usage: {
        totalRequests: 0,
        dailyRequests: 0,
        monthlyRequests: 0,
        monthlyCreditsUsed: 0,
        lastRequestDate: null,
        lastResetDate: null
      },
      createdAt: new Date().toISOString()
    }

    return true
  }

  // ユーザー削除（管理者用）
  static deleteUser(userId: string): boolean {
    if (userId === 'admin') {
      return false // 管理者は削除不可
    }

    if (this.users[userId]) {
      delete this.users[userId]
      return true
    }

    return false
  }

  // 制限更新（管理者用）
  static updateLimits(userId: string, newLimits: UserLimits): boolean {
    const user = this.users[userId]
    if (!user) return false

    user.limits = newLimits
    return true
  }

  // アクティブ状態切り替え（管理者用）
  static toggleActive(userId: string): boolean {
    const user = this.users[userId]
    if (!user || userId === 'admin') return false

    user.active = !user.active
    return true
  }

  // ユーザーID変更（管理者用）
  static changeUserId(currentId: string, newId: string): boolean {
    const user = this.users[currentId]
    if (!user || currentId === 'admin') return false
    
    // 新しいIDが既に存在する場合は失敗
    if (this.users[newId]) return false
    
    // 新しいIDでユーザーを作成
    this.users[newId] = { ...user, id: newId }
    
    // 古いIDを削除
    delete this.users[currentId]
    
    return true
  }

  // パスワード変更（管理者用）
  static changePassword(userId: string, newPassword: string): boolean {
    const user = this.users[userId]
    if (!user || !newPassword || newPassword.length < 6) return false
    
    user.password = newPassword
    return true
  }

  // ユーザー名変更（管理者用）
  static changeName(userId: string, newName: string): boolean {
    const user = this.users[userId]
    if (!user || !newName) return false
    
    user.name = newName
    return true
  }
}