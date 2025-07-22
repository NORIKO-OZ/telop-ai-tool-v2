import { NextRequest, NextResponse } from 'next/server'
import { UserManagerRedis as UserManager } from '@/utils/userManagerRedis'

export async function POST(request: NextRequest) {
  try {
    const { userId, password } = await request.json()
    
    console.log('=== Auth Test Start ===')
    console.log('Input userId:', userId)
    console.log('Input password:', password)
    
    // ユーザー取得テスト
    const user = await UserManager.getUser(userId)
    console.log('User found:', user ? `${user.name} (active: ${user.active})` : 'null')
    console.log('User password matches:', user?.password === password)
    
    // 認証テスト
    const authResult = await UserManager.authenticate(userId, password)
    console.log('Auth result:', authResult ? `${authResult.name}` : 'null')
    
    return NextResponse.json({
      success: true,
      input: { userId, password },
      user_found: !!user,
      user_active: user?.active || false,
      password_match: user?.password === password,
      auth_success: !!authResult,
      user_data: user ? {
        id: user.id,
        name: user.name,
        role: user.role,
        active: user.active,
        stored_password: user.password
      } : null
    })
    
  } catch (error) {
    console.error('Auth test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}