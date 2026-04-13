'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Project, ProjectMode, ProofMessage } from '@/types'
import { useProofStream } from '@/lib/useProofStream'

interface ProofDrawerProps {
  project: Project
  mode: ProjectMode
  module: string
  open: boolean
  onClose: () => void
  initialMessage?: string
  thoughts?: Record<string, string>
  questionLabels?: Record<string, string>
}

export default function ProofDrawer({
  project, mode, module, open, onClose,
  initialMessage, thoughts = {}, questionLabels = {},
}: ProofDrawerProps) {
  const [messages, setMessages] = useState<ProofMessage[]>([])
  const [input, setInput] = useState('')
  const [activeTab, setActiveTab] = useState<'notes' | 'ask'>(
    Object.keys(thoughts).length > 0 ? 'notes' : 'ask'
  )
  const { stream, streaming } = useProofStream()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initialShown = useRef(false)

  const hasNotes = Object.keys(thoughts).length > 0

  useEffect(() => {
    if (open && initialMessage && !initialShown.current) {
      initialShown.current = true
      addMessage('proof', initialMessage)
      setActiveTab('ask')
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open, initialMessage])

  useEffect(() => {
    if (hasNotes && !initialMessage) setActiveTab('notes')
  }, [hasNotes, initialMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function addMessage(role: 'proof' | 'user', content: string) {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(), role, content,
      createdAt: new Date().toISOString(),
    }])
  }

  async function send() {
    const txt = input.trim()
    if (!txt || streaming) return
    setInput('')
    addMessage('user', txt)

    const answersCtx = project.brief?.answers
      ? Object.entries(project.brief.answers)
          .filter(([, a]) => a.value?.trim())
          .map(([, a]) => `${a.id}: ${a.value}`).join('\n\n')
      : ''

    const prompt = answersCtx ? `Brief context:\n${answersCtx}\n\nUser: ${txt}` : txt

    const streamId = crypto.randomUUID()
    setMessages(prev => [...prev, {
      id: streamId, role: 'proof', content: '', createdAt: new Date().toISOString(),
    }])
    setActiveTab('ask')

    await stream({
      project, mode, module, prompt, maxTokens: 420,
      onChunk: (text) => {
        setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: text } : m))
      },
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Invisible overlay to close on outside click */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            onClick={onClose}
          />

          {/* Floating panel — anchored top-right near the strip */}
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: 60,
              right: 44,
              width: 380,
              maxHeight: 480,
              background: '#FDFCFA',
              border: '1px solid rgba(184,179,172,0.5)',
              borderRadius: 12,
              boxShadow: '0 8px 40px rgba(26,24,22,0.12), 0 1px 4px rgba(26,24,22,0.06)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px 0',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block', animation: 'breathe 3s ease-in-out infinite' }} />
                <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)' }}>proof.</span>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--stone)', fontSize: 18, lineHeight: 1, padding: '0 2px', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--dark)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--stone)')}
              >×</button>
            </div>

            {/* Tabs — only show if there are notes */}
            {hasNotes && (
              <div style={{ display: 'flex', gap: 0, padding: '12px 18px 0', borderBottom: '1px solid rgba(184,179,172,0.25)', flexShrink: 0 }}>
                {(['notes', 'ask'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      fontWeight: activeTab === tab ? 500 : 300,
                      color: activeTab === tab ? 'var(--dark)' : 'var(--stone)',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === tab ? '1.5px solid var(--mango)' : '1.5px solid transparent',
                      padding: '0 0 10px',
                      marginRight: 20,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tab === 'notes' ? `Notes (${Object.keys(thoughts).length})` : 'Ask proof.'}
                  </button>
                ))}
              </div>
            )}

            {/* Notes tab */}
            {activeTab === 'notes' && hasNotes && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
                {Object.entries(thoughts).map(([id, thought]) => (
                  <div key={id} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 8 }}>
                      {questionLabels[id] || id}
                    </div>
                    <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: 'var(--dark)', lineHeight: 1.8 }}>
                      {thought}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Ask tab */}
            {activeTab === 'ask' && (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 80 }}>
                  {messages.length === 0 && (
                    <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: 'var(--stone)', lineHeight: 1.7 }}>
                      Ask anything about this project.
                    </p>
                  )}
                  {messages.map((msg, i) => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}>
                      {msg.role === 'proof' ? (
                        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: 'var(--dark)', lineHeight: 1.8 }}>
                          {msg.content}
                          {streaming && i === messages.length - 1 && (
                            <span style={{ display: 'inline-block', width: 1.5, height: 13, background: 'var(--mango)', marginLeft: 2, verticalAlign: 'middle', animation: 'blink 0.9s step-end infinite' }} />
                          )}
                        </p>
                      ) : (
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--concrete)', lineHeight: 1.65 }}>
                          {msg.content}
                        </p>
                      )}
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div style={{ padding: '10px 14px 14px', borderTop: '1px solid rgba(184,179,172,0.25)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                      placeholder="Ask proof. anything…"
                      rows={1}
                      style={{
                        flex: 1, background: '#F5F2EB', border: '1px solid rgba(184,179,172,0.5)',
                        borderRadius: 8, padding: '9px 12px', fontFamily: 'var(--font-sans)',
                        fontSize: 13, fontWeight: 300, color: 'var(--dark)', resize: 'none',
                        outline: 'none', minHeight: 38, lineHeight: 1.5, transition: 'border-color 0.18s',
                      }}
                      onFocus={e => (e.target.style.borderColor = 'var(--mango)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(184,179,172,0.5)')}
                    />
                    <button
                      onClick={send}
                      disabled={streaming || !input.trim()}
                      style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: streaming || !input.trim() ? '#D5D4D6' : 'var(--dark)',
                        border: 'none', cursor: streaming || !input.trim() ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'background 0.18s',
                      }}
                      onMouseEnter={e => { if (!streaming && input.trim()) (e.currentTarget.style.background = 'var(--mango)') }}
                      onMouseLeave={e => { if (!streaming && input.trim()) (e.currentTarget.style.background = 'var(--dark)') }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#FDFCFA">
                        <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
