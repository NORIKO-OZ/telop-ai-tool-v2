import { NextResponse } from 'next/server'
import { UserManagerRedis as UserManager } from '@/utils/userManagerRedis'

export async function GET() {
  try {
    console.log('Test connection API called')
    
    // Redis接続テスト
    const testUser = await UserManager.getUser('admin')
    
    return NextResponse.json({
      success: true,
      message: 'Connection test successful',
      redisConnected: !!testUser,
      userFound: testUser ? {
        id: testUser.id,
        name: testUser.name,
        active: testUser.active
      } : null,
      timestamp: new Date().toISOString(),
      environment: {
        hasRedisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        hasRedisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
        hasKvUrl: !!process.env.KV_REST_API_URL,
        hasKvToken: !!process.env.KV_REST_API_TOKEN
      }
    })
  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}