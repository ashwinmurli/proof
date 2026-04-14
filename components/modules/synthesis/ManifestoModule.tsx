'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
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
  { id: 'believe', starter: 'We believe', placeholder: '…that financial advice should start with trust, not credentials.' },
  { id: 'committed', starter: 'We are committed to', placeholder: '…never treating a difficult moment as a liability to manage.' },
  { id: 'world', starter: 'We want to live in a world where', placeholder: '…going through something hard doesn\'t mean losing your footing.' },
  { id: 'bothers', starter: 'It bothers us when', placeholder: '…expertise is used to make people feel small.' },
  { id: 'feedoff', starter: 'We feed off', placeholder: '…the moment someone realises they\'re more capable than they were told.' },
  { id: 'motto', starter: 'Our motto is', placeholder: '…capability doesn\'t disappear when a marriage does.' },
]

export default function ManifestoModule({ project }: { project: Project }) {
  const router = useRouter()
  const { updateProject } = useProofStore()
  const { stream } = useProofStream()

  const existing = project.synthesis?.manifesto
  const [prompts, setPrompts] = useState<Record<string, string>>(existing?.prompts || {})
  const [final, setFinal] = useState(existing?.final || '')
  const [phase, setPhase] = useState<'prompts' | 'synthesising' | 'done'>(existing?.final ? 'done' : 'prompts')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const ctx = buildSynthesisContext(project)
  const filledCount = PROMPTS.filter(p => prompts[p.id]?.trim()).length
  const allFilled = filledCount >= 4

  function save(p = prompts, f = final) {
    updateProject(project.id, { synthesis: { ...project.synthesis, manifesto: { prompts: p, final: f } } })
  }

  function handlePrompt(id: string, value: string) {
    const next = { ...prompts, [id]: value }
    setPrompts(next); save(next, final)
  }

  async function synthesise() {
    setPhase('synthesising')
    const promptText = PROMPTS.filter(p => prompts[p.id]?.trim())
      .map(p => `${p.starter} ${prompts[p.id]}`).join('\n')

    const prompt = `${ctx}

The brand's raw manifesto material — sentence starters completed by the strategist:
${promptText}

Now synthesise this into a manifesto in the brand's voice. Consumer-facing. Not a mission statement reworded. Something that makes the people it's for feel seen, and makes everyone else feel like it's not for them.

Write it as a flowing piece, not bullet points. 150-250 words. In the brand's voice as established in the tone of voice work. No em dashes. No generic openings like "At [brand]…"`

    await stream({
      project, mode: 'strategist', module: 'Manifesto', prompt, maxTokens: 600,
      onChunk: (text) => setFinal(text),
      onComplete: (text) => {
        setFinal(text)
        save(prompts, text)
        setPhase('done')
      },
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-0)' }}>
      <Strip project={project} phase="Synthesis — Manifesto" onAskProof={() => setDrawerOpen(true)} />
      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '72px 24px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 14 }}>Synthesis — 7 of 7</div>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 48, fontWeight: 300 }}>
            Complete the sentence starters honestly. Don't overthink them. proof. will synthesise your answers into the manifesto.
          </p>
        </motion.div>

        {phase === 'prompts' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {PROMPTS.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                style={{ marginBottom: 36 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontStyle: 'italic', color: 'var(--dark)', marginBottom: 10 }}>
                  {p.starter}…
                </div>
                <textarea
                  value={prompts[p.id] || ''}
                  onChange={e => handlePrompt(p.id, e.target.value)}
                  placeholder={p.placeholder}
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(213,212,214,0.4)', padding: '6px 0 12px', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 300, color: 'var(--dark)', outline: 'none', resize: 'none', lineHeight: 1.8, minHeight: 52 }}
                />
              </motion.div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32, borderTop: '1px solid rgba(213,212,214,0.4)', marginTop: 16 }}>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/tagline`)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>← Tagline</button>
              <ProofButton onClick={synthesise} disabled={!allFilled} variant="solid" size="md" style={{ borderRadius: 5 }}>
                {allFilled ? 'Write the manifesto →' : `Fill in ${4 - filledCount} more to continue`}
              </ProofButton>
            </div>
          </motion.div>
        )}

        {(phase === 'synthesising' || (phase === 'done' && !final)) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}
            </div>
            <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>proof. is writing the manifesto…</span>
          </motion.div>
        )}

        {phase === 'synthesising' && final && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 32 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.9, opacity: 0.7 }}>
              {final}
              <span style={{ display: 'inline-block', width: 1.5, height: 16, background: 'var(--mango)', marginLeft: 3, verticalAlign: 'middle', animation: 'blink 0.9s step-end infinite' }} />
            </p>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {/* Manifesto */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mango)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
                The manifesto
              </div>
              <textarea
                value={final}
                onChange={e => { setFinal(e.target.value); save(prompts, e.target.value) }}
                style={{ width: '100%', background: 'transparent', border: 'none', padding: 0, fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, fontWeight: 400, color: 'var(--dark)', outline: 'none', resize: 'none', lineHeight: 1.9, minHeight: 200 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 48 }}>
              <button onClick={() => setPhase('prompts')} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>Edit source material</button>
              <ProofButton onClick={synthesise} size="sm">Rewrite →</ProofButton>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32, borderTop: '1px solid rgba(213,212,214,0.4)' }}>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/tagline`)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>← Tagline</button>
              <button onClick={() => router.push(`/project/${project.id}/brand-home`)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: 'var(--dark)', color: '#FDFCFA', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: 'pointer', transition: 'all 0.2s' }}
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
      <style>{`textarea::placeholder { color: var(--stone); font-style: italic; }`}</style>
    </div>
  )
}
