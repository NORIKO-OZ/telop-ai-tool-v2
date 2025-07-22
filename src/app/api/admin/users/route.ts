import { NextRequest, NextResponse } from 'next/server'
import { UserManagerRedis as UserManager } from '@/utils/userManagerRedis'

export async function GET() {
  try {
    console.log('Admin users API: GET request')
    
    // 全ユーザー取得
    const users = await UserManager.getAllUsers()
    console.log('Admin users API: Found users:', users.length)
    
    // 統計計算
    const totalUsers = users.length
    const activeUsers = users.filter(u => u.active).length
    const totalRequests = users.reduce((sum, user) => sum + user.usage.totalRequests, 0)
    const totalDailyRequests = users.reduce((sum, user) => sum + user.usage.dailyRequests, 0)
    const totalMonthlyRequests = users.reduce((sum, user) => sum + user.usage.monthlyRequests, 0)
    const estimatedCost = totalRequests * 0.078
    
    const stats = {
      totalUsers,
      activeUsers,
      totalRequests,
      totalDailyRequests,
      totalMonthlyRequests,
      estimatedCost,
      costBreakdown: {
        whisperCost: totalRequests * 0.018,
        gptCost: totalRequests * 0.06,
        totalCost: estimatedCost
      }
    }
    
    return NextResponse.json({
      success: true,
      users,
      stats
    })
    
  } catch (error) {
    console.error('Admin users API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, user } = await request.json()
    console.log('Admin users API: POST request', { action })
    
    if (action === 'create') {
      const success = await UserManager.createUser({
        id: user.id,
        password: user.password,
        name: user.name,
        role: user.role,
        limits: user.limits,
        active: user.active
      })
      
      return NextResponse.json({
        success
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })
    
  } catch (error) {
    console.error('Admin users API POST error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()
    console.log('Admin users API: DELETE request', { userId })
    
    const success = await UserManager.deleteUser(userId)
    
    return NextResponse.json({
      success
    })
    
  } catch (error) {
    console.error('Admin users API DELETE error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { action, userId, updates } = await request.json()
    console.log('Admin users API: PATCH request', { action, userId })
    
    if (action === 'toggleActive') {
      const success = await UserManager.toggleActive(userId)
      return NextResponse.json({ success })
    }
    
    if (action === 'update') {
      let success = true
      const errors: string[] = []
      
      try {
        // 各更新を順番に実行
        if (updates.password && updates.password.length >= 6) {
          const passwordSuccess = await UserManager.changePassword(userId, updates.password)
          if (!passwordSuccess) {
            errors.push('パスワードの変更に失敗しました')
            success = false
          }
        }
        
        if (updates.name) {
          const nameSuccess = await UserManager.changeName(userId, updates.name)
          if (!nameSuccess) {
            errors.push('名前の変更に失敗しました')
            success = false
          }
        }
        
        if (updates.limits) {
          const limitsSuccess = await UserManager.updateLimits(userId, updates.limits)
          if (!limitsSuccess) {
            errors.push('制限の更新に失敗しました')
            success = false
          }
        }
        
        return NextResponse.json({
          success,
          error: errors.length > 0 ? errors.join('、') : null
        })
        
      } catch (updateError) {
        console.error('Update error:', updateError)
        return NextResponse.json({
          success: false,
          error: 'ユーザー情報の更新中にエラーが発生しました'
        })
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })
    
  } catch (error) {
    console.error('Admin users API PATCH error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}