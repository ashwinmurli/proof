'use client'

import { useState, useCallback, useRef } from 'react'
import { Project, ProjectMode } from '@/types'

interface StreamOptions {
  project: Project
  mode: ProjectMode
  module: string
  prompt: string
  maxTokens?: number
  onComplete?: (text: string) => void
}

// Buffers streaming text and reveals complete sentences with fade
export function useStreamSentences() {
  const [sentences, setSentences] = useState<string[]>([])
  const [streaming, setStreaming] = useState(false)
  const bufferRef = useRef('')
  const abortRef = useRef<AbortController | null>(null)

  const stream = useCallback(async (options: StreamOptions) => {
    const { project, mode, module, prompt, maxTokens = 300, onComplete } = options

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setStreaming(true)
    setSentences([])
    bufferRef.current = ''

    const apiKey = typeof window !== 'undefined'
      ? localStorage.getItem('proof-api-key') || ''
      : ''

    let fullText = ''

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

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const dec = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = dec.decode(value, { stream: true })
        fullText += chunk
        bufferRef.current += chunk

        // Reveal complete sentences
        const sentenceEnd = /[.!?]\s/g
        let lastIndex = 0
        let match

        while ((match = sentenceEnd.exec(bufferRef.current)) !== null) {
          const sentence = bufferRef.current.slice(lastIndex, match.index + 1).trim()
          if (sentence) {
            setSentences(prev => {
              if (prev[prev.length - 1] === sentence) return prev
              return [...prev, sentence]
            })
          }
          lastIndex = match.index + match[0].length
        }

        // Keep remainder in buffer
        if (lastIndex > 0) {
          bufferRef.current = bufferRef.current.slice(lastIndex)
        }
      }

      // Flush any remaining buffer
      if (bufferRef.current.trim()) {
        setSentences(prev => [...prev, bufferRef.current.trim()])
        bufferRef.current = ''
      }

      onComplete?.(fullText)
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setSentences(['proof. couldn\'t connect. Check your API key in Settings.'])
      }
    } finally {
      setStreaming(false)
    }

    return fullText
  }, [])

  const reset = useCallback(() => {
    setSentences([])
    bufferRef.current = ''
  }, [])

  // Full text as string
  const text = sentences.join(' ')

  return { stream, streaming, sentences, text, reset }
}
