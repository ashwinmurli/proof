'use client'

import { useState, useCallback, useRef } from 'react'
import { Project, ProjectMode } from '@/types'

interface StreamOptions {
  project: Project
  mode: ProjectMode
  module: string
  prompt: string
  maxTokens?: number
  onChunk?: (text: string) => void
  onComplete?: (fullText: string) => void
}

export function useProofStream() {
  const [streaming, setStreaming] = useState(false)
  const [text, setText] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const stream = useCallback(async (options: StreamOptions) => {
    const { project, mode, module, prompt, maxTokens, onChunk, onComplete } = options

    if (abortRef.current) {
      abortRef.current.abort()
    }

    abortRef.current = new AbortController()
    setStreaming(true)
    setText('')

    let fullText = ''

    // Get stored API key
    const apiKey = typeof window !== 'undefined'
      ? localStorage.getItem('proof-api-key') || ''
      : ''

    try {
      const res = await fetch('/api/proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-proof-key': apiKey } : {}),
        },
        signal: abortRef.current.signal,
        body: JSON.stringify({ project, mode, module, prompt, maxTokens }),
      })

      if (res.status === 401) {
        const msg = 'No API key found. Add your Anthropic API key in Settings.'
        setText(msg)
        onChunk?.(msg)
        onComplete?.(msg)
        return msg
      }

      if (!res.ok) throw new Error(`API error: ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        setText(fullText)
        onChunk?.(fullText)
      }

      onComplete?.(fullText)
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Stream error:', err)
        const msg = 'proof. couldn\'t connect. Check your API key in Settings.'
        setText(msg)
        onComplete?.(msg)
      }
    } finally {
      setStreaming(false)
    }

    return fullText
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setStreaming(false)
  }, [])

  const reset = useCallback(() => {
    setText('')
  }, [])

  return { stream, streaming, text, abort, reset }
}
