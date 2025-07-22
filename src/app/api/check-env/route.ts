import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const envVars = {
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? 'SET (hidden)' : 'NOT SET',
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? 'SET (hidden)' : 'NOT SET',
      KV_REST_API_URL: process.env.KV_REST_API_URL ? 'SET (hidden)' : 'NOT SET',
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? 'SET (hidden)' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV
    }
    
    console.log('Environment variables check:', envVars)
    
    return NextResponse.json({
      success: true,
      environment: envVars,
      url_length: process.env.UPSTASH_REDIS_REST_URL?.length || 0,
      token_length: process.env.UPSTASH_REDIS_REST_TOKEN?.length || 0
    })
    
  } catch (error) {
    console.error('Environment check error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}