import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { buildSystemPrompt } from '@/lib/prompts'
import { Project, ProjectMode } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { project, mode, module, prompt, maxTokens = 300 }: {
      project: Project
      mode: ProjectMode
      module: string
      prompt: string
      maxTokens?: number
    } = body

    if (!prompt) {
      return new Response('Missing prompt', { status: 400 })
    }

    const clientKey = req.headers.get('x-proof-key')
    const apiKey = clientKey || process.env.ANTHROPIC_API_KEY || ''

    if (!apiKey) {
      return new Response('No API key configured. Add your Anthropic API key in Settings.', { status: 401 })
    }

    const anthropic = new Anthropic({ apiKey })
    const systemPrompt = buildSystemPrompt(project, mode, module)

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('proof. API error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
