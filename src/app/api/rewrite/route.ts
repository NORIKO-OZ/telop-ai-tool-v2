import { NextRequest, NextResponse } from 'next/server'
import { UserManager } from '@/utils/userManager'

export async function POST(request: NextRequest) {
  console.log('=== New Rewrite API called ===')
  
  try {
    const hasApiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '' && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'
    console.log('Has valid API key:', hasApiKey)
    
    const { text, segments, summaryLevel = 2, userId, maxCharsPerLine = 20, maxLines = 2 } = await request.json()
    
    console.log('Text received:', text ? text.substring(0, 50) + '...' : 'No text')
    console.log('Segments received:', segments ? segments.length : 0)
    console.log('Summary level:', summaryLevel)
    console.log('User ID:', userId)
    console.log('Max chars per line:', maxCharsPerLine)
    console.log('Max lines:', maxLines)
    
    if (!text) {
      console.log('No text provided')
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // ユーザー認証と使用量チェック
    if (userId) {
      const user = UserManager.getUser(userId)
      
      if (!user || !user.active) {
        console.log('User not found or inactive:', userId)
        return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
      }
      
      // 使用量制限チェック
      const usageCheck = UserManager.checkUsageLimit(userId)
      if (!usageCheck.canUse) {
        console.log('Usage limit exceeded for user:', userId, usageCheck.reason)
        return NextResponse.json({ error: usageCheck.reason }, { status: 429 })
      }
    }

    if (!hasApiKey) {
      // デモモード
      console.log('Running in demo mode (no valid API key)')
      
      // 遅延追加
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // デモリライト処理 - 要点抽出版
      let cleanText = text
        .replace(/えー|あの|まあ|そのー|うーん|ですね|んですけど|というのは|ですよね/g, '') // 口癖・冗長表現除去
        .replace(/\s+/g, ' ') // 余分な空白除去
        .trim()

      // 要点抽出（デモモード）
      const sentences = cleanText.split(/[。！？]/).filter((s: string) => s.trim().length > 0)
      
      // 要約レベルに応じた処理
      let summaryRatio: number
      
      switch (summaryLevel) {
        case 0: // 原文ベース(90%)
          summaryRatio = 0.9
          break
        case 1: // 詳細(80%)
          summaryRatio = 0.8
          break
        case 2: // 標準(50%)
          summaryRatio = 0.5
          break
        case 3: // 簡潔(30%)
          summaryRatio = 0.3
          break
        default:
          summaryRatio = 0.5
      }
      
      const keyPoints = sentences
        .filter((sentence: string) => sentence.length > 5) // 短すぎる文は除外
        .map((sentence: string) => sentence.trim())
        .slice(0, Math.ceil(sentences.length * summaryRatio))
        .map((sentence: string) => sentence.substring(0, maxCharsPerLine))
        .map((sentence: string) => sentence.replace(/[、。]+$/, '')) // 末尾の句読点を除去

      // タイムスタンプ付きテキストを生成（デモモード）
      if (segments && segments.length > 0 && keyPoints.length > 0) {
        const formatTime = (seconds: number) => {
          const minutes = Math.floor(seconds / 60)
          const secs = (seconds % 60).toFixed(1)
          return `${minutes}:${secs.padStart(4, '0')}`
        }

        const segmentPerPoint = Math.ceil(segments.length / keyPoints.length)
        
        cleanText = keyPoints.map((point: string, index: number) => {
          const segmentIndex = index * segmentPerPoint
          if (segmentIndex < segments.length) {
            const segment = segments[segmentIndex]
            return `[${formatTime(segment.start)}] ${point}`
          }
          return point
        }).slice(0, maxLines).join('\n')
      } else {
        cleanText = keyPoints.slice(0, maxLines).join('\n')
      }

      console.log('Returning demo result:', cleanText.substring(0, 50) + '...')
      
      // 使用量を記録
      if (userId) {
        UserManager.recordUsage(userId)
      }
      
      return NextResponse.json({ 
        rewrittenText: cleanText,
        demo: true
      })
    }

    // 実際のGPT-4を使用
    console.log('Using real OpenAI GPT-4 API')
    
    const { OpenAI } = await import('openai')
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    // 要約レベルに応じたプロンプト設定
    const getSummaryConfig = (level: number) => {
      switch (level) {
        case 0: // 原文ベース
          return {
            ratio: '90-100%',
            description: '原文をほぼそのまま（口癖・間投詞のみ削除）'
          }
        case 1: // 詳細(80%)
          return {
            ratio: '70-80%',
            description: '重要な内容を詳しく残す'
          }
        case 2: // 標準(50%)
          return {
            ratio: '40-60%',
            description: '要点を適度に要約'
          }
        case 3: // 簡潔(30%)
          return {
            ratio: '20-40%',
            description: '最重要な核心のみ抽出'
          }
        default:
          return {
            ratio: '40-60%',
            description: '要点を適度に要約'
          }
      }
    }

    const config = getSummaryConfig(summaryLevel)

    const systemPrompt = segments && segments.length > 0 ? 
      `あなたは動画のテロップ作成の専門家です。元の音声の要点を抽出し、テロップ用の短文に変換してください。

要約レベル: ${summaryLevel} (${config.description})
文字数制限: 1行最大${maxCharsPerLine}文字
行数制限: 同時表示最大${maxLines}行

以下のルールに従ってください：
${summaryLevel === 0 ? 
  `- 原文の内容をほぼそのまま残す（90-100%）
- 「えー」「あの」「まあ」「そのー」「うーん」「ですね」「んですけど」などの口癖・間投詞は完全削除
- 重複する表現や無意味な繰り返しのみ削除
- 話し言葉の自然な流れを保持
- 内容の省略は最小限に留める` :
  `- 元の文章の${config.ratio}程度の長さに要約
- 重要な内容のみを抽出（全文ではなく要点のみ）
- 「えー」「あの」「まあ」「そのー」などの口癖・間投詞は完全削除
- 冗長な表現や繰り返しを削除し、核心のみ残す
- 意味のある重要な部分のみ選択
- 読みやすく印象的なキーワードを重視`}
- 1行は必ず${maxCharsPerLine}文字以内に収める
- 同時に表示するのは最大${maxLines}行まで
- 各行の先頭にタイムスタンプを [MM:SS.S] 形式で付与
- テロップの末尾の「、」「。」は除去（テロップらしく簡潔に）

出力形式：
${summaryLevel === 0 ? '原文の内容をほぼそのまま残し、' : '重要な部分のみを選択し、'}行頭にタイムスタンプを付けて出力してください。
各テロップブロックは最大${maxLines}行で、各行は${maxCharsPerLine}文字以内にしてください。
例: [1:23.4] 動画編集は大変
例: [1:28.1] テロップ作成に時間がかかる` :
      `あなたは動画のテロップ作成の専門家です。話し言葉を読みやすいテロップ用の短文に変換してください。

要約レベル: ${summaryLevel} (${config.description})
文字数制限: 1行最大${maxCharsPerLine}文字
行数制限: 同時表示最大${maxLines}行

以下のルールに従ってください：
${summaryLevel === 0 ? 
  `- 原文の内容をほぼそのまま残す（90-100%）
- 「えー」「あの」「まあ」「そのー」「うーん」「ですね」「んですけど」などの口癖・間投詞は完全削除
- 重複する表現や無意味な繰り返しのみ削除
- 話し言葉の自然な流れを保持
- 内容の省略は最小限に留める` :
  `- 元の文章の${config.ratio}程度の長さに要約
- 「えー」「あの」「まあ」などの口癖・間投詞は削除
- 冗長な表現を簡潔に
- 意味のまとまりで区切る
- 読みやすいリズムを重視
- 話し言葉の自然さを保持`}
- 1行は必ず${maxCharsPerLine}文字以内に収める
- 同時に表示するのは最大${maxLines}行まで
- テロップの末尾の「、」「。」は除去（テロップらしく簡潔に）

出力形式：
各行を改行で区切って出力してください。各行は${maxCharsPerLine}文字以内にしてください。`

    const userContent = segments && segments.length > 0 ? 
      `元のテキスト: ${text}

タイムスタンプ情報:
${segments.map((seg: { start: number; text: string }, i: number) => `${i + 1}. [${Math.floor(seg.start / 60)}:${(seg.start % 60).toFixed(1).padStart(4, '0')}] ${seg.text}`).join('\n')}` : 
      text

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userContent
        }
      ],
      temperature: 0.7,
    })

    let rewrittenText = completion.choices[0]?.message?.content || text
    
    console.log('GPT-4 API response:', rewrittenText.substring(0, 100) + '...')
    
    // GPT-4がタイムスタンプを付けなかった場合の処理
    if (segments && segments.length > 0 && !rewrittenText.includes('[')) {
      console.log('GPT-4 did not add timestamps, adding manually')
      const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60)
        const secs = (seconds % 60).toFixed(1)
        return `${minutes}:${secs.padStart(4, '0')}`
      }

      const lines = rewrittenText.split('\n').filter((line: string) => line.trim())
      
      // セグメントと行を対応付け（重要な部分のタイミングを推定）
      const segmentPerLine = Math.max(1, Math.floor(segments.length / lines.length))
      
      rewrittenText = lines.map((line: string, index: number) => {
        const segmentIndex = Math.min(index * segmentPerLine, segments.length - 1)
        const segment = segments[segmentIndex]
        // 末尾の句読点を除去
        const cleanLine = line.replace(/[、。]+$/, '')
        return `[${formatTime(segment.start)}] ${cleanLine}`
      }).join('\n')
    }
    
    // GPT-4が生成したテキストからも句読点を除去
    if (!rewrittenText.includes('[')) {
      // タイムスタンプがない場合
      rewrittenText = rewrittenText.split('\n')
        .map((line: string) => line.trim().replace(/[、。]+$/, ''))
        .filter((line: string) => line.length > 0)
        .join('\n')
    } else {
      // タイムスタンプがある場合
      rewrittenText = rewrittenText.split('\n')
        .map((line: string) => {
          const timestampMatch = line.match(/^(\[[\d:\.]+\])\s*(.*)/)
          if (timestampMatch) {
            const timestamp = timestampMatch[1]
            const text = timestampMatch[2].replace(/[、。]+$/, '')
            return `${timestamp} ${text}`
          }
          return line.trim().replace(/[、。]+$/, '')
        })
        .filter((line: string) => line.length > 0)
        .join('\n')
    }
    
    // 使用量を記録
    if (userId) {
      UserManager.recordUsage(userId)
    }
    
    return NextResponse.json({ 
      rewrittenText 
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('Rewrite error:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Rewrite failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}