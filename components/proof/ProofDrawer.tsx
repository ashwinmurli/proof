'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Project, ProjectMode, ProofMessage } from '@/types'
import { useProofStream } from '@/lib/useProofStream'
import ProofButton from '@/components/proof/ProofButton'
import { buildSynthesisContext } from '@/lib/synthesisContext'

// Renders text sentence-by-sentence with fade-in
function SentenceText({ text, streaming }: { text: string; streaming: boolean }) {
  const [visibleSentences, setVisibleSentences] = useState<string[]>([])
  const prevTextRef = useRef('')

  useEffect(() => {
    if (!text) return
    if (text === prevTextRef.current) return
    prevTextRef.current = text

    // Split into sentences
    const raw = text.replace(/([.!?])\s+/g, '$1\n').split('\n').map(s => s.trim()).filter(Boolean)

    // If streaming, reveal sentence-by-sentence as they become complete
    if (streaming) {
      // Last item might be incomplete — only show complete ones
      const complete = raw.slice(0, -1)
      const last = raw[raw.length - 1]
      // If last ends with sentence-ending punctuation, it's complete
      const lastComplete = last && /[.!?]$/.test(last)
      const toShow = lastComplete ? raw : complete
      setVisibleSentences(toShow)
    } else {
      // Done streaming — show everything
      setVisibleSentences(raw)
    }
  }, [text, streaming])

  if (!visibleSentences.length && streaming) {
    return (
      <div style={{ display: 'flex', gap: 3, padding: '4px 0' }}>
        {[0,1,2].map(i => (
          <motion.div key={i}
            style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--mango)' }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </div>
    )
  }

  return (
    <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 14, color: 'var(--dark)', lineHeight: 1.85, margin: 0 }}>
      {visibleSentences.map((sentence, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ display: 'inline' }}
        >
          {sentence}{' '}
        </motion.span>
      ))}
      {streaming && visibleSentences.length > 0 && (
        <span style={{ display: 'inline-block', width: 1.5, height: 12, background: 'var(--mango)', marginLeft: 1, verticalAlign: 'middle', animation: 'blink 0.9s step-end infinite' }} />
      )}
    </p>
  )
}

interface ProofDrawerProps {
  project: Project
  mode: ProjectMode
  module: string
  open: boolean
  onClose: () => void
  initialMessage?: string
  thoughts?: Record<string, string>
  questionLabels?: Record<string, string>
  onScrollToQuestion?: (id: string) => void
  answers?: Record<string, string>
  summaryMode?: boolean
  summaryState?: 'thinking' | 'arrived' | null
  summaryText?: string
  onContinue?: () => void
  onReview?: () => void
  summaryThinkingLabel?: string
  summaryContinueLabel?: string
  summaryLabel?: string
}

