'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { useProofStore } from '@/store'
import { useProofStream } from '@/lib/useProofStream'
import { buildSynthesisContext } from '@/lib/synthesisContext'
import Strip from '@/components/proof/Strip'
import ProofDrawer from '@/components/proof/ProofDrawer'
import ProofButton from '@/components/proof/ProofButton'

const PROMPTS = [
  { id: 'believe',   starter: 'We believe',                        placeholder: '…that financial advice should start with trust, not credentials.' },
  { id: 'committed', starter: 'We are committed to',               placeholder: '…never treating a difficult moment as a liability to manage.' },
  { id: 'world',     starter: 'We want to live in a world where',  placeholder: '…going through something hard doesn\'t mean losing your footing.' },
  { id: 'bothers',   starter: 'It bothers us when',                placeholder: '…expertise is used to make people feel small.' },
  { id: 'feedoff',   starter: 'We feed off',                       placeholder: '…the moment someone realises they\'re more capable than they were told.' },
  { id: 'motto',     starter: 'Our motto is',                      placeholder: '…capability doesn\'t disappear when a marriage does.' },
]

export default function ManifestoModule({ project }: { project: Project }) {
  const router = useRouter()
  const { updateProject } = useProofStore()
  const { stream } = useProofStream()

  const existing = project.synthesis?.manifesto
  const [prompts, setPrompts] = useState<Record<string, string>>(existing?.prompts || {})
  const [final, setFinal] = useState(existing?.final || '')
  const [phase, setPhase] = useState<'prompts' | 'synthesising' | 'done'>(existing?.final ? 'done' : 'prompts')
  const [editing, setEditing] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const editRef = useRef<HTMLTextAreaElement>(null)

  const ctx = buildSynthesisContext(project)
  const filledCount = PROMPTS.filter(p => prompts[p.id]?.trim()).length
  const allFilled = filledCount >= 4

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus()
      const len = editRef.current.value.length
      editRef.current.setSelectionRange(len, len)
    }
  }, [editing])

  function save(p = prompts, f = final) {
    updateProject(project.id, { synthesis: { ...project.synthesis, manifesto: { prompts: p, final: f } } })
  }

  function handlePrompt(id: string, value: string) {
    const next = { ...prompts, [id]: value }
    setPrompts(next); save(next, final)
  }

  async function synthesise() {
    setPhase('synthesising')
    setEditing(false)
    setFinal('')

    const filledPrompts = PROMPTS.filter(p => prompts[p.id]?.trim())
    const rawMaterial = filledPrompts.map(p => `${p.starter} ${prompts[p.id]}`).join('\n')

    const prompt = `${ctx}

The strategist has written these raw statements about the brand:
${rawMaterial}

Now write the manifesto. Not a synthesis of these sentences — a transformation of them.

Forget the sentence starters. Use what they're pointing at: the belief underneath, the conviction, the thing that makes this brand different from every other brand that exists.

What you are writing: a monologue. Something someone would read aloud to a room. Something that starts with a statement so specific it could only be about this brand, builds through the middle with the rhythm of someone who has thought about this for a long time, and ends with something the reader will remember. A passage from a book. The opening of something.

The people it's for should feel seen. Like someone finally said the thing they've been thinking. The people it's not for should feel that too — that this isn't for them. That is not a failure. That is the whole point.

Rules:
- Open with a specific observation or statement — not "We believe" or "At [brand]" or any version of "In a world where"
- Short sentences can interrupt long ones. That rhythm is intentional
- No corporate abstractions: no "transforming", "empowering", "enabling", "journey", "solution"
- No em dashes
- No bullet points, headers, or lists
- 2-3 paragraphs, 180-280 words total
- Separate paragraphs with a blank line
- Speak as if you mean it. Because you do.`

    await stream({
      project, mode: 'strategist', module: 'Manifesto', prompt, maxTokens: 700,
      onChunk: (text) => setFinal(text),
      onComplete: (text) => {
        setFinal(text)
        save(prompts, text)
        setPhase('done')
      },
    })
  }

  // Split final text into paragraphs for display
  const paragraphs = final.split(/\n\n+/).map(p => p.trim()).filter(Boolean)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-0)' }}>
      <Strip project={project} phase="Synthesis — Manifesto" onAskProof={() => setDrawerOpen(true)} />
      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '72px 24px 120px' }}>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 14 }}>Synthesis — 7 of 7</div>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 56, fontWeight: 300 }}>
            {phase === 'prompts'
              ? 'Complete the sentences. proof. will transform them into the manifesto — not synthesise them, transform them.'
              : phase === 'done'
              ? 'Click anywhere in the text to edit it directly.'
              : 'proof. is writing…'}
          </p>
        </motion.div>

        {/* ── PROMPTS PHASE ── */}
        {phase === 'prompts' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {PROMPTS.map((p, i) => (
                <motion.div key={p.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ paddingBottom: 32, marginBottom: 32, borderBottom: i < PROMPTS.length - 1 ? '1px solid rgba(194,189,183,0.25)' : 'none' }}
                >
                  {/* Starter (dark) + answer (mango) on same visual line */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 6px' }}>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: 22,
                      fontWeight: 400,
                      color: 'var(--dark)',
                      lineHeight: 1.55,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      {p.starter}
                    </span>
                    <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                      <textarea
                        value={prompts[p.id] || ''}
                        onChange={e => handlePrompt(p.id, e.target.value)}
                        placeholder={p.placeholder}
                        rows={1}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: `1px solid ${prompts[p.id]?.trim() ? 'rgba(255,161,10,0.3)' : 'rgba(213,212,214,0.4)'}`,
                          padding: '2px 0 8px',
                          fontFamily: 'var(--font-display)',
                          fontStyle: 'italic',
                          fontSize: 22,
                          fontWeight: 400,
                          color: prompts[p.id]?.trim() ? 'var(--mango)' : 'var(--stone)',
                          outline: 'none',
                          resize: 'none',
                          lineHeight: 1.55,
                          display: 'block',
                          transition: 'color 0.2s, border-color 0.2s',
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Preview — filled prompts flowing together */}
            <AnimatePresence>
              {filledCount >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ marginBottom: 40, padding: '24px 28px', background: 'var(--surface-1)', borderRadius: 12, border: '1px solid rgba(184,179,172,0.2)' }}
                >
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>
                    The raw material
                  </div>
                  <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 17, fontWeight: 400, lineHeight: 1.75, margin: 0 }}>
                    {PROMPTS.filter(p => prompts[p.id]?.trim()).map((p, i, arr) => (
                      <span key={p.id}>
                        <span style={{ color: 'var(--dark)' }}>{p.starter} </span>
                        <span style={{ color: 'var(--mango)' }}>{prompts[p.id]?.replace(/^…/, '').trim()}</span>
                        {i < arr.length - 1 ? <span style={{ color: 'var(--stone)' }}>{'. '}</span> : '.'}
                      </span>
                    ))}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32, borderTop: '1px solid rgba(213,212,214,0.35)', marginTop: 8 }}>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/tagline`)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Tagline
              </button>
              <ProofButton onClick={synthesise} disabled={!allFilled} variant="solid" size="md" style={{ borderRadius: 5 }}>
                {allFilled ? 'Write the manifesto →' : `${4 - filledCount} more to continue`}
              </ProofButton>
            </div>
          </motion.div>
        )}

        {/* ── SYNTHESISING PHASE ── */}
        {phase === 'synthesising' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!final && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0,1,2].map(i => (
                    <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }}
                      animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />
                  ))}
                </div>
              </div>
            )}
            {final && (
              <div>
                {final.split(/\n\n+/).map((para, i, arr) => (
                  <p key={i} style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 22,
                    fontWeight: 400,
                    color: 'var(--dark)',
                    lineHeight: 1.7,
                    marginBottom: i < arr.length - 1 ? 32 : 0,
                    opacity: 0.75,
                  }}>
                    {para.trim()}
                    {i === arr.length - 1 && (
                      <span style={{ display: 'inline-block', width: 1.5, height: 18, background: 'var(--mango)', marginLeft: 3, verticalAlign: 'middle', animation: 'blink 0.9s step-end infinite' }} />
                    )}
                  </p>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── DONE PHASE ── */}
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

            {editing ? (
              <div style={{ marginBottom: 40 }}>
                <textarea
                  ref={editRef}
                  value={final}
                  onChange={e => { setFinal(e.target.value); save(prompts, e.target.value) }}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(110,107,104,0.3)',
                    padding: '0 0 20px',
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 22,
                    fontWeight: 400,
                    color: 'var(--dark)',
                    outline: 'none',
                    resize: 'none',
                    lineHeight: 1.7,
                    minHeight: 200,
                  }}
                />
                <button
                  onClick={() => setEditing(false)}
                  style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 12 }}
                >
                  Done editing
                </button>
              </div>
            ) : (
              /* Read mode — large italic serif, click to edit */
              <div
                onClick={() => setEditing(true)}
                style={{ marginBottom: 40, cursor: 'text' }}
              >
                {paragraphs.map((para, i) => (
                  <p key={i} style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 22,
                    fontWeight: 400,
                    color: 'var(--dark)',
                    lineHeight: 1.7,
                    marginBottom: i < paragraphs.length - 1 ? 32 : 0,
                  }}>
                    {para}
                  </p>
                ))}
              </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 56, paddingTop: 20, borderTop: '1px solid rgba(194,189,183,0.3)' }}>
              <button
                onClick={() => { setPhase('prompts'); setEditing(false) }}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--concrete)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--stone)'}
              >
                Edit source material
              </button>
              <ProofButton onClick={synthesise} size="sm">Rewrite →</ProofButton>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, borderTop: '1px solid rgba(213,212,214,0.35)' }}>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/tagline`)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Tagline
              </button>
              <button onClick={() => router.push(`/project/${project.id}/brand-home`)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: 'var(--dark)', color: '#FDFCFA', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--mango)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--dark)')}>
                View Brand Home →
              </button>
            </div>
          </motion.div>
        )}
      </main>

      <ProofDrawer project={project} mode="strategist" module="Manifesto"
        open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <style>{`
        textarea::placeholder { color: var(--aluminum); font-style: italic; }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  )
}
