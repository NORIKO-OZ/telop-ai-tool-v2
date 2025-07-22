import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { UserManagerRedis as UserManager } from '@/utils/userManagerRedis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN!,
})

export async function GET() {
  try {
    console.log('=== Redis Debug Start ===')
    
    // Redis接続テスト
    console.log('Testing Redis connection...')
    await redis.set('test-key', 'test-value')
    const testValue = await redis.get('test-key')
    console.log('Redis connection test:', testValue === 'test-value' ? 'SUCCESS' : 'FAILED')
    
    // 初期化状態確認
    console.log('Checking initialization status...')
    const initialized = await redis.get('users_initialized')
    console.log('Users initialized:', initialized)
    
    // 全キー確認
    console.log('Checking all Redis keys...')
    const allKeys = await redis.keys('*')
    console.log('All Redis keys:', allKeys)
    
    // 強制初期化
    console.log('Force initializing users...')
    await UserManager.initialize()
    
    // ユーザー確認
    console.log('Checking user001...')
    const user001 = await redis.get('user:user001')
    console.log('user001 data:', user001)
    
    // 認証テスト
    console.log('Testing authentication...')
    const authResult = await UserManager.authenticate('user001', 'telop2024')
    console.log('Auth result:', authResult ? `${authResult.name} (${authResult.active})` : 'null')
    
    // 全ユーザー取得
    console.log('Getting all users...')
    const allUsers = await UserManager.getAllUsers()
    console.log('All users:', allUsers.map(u => ({ id: u.id, name: u.name, active: u.active })))
    
    return NextResponse.json({
      success: true,
      redis_connection: testValue === 'test-value',
      initialized: initialized,
      all_keys: allKeys,
      user001_exists: !!user001,
      user001_data: user001,
      auth_test: !!authResult,
      all_users: allUsers.map(u => ({ id: u.id, name: u.name, active: u.active }))
    })
    
  } catch (error) {
    console.error('Redis debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 })
  }
}