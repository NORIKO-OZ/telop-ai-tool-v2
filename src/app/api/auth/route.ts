import { NextRequest, NextResponse } from 'next/server'
import { UserManagerRedis as UserManager } from '@/utils/userManagerRedis'

export async function POST(request: NextRequest) {
  console.log('=== Auth API Called ===')
  
  try {
    const { action, userId, password } = await request.json()
    
    console.log('Auth API called:', { action, userId })
    console.log('Environment check:')
    console.log('- UPSTASH_REDIS_REST_URL exists:', !!process.env.UPSTASH_REDIS_REST_URL)
    console.log('- UPSTASH_REDIS_REST_TOKEN exists:', !!process.env.UPSTASH_REDIS_REST_TOKEN)
    console.log('- KV_REST_API_URL exists:', !!process.env.KV_REST_API_URL)
    console.log('- KV_REST_API_TOKEN exists:', !!process.env.KV_REST_API_TOKEN)
    
    switch (action) {
      case 'authenticate':
        const user = await UserManager.authenticate(userId, password)
        return NextResponse.json({
          success: !!user,
          user: user ? {
            id: user.id,
            name: user.name,
            role: user.role,
            active: user.active,
            limits: user.limits,
            usage: user.usage
          } : null
        })
        
      case 'getUser':
        const userData = await UserManager.getUser(userId)
        return NextResponse.json({
          success: !!userData,
          user: userData ? {
            id: userData.id,
            name: userData.name,
            role: userData.role,
            active: userData.active,
            limits: userData.limits,
            usage: userData.usage
          } : null
        })
        
      case 'isAdmin':
        const isAdmin = await UserManager.isAdmin(userId)
        return NextResponse.json({
          success: true,
          isAdmin
        })
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Auth API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}