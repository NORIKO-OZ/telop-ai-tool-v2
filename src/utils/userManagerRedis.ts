import { Redis } from '@upstash/redis'

// Redis初期化（環境変数を明示的に指定）
let redis: Redis | null = null

try {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  
  if (redisUrl && redisToken) {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    })
    console.log('✅ Redis initialized successfully')
  } else {
    console.log('❌ Redis credentials missing, falling back to in-memory storage')
    console.log('- UPSTASH_REDIS_REST_URL:', !!process.env.UPSTASH_REDIS_REST_URL)
    console.log('- KV_REST_API_URL:', !!process.env.KV_REST_API_URL)
    console.log('- UPSTASH_REDIS_REST_TOKEN:', !!process.env.UPSTASH_REDIS_REST_TOKEN)
    console.log('- KV_REST_API_TOKEN:', !!process.env.KV_REST_API_TOKEN)
  }
} catch (error) {
  console.error('Redis initialization error:', error)
}

// インメモリーフォールバック
let inMemoryUsers: Record<string, User> = {}

export interface UserLimits {
  dailyRequests: number
  monthlyRequests: number
  monthlyCredits: number
  maxFileSize: number
  maxDurationMinutes: number
}

export interface UserUsage {
  totalRequests: number
  dailyRequests: number
  monthlyRequests: number
  monthlyCreditsUsed: number
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

// デフォルトユーザーデータ
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
      maxFileSize: 999999, // 管理者は実質無制限
      maxDurationMinutes: 30
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
      monthlyCredits: 300,
      maxFileSize: 999999, // ファイルサイズ制限なし
      maxDurationMinutes: 30
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
      monthlyCredits: 150,
      maxFileSize: 999999, // ファイルサイズ制限なし
      maxDurationMinutes: 30
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
      monthlyCredits: 600,
      maxFileSize: 999999, // ファイルサイズ制限なし
      maxDurationMinutes: 30
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

export class UserManagerRedis {
  private static readonly USER_PREFIX = 'user:'
  private static readonly INITIALIZED_KEY = 'users_initialized'

  // 初期化（デフォルトユーザーをRedisまたはメモリに保存）
  static async initialize(): Promise<void> {
    try {
      if (redis) {
        // Redis使用
        const initialized = await redis.get(this.INITIALIZED_KEY)
        if (!initialized) {
          console.log('Initializing default users in Redis...')
          
          // デフォルトユーザーをRedisに保存
          for (const [userId, userData] of Object.entries(defaultUsers)) {
            await redis.set(`${this.USER_PREFIX}${userId}`, userData)
          }
          
          await redis.set(this.INITIALIZED_KEY, true)
          console.log('Default users initialized in Redis')
        }
      } else {
        // メモリーフォールバック
        if (Object.keys(inMemoryUsers).length === 0) {
          console.log('Initializing default users in memory...')
          inMemoryUsers = { ...defaultUsers }
          console.log('Default users initialized in memory')
        }
      }
    } catch (error) {
      console.error('Failed to initialize users:', error)
      // Redis失敗時はメモリーにフォールバック
      if (Object.keys(inMemoryUsers).length === 0) {
        console.log('Falling back to memory storage...')
        inMemoryUsers = { ...defaultUsers }
      }
    }
  }

  // ユーザー認証
  static async authenticate(userId: string, password: string): Promise<User | null> {
    try {
      await this.initialize()
      
      let user: User | null = null
      
      if (redis) {
        user = await redis.get<User>(`${this.USER_PREFIX}${userId}`)
      } else {
        user = inMemoryUsers[userId] || null
      }
      
      if (!user || !user.active || user.password !== password) {
        return null
      }
      return user
    } catch (error) {
      console.error('Authentication error:', error)
      // フォールバック
      await this.initialize()
      const user = inMemoryUsers[userId]
      if (user && user.active && user.password === password) {
        return user
      }
      return null
    }
  }

  // ユーザー情報取得
  static async getUser(userId: string): Promise<User | null> {
    try {
      await this.initialize()
      
      if (redis) {
        const user = await redis.get<User>(`${this.USER_PREFIX}${userId}`)
        return user || null
      } else {
        return inMemoryUsers[userId] || null
      }
    } catch (error) {
      console.error('Get user error:', error)
      // フォールバック
      await this.initialize()
      return inMemoryUsers[userId] || null
    }
  }

