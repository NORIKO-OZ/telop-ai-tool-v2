import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { Dictionary } from '@/types/dictionary'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN!,
})

export async function POST(request: NextRequest) {
  try {
    const { action, userId, dictionaries, activeDictionaryIds, termId } = await request.json()
    
    console.log('Dictionaries API:', { action, userId })
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }
    
    const userDictKey = `user_dictionaries:${userId}`
    const userActiveDictKey = `user_active_dictionaries:${userId}`
    
    switch (action) {
      case 'get':
        const storedDictionaries = await redis.get(userDictKey)
        return NextResponse.json({
          success: true,
          dictionaries: storedDictionaries || []
        })
        
      case 'getActive':
        const storedActiveDictionaries = await redis.get(userActiveDictKey)
        return NextResponse.json({
          success: true,
          activeDictionaryIds: storedActiveDictionaries || []
        })
        
      case 'save':
        await redis.set(userDictKey, dictionaries)
        await redis.set(userActiveDictKey, activeDictionaryIds)
        
        return NextResponse.json({
          success: true
        })
        
      case 'incrementUsage':
        if (!termId) {
          return NextResponse.json({
            success: false,
            error: 'Term ID is required'
          }, { status: 400 })
        }
        
        const userDictionaries: Dictionary[] = await redis.get(userDictKey) || []
        let updated = false
        
        userDictionaries.forEach(dict => {
          dict.terms.forEach(term => {
            if (term.id === termId) {
              term.usage++
              updated = true
            }
          })
        })
        
        if (updated) {
          await redis.set(userDictKey, userDictionaries)
        }
        
        return NextResponse.json({
          success: updated
        })
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Dictionaries API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}