export default function ProofDrawer({
  project, mode, module, open, onClose,
  initialMessage, thoughts = {}, questionLabels = {},
  onScrollToQuestion, answers = {},
  summaryMode = false, summaryState = null, summaryText = '',
  onContinue, onReview,
  summaryThinkingLabel = 'Reading the brief…',
  summaryContinueLabel = 'Continue →',
  summaryLabel = 'On this',
}: ProofDrawerProps) {
  const [messages, setMessages] = useState<ProofMessage[]>([])
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({})
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [activeTab, setActiveTab] = useState<'notes' | 'ask'>('ask')
  const { stream, streaming } = useProofStream()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initialShown = useRef(false)

  const hasNotes = Object.keys(thoughts).length > 0
  const isSummaryOpen = summaryMode && (summaryState === 'thinking' || summaryState === 'arrived')

  useEffect(() => {
    if (open && initialMessage && !initialShown.current) {
      initialShown.current = true
      setMessages([{ id: crypto.randomUUID(), role: 'proof', content: initialMessage, createdAt: new Date().toISOString() }])
      setActiveTab('ask')
    }
    if (open && !initialMessage && hasNotes) setActiveTab('notes')
    if (open && !summaryMode) setTimeout(() => inputRef.current?.focus(), 120)
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  async function send() {
    const txt = input.trim()
    if (!txt || streaming) return
    setInput('')

    const userMsg: ProofMessage = { id: crypto.randomUUID(), role: 'user', content: txt, createdAt: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])

    const ctx = buildSynthesisContext(project)
    const prompt = ctx ? `${ctx}\n\nUser question: ${txt}` : txt

    const streamId = crypto.randomUUID()
    setActiveStreamId(streamId)
    setStreamingContent(prev => ({ ...prev, [streamId]: '' }))

    await stream({
      project, mode, module, prompt, maxTokens: 420,
      onChunk: (text) => setStreamingContent(prev => ({ ...prev, [streamId]: text })),
      onComplete: (text) => {
        setMessages(prev => [...prev, { id: streamId, role: 'proof', content: text, createdAt: new Date().toISOString() }])
        setStreamingContent(prev => { const next = { ...prev }; delete next[streamId]; return next })
        setActiveStreamId(null)
      },
    })
  }

  const panelWidth = isSummaryOpen ? 520 : 380

  return (
    <AnimatePresence>
      {(open || isSummaryOpen) && (
        <>
          {/* Dim overlay in summary mode */}
          <AnimatePresence>
            {isSummaryOpen && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,22,0.3)', zIndex: 49, backdropFilter: 'blur(1px)' }}
                onClick={summaryState === 'arrived' ? onClose : undefined}
              />
            )}
          </AnimatePresence>

          {!isSummaryOpen && open && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={onClose} />
          )}

          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, width: panelWidth }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', top: 60,
              right: 'max(16px, min(44px, 5vw))',
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: isSummaryOpen ? 560 : 480,
              background: '#FDFCFA',
              border: '1px solid rgba(184,179,172,0.5)',
              borderRadius: 12,
              boxShadow: isSummaryOpen
                ? '0 20px 60px rgba(26,24,22,0.2), 0 1px 4px rgba(26,24,22,0.06)'
                : '0 8px 40px rgba(26,24,22,0.12), 0 1px 4px rgba(26,24,22,0.06)',
              zIndex: 50,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <motion.span
                  style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }}
                  animate={summaryState === 'thinking'
                    ? { scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }
                    : { boxShadow: ['0 0 0 0px rgba(255,161,10,0.4)', '0 0 0 4px rgba(255,161,10,0)', '0 0 0 0px rgba(255,161,10,0.4)'] }
                  }
                  transition={{ duration: summaryState === 'thinking' ? 1 : 2.5, repeat: Infinity }}
                />
                <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)' }}>
                  proof.
                </span>
              </div>
              {(!isSummaryOpen || summaryState === 'arrived') && (
                <button onClick={onClose}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--stone)', fontSize: 18, lineHeight: 1, padding: '0 2px', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--dark)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--stone)')}>
                  ×
                </button>
              )}
            </div>

            {/* Summary mode */}
            {isSummaryOpen && (
              <div style={{ flex: 1, padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {summaryState === 'thinking' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mango)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
                      {summaryThinkingLabel}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0,1,2].map(i => (
                        <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }}
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }} />
                      ))}
                    </div>
                  </motion.div>
                )}

                {summaryState === 'arrived' && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mango)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
                      {summaryLabel}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
                      <SentenceText text={summaryText} streaming={false} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 16, borderTop: '1px solid rgba(184,179,172,0.25)', flexShrink: 0 }}>
                      <button onClick={onContinue}
                        style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: 'var(--dark)', color: '#FDFCFA', border: 'none', borderRadius: 5, padding: '10px 20px', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--mango)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--dark)')}>
                        {summaryContinueLabel}
                      </button>
                      <button onClick={onReview}
                        style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        Review answers first
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Normal mode */}
            {!isSummaryOpen && (
              <>
                {hasNotes && (
                  <div style={{ display: 'flex', padding: '10px 18px 0', borderBottom: '1px solid rgba(184,179,172,0.25)', flexShrink: 0 }}>
                    {(['notes', 'ask'] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)} style={{
                        fontFamily: 'var(--font-sans)', fontSize: 12,
                        fontWeight: activeTab === tab ? 500 : 300,
                        color: activeTab === tab ? 'var(--dark)' : 'var(--stone)',
                        background: 'none', border: 'none',
                        borderBottom: activeTab === tab ? '1.5px solid var(--mango)' : '1.5px solid transparent',
                        padding: '0 0 10px', marginRight: 18, cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        {tab === 'notes' ? `Notes (${Object.keys(thoughts).length})` : 'Ask proof.'}
                      </button>
                    ))}
                  </div>
                )}

                {/* Notes tab */}
                {activeTab === 'notes' && hasNotes && (
                  <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
                    {Object.entries(thoughts).map(([id, thought]) => {
                      const answer = answers[id] || ''
                      const truncated = answer.length > 120 ? answer.slice(0, 120).trimEnd() + '…' : answer
                      return (
                        <div key={id} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(184,179,172,0.2)', cursor: onScrollToQuestion ? 'pointer' : 'default' }}
                          onClick={() => onScrollToQuestion?.(id)}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)' }}>
                              {questionLabels[id] || id}
                            </div>
                            {onScrollToQuestion && <span style={{ fontSize: 10, color: 'var(--aluminum)' }}>scroll to ↗</span>}
                          </div>
                          {truncated && (
                            <p style={{ fontSize: 12, color: 'var(--concrete)', lineHeight: 1.6, marginBottom: 10, fontWeight: 300, fontFamily: 'var(--font-sans)' }}>
                              "{truncated}"
                            </p>
                          )}
                          <div style={{ paddingLeft: 10, borderLeft: '1.5px solid var(--mango)' }}>
                            <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, color: 'var(--dark)', lineHeight: 1.8 }}>
                              {thought}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Ask tab */}
                {activeTab === 'ask' && (
                  <>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 80 }}>
                      {messages.length === 0 && !activeStreamId && (
                        <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 14, color: 'var(--stone)', lineHeight: 1.7, fontStyle: 'italic' }}>
                          Ask anything about this project.
                        </p>
                      )}

                      {messages.map((msg) => (
                        <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                          {msg.role === 'proof' ? (
                            <SentenceText text={msg.content} streaming={false} />
                          ) : (
                            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--concrete)', lineHeight: 1.65 }}>
                              {msg.content}
                            </p>
                          )}
                        </motion.div>
                      ))}

                      {/* Active stream */}
                      {activeStreamId && streamingContent[activeStreamId] !== undefined && (
                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                          <SentenceText text={streamingContent[activeStreamId]} streaming={true} />
                        </motion.div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>

                    <div style={{ padding: '10px 14px 14px', borderTop: '1px solid rgba(184,179,172,0.25)', flexShrink: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                        <textarea ref={inputRef} value={input}
                          onChange={e => setInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                          placeholder="Ask proof. anything…" rows={1}
                          style={{ flex: 1, background: '#F5F2EB', border: '1px solid rgba(184,179,172,0.5)', borderRadius: 8, padding: '9px 12px', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--dark)', resize: 'none', outline: 'none', minHeight: 38, lineHeight: 1.5, transition: 'border-color 0.18s' }}
                          onFocus={e => (e.target.style.borderColor = 'var(--mango)')}
                          onBlur={e => (e.target.style.borderColor = 'rgba(184,179,172,0.5)')}
                        />
                        <button onClick={send} disabled={streaming || !input.trim()}
                          style={{ width: 30, height: 30, borderRadius: '50%', background: streaming || !input.trim() ? '#D5D4D6' : 'var(--mango)', border: 'none', cursor: streaming || !input.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.18s' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="#FDFCFA"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