  // ユーザー情報更新
  static async updateUser(userId: string, userData: User): Promise<boolean> {
    try {
      if (redis) {
        await redis.set(`${this.USER_PREFIX}${userId}`, userData)
      } else {
        inMemoryUsers[userId] = userData
      }
      return true
    } catch (error) {
      console.error('Update user error:', error)
      // フォールバック
      inMemoryUsers[userId] = userData
      return true
    }
  }

  // 全ユーザー取得（管理者用）
  static async getAllUsers(): Promise<User[]> {
    try {
      await this.initialize()
      
      if (redis) {
        const keys = await redis.keys(`${this.USER_PREFIX}*`)
        const users: User[] = []
        
        for (const key of keys) {
          const user = await redis.get<User>(key)
          if (user) {
            users.push(user)
          }
        }
        
        return users
      } else {
        return Object.values(inMemoryUsers)
      }
    } catch (error) {
      console.error('Get all users error:', error)
      return Object.values(inMemoryUsers)
    }
  }

  // 使用量チェック
  static async checkUsageLimit(userId: string): Promise<{ canUse: boolean; reason?: string }> {
    try {
      const user = await this.getUser(userId)
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

      // 月次クレジット制限チェック
      if (user.usage.monthlyCreditsUsed >= user.limits.monthlyCredits) {
        return { 
          canUse: false, 
          reason: `月次クレジット制限に達しました（${user.limits.monthlyCredits}クレジット/月）` 
        }
      }

      // 更新されたユーザーデータを保存
      await this.updateUser(userId, user)

      return { canUse: true }
    } catch (error) {
      console.error('Check usage limit error:', error)
      return { canUse: false, reason: 'システムエラーが発生しました' }
    }
  }

  // 使用量記録
  static async recordUsage(userId: string): Promise<boolean> {
    try {
      const user = await this.getUser(userId)
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

      console.log(`Usage recorded for ${userId}:`, user.usage)
      
      return await this.updateUser(userId, user)
    } catch (error) {
      console.error('Record usage error:', error)
      return false
    }
  }

  // クレジット使用可能チェック
  static async checkCreditAvailability(userId: string, requiredCredits: number): Promise<{ canUse: boolean; reason?: string }> {
    try {
      const user = await this.getUser(userId)
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
    } catch (error) {
      console.error('Check credit availability error:', error)
      return { canUse: false, reason: 'システムエラーが発生しました' }
    }
  }

  // クレジット消費
  static async consumeCredits(userId: string, audioLengthMinutes: number): Promise<boolean> {
    try {
      const user = await this.getUser(userId)
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
      
      return await this.updateUser(userId, user)
    } catch (error) {
      console.error('Consume credits error:', error)
      return false
    }
  }

  // 音声時間からクレジット計算
  static calculateCreditsFromDuration(durationSeconds: number): number {
    const minutes = durationSeconds / 60
    return Math.ceil(minutes)
  }

  // 時間制限チェック
  static async checkDuration(userId: string, durationMinutes: number): Promise<{ canUpload: boolean; reason?: string }> {
    try {
      const user = await this.getUser(userId)
      if (!user) {
        return { canUpload: false, reason: 'ユーザーが見つかりません' }
      }

      if (durationMinutes > user.limits.maxDurationMinutes) {
        return { 
          canUpload: false, 
          reason: `ファイルの時間が制限を超えています（最大${user.limits.maxDurationMinutes}分）` 
        }
      }

      return { canUpload: true }
    } catch (error) {
      console.error('Duration check error:', error)
      return { canUpload: false, reason: 'チェックエラーが発生しました' }
    }
  }

  // ファイルサイズチェック
  static async checkFileSize(userId: string, fileSizeMB: number): Promise<{ canUpload: boolean; reason?: string }> {
    try {
      const user = await this.getUser(userId)
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
    } catch (error) {
      console.error('Check file size error:', error)
      return { canUpload: false, reason: 'システムエラーが発生しました' }
    }
  }

  // 使用量統計取得
  static async getUsageStats(userId: string): Promise<UserUsage | null> {
    try {
      const user = await this.getUser(userId)
      return user ? user.usage : null
    } catch (error) {
      console.error('Get usage stats error:', error)
      return null
    }
  }

