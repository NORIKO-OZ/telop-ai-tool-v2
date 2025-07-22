import { NextRequest, NextResponse } from 'next/server'
import { UserManagerRedis as UserManager } from '@/utils/userManagerRedis'

export async function POST(request: NextRequest) {
  try {
    const { userId, durationMinutes } = await request.json()
    
    console.log('Duration check:', { userId, durationMinutes })
    
    if (!userId || durationMinutes === undefined) {
      return NextResponse.json({
        success: false,
        error: 'User ID and duration are required'
      }, { status: 400 })
    }
    
    const result = await UserManager.checkDuration(userId, durationMinutes)
    
    return NextResponse.json({
      success: true,
      canUpload: result.canUpload,
      reason: result.reason
    })
    
  } catch (error) {
    console.error('Duration check API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}