  // 全体の使用量統計を取得
  static async getOverallUsageStats(): Promise<{
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
  }> {
    try {
      const allUsers = await this.getAllUsers()
      const activeUsers = allUsers.filter(user => user.active)
      
      const totalRequests = allUsers.reduce((sum, user) => sum + user.usage.totalRequests, 0)
      const totalDailyRequests = allUsers.reduce((sum, user) => sum + user.usage.dailyRequests, 0)
      const totalMonthlyRequests = allUsers.reduce((sum, user) => sum + user.usage.monthlyRequests, 0)
      
      // OpenAI API コスト計算
      const whisperCostPerRequest = 0.006 * 3 // $0.018
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
    } catch (error) {
      console.error('Get overall usage stats error:', error)
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalRequests: 0,
        totalDailyRequests: 0,
        totalMonthlyRequests: 0,
        estimatedCost: 0,
        costBreakdown: {
          whisperCost: 0,
          gptCost: 0,
          totalCost: 0
        }
      }
    }
  }

  // 制限情報取得
  static async getLimits(userId: string): Promise<UserLimits | null> {
    try {
      const user = await this.getUser(userId)
      return user ? user.limits : null
    } catch (error) {
      console.error('Get limits error:', error)
      return null
    }
  }

  // 管理者権限チェック
  static async isAdmin(userId: string): Promise<boolean> {
    try {
      const user = await this.getUser(userId)
      return user?.role === 'admin'
    } catch (error) {
      console.error('Is admin check error:', error)
      return false
    }
  }

  // ユーザー作成（管理者用）
  static async createUser(newUser: Omit<User, 'usage' | 'createdAt'>): Promise<boolean> {
    try {
      const existingUser = await this.getUser(newUser.id)
      if (existingUser) {
        return false // 既に存在
      }

      const user: User = {
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

      return await this.updateUser(newUser.id, user)
    } catch (error) {
      console.error('Create user error:', error)
      return false
    }
  }

  // ユーザー削除（管理者用）
  static async deleteUser(userId: string): Promise<boolean> {
    try {
      if (userId === 'admin') {
        return false // 管理者は削除不可
      }

      const user = await this.getUser(userId)
      if (user) {
        if (redis) {
          await redis.del(`${this.USER_PREFIX}${userId}`)
        } else {
          delete inMemoryUsers[userId]
        }
        return true
      }

      return false
    } catch (error) {
      console.error('Delete user error:', error)
      return false
    }
  }

  // 制限更新（管理者用）
  static async updateLimits(userId: string, newLimits: UserLimits): Promise<boolean> {
    try {
      const user = await this.getUser(userId)
      if (!user) return false

      user.limits = newLimits
      return await this.updateUser(userId, user)
    } catch (error) {
      console.error('Update limits error:', error)
      return false
    }
  }

  // アクティブ状態切り替え（管理者用）
  static async toggleActive(userId: string): Promise<boolean> {
    try {
      const user = await this.getUser(userId)
      if (!user || userId === 'admin') return false

      user.active = !user.active
      return await this.updateUser(userId, user)
    } catch (error) {
      console.error('Toggle active error:', error)
      return false
    }
  }

  // ユーザーID変更（管理者用）
  static async changeUserId(currentId: string, newId: string): Promise<boolean> {
    try {
      const user = await this.getUser(currentId)
      if (!user || currentId === 'admin') return false
      
      // 新しいIDが既に存在する場合は失敗
      const existingUser = await this.getUser(newId)
      if (existingUser) return false
      
      // 新しいIDでユーザーを作成
      const updatedUser = { ...user, id: newId }
      await this.updateUser(newId, updatedUser)
      
      // 古いIDを削除
      if (redis) {
        await redis.del(`${this.USER_PREFIX}${currentId}`)
      } else {
        delete inMemoryUsers[currentId]
      }
      
      return true
    } catch (error) {
      console.error('Change user ID error:', error)
      return false
    }
  }

  // パスワード変更（管理者用）
  static async changePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const user = await this.getUser(userId)
      if (!user || !newPassword || newPassword.length < 6) return false
      
      user.password = newPassword
      return await this.updateUser(userId, user)
    } catch (error) {
      console.error('Change password error:', error)
      return false
    }
  }

  // ユーザー名変更（管理者用）
  static async changeName(userId: string, newName: string): Promise<boolean> {
    try {
      const user = await this.getUser(userId)
      if (!user || !newName) return false
      
      user.name = newName
      return await this.updateUser(userId, user)
    } catch (error) {
      console.error('Change name error:', error)
      return false
    }
  }
}