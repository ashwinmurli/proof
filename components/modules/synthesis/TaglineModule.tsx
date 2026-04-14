'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { useProofStore } from '@/store'
import { useProofStream } from '@/lib/useProofStream'
import { buildSynthesisContext } from '@/lib/synthesisContext'
import Strip from '@/components/proof/Strip'
import ProofDrawer from '@/components/proof/ProofDrawer'
import ProofButton from '@/components/proof/ProofButton'

export default function TaglineModule({ project }: { project: Project }) {
  const router = useRouter()
  const { updateProject } = useProofStore()
  const { stream } = useProofStream()

  const existing = project.synthesis?.tagline
  const [phase, setPhase] = useState<'directions' | 'variations' | 'locked'>(
    existing?.chosen ? 'locked' : existing?.variations?.length ? 'variations' : existing?.directions?.length ? 'variations' : 'directions'
  )
  const [directions, setDirections] = useState<string[]>(existing?.directions || [])
  const [variations, setVariations] = useState<string[]>(existing?.variations || [])
  const [chosen, setChosen] = useState(existing?.chosen || '')
  const [generating, setGenerating] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const ctx = buildSynthesisContext(project)

  function save(d = directions, v = variations, c = chosen) {
    updateProject(project.id, { synthesis: { ...project.synthesis, tagline: { directions: d, variations: v, chosen: c } } })
  }

  useEffect(() => {
    if (!directions.length) generateDirections()
  }, [])

  async function generateDirections() {
    setGenerating(true)
    const prompt = `${ctx}

Generate 4 strategic directions for a tagline for this brand. Each direction is an approach, not a tagline yet.

Write exactly:
DIRECTION_1: [Name] — [1 sentence explaining the strategic angle]
DIRECTION_2: [Name] — [1 sentence explaining the strategic angle]
DIRECTION_3: [Name] — [1 sentence explaining the strategic angle]
DIRECTION_4: [Name] — [1 sentence explaining the strategic angle]

These should explore genuinely different territories — not variations on the same idea. No em dashes.`

    await stream({
      project, mode: 'strategist', module: 'Tagline', prompt, maxTokens: 400,
      onChunk: () => {},
      onComplete: (text) => {
        const dirs = [1,2,3,4].map(n => text.match(new RegExp(`DIRECTION_${n}:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '').filter(Boolean)
        setDirections(dirs); save(dirs, variations, chosen)
        setGenerating(false)
      },
    })
  }

  async function generateVariations() {
    setGenerating(true)
    const prompt = `${ctx}

Based on these strategic directions for the tagline:
${directions.map((d,i) => `${i+1}. ${d}`).join('\n')}

Generate 3 tagline variations for each direction (12 total).

Write exactly:
DIRECTION_1_A: [tagline]
DIRECTION_1_B: [tagline]
DIRECTION_1_C: [tagline]
DIRECTION_2_A: [tagline]
DIRECTION_2_B: [tagline]
DIRECTION_2_C: [tagline]
(continue for directions 3 and 4)

Each tagline earns its place when it couldn't be said by anyone else and couldn't be said any other way. Short. No em dashes.`

    await stream({
      project, mode: 'strategist', module: 'Tagline', prompt, maxTokens: 600,
      onChunk: () => {},
      onComplete: (text) => {
        const vars: string[] = []
        for (let d = 1; d <= 4; d++) {
          for (const l of ['A','B','C']) {
            const m = text.match(new RegExp(`DIRECTION_${d}_${l}:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim()
            if (m) vars.push(m)
          }
        }
        setVariations(vars); save(directions, vars, chosen)
        setPhase('variations'); setGenerating(false)
      },
    })
  }

  function lockTagline(t: string) {
    setChosen(t); save(directions, variations, t); setPhase('locked')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F2EB' }}>
      <Strip project={project} phase="Synthesis — Tagline" onAskProof={() => setDrawerOpen(true)} />
      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '80px 24px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>Synthesis — 6 of 7</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.06, letterSpacing: '-0.015em', marginBottom: 20 }}>The line.</h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 56, fontWeight: 300 }}>
            A tagline earns its place when it couldn't be said by anyone else and couldn't be said any other way. Three phases: directions, variations, locked.
          </p>
        </motion.div>

        {/* Phase indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 56 }}>
          {['directions','variations','locked'].map(p => (
            <div key={p} style={{ height: 2, flex: 1, borderRadius: 1, background: phase === p || (p === 'directions' && ['variations','locked'].includes(phase)) || (p === 'variations' && phase === 'locked') ? 'var(--mango)' : '#D5D4D6', transition: 'background 0.4s' }} />
          ))}
        </div>

        <AnimatePresence>
          {generating && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0,1,2].map(i => <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}
              </div>
              <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                {phase === 'directions' ? 'proof. is finding the territory…' : 'proof. is writing the lines…'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Directions */}
        {phase === 'directions' && directions.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 20 }}>Strategic directions</div>
            {directions.map((d, i) => (
              <div key={i} style={{ padding: '16px 0', borderBottom: '1px solid rgba(213,212,214,0.4)', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--dark)', lineHeight: 1.7, fontWeight: 300 }}>
                <span style={{ fontWeight: 500, marginRight: 8 }}>{i + 1}.</span>{d}
              </div>
            ))}
            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
              <ProofButton onClick={generateVariations} variant="solid" size="md" style={{ borderRadius: 5 }}>Generate variations →</ProofButton>
            </div>
          </motion.div>
        )}

        {/* Variations */}
        {phase === 'variations' && variations.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 20 }}>
              Pick one to lock — or edit directly
            </div>
            {directions.map((dir, di) => (
              <div key={di} style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 11, color: 'var(--stone)', fontWeight: 300, marginBottom: 12 }}>{dir.split('—')[0]?.trim()}</div>
                {variations.slice(di * 3, di * 3 + 3).map((v, vi) => (
                  <div key={vi} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(213,212,214,0.25)' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--dark)' }}>{v}</span>
                    <button onClick={() => lockTagline(v)} style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--stone)', background: 'none', border: '1px solid rgba(184,179,172,0.5)', borderRadius: 20, padding: '3px 12px', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--mango)'; e.currentTarget.style.color = 'var(--mango)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(184,179,172,0.5)'; e.currentTarget.style.color = 'var(--stone)' }}>
                      Lock this
                    </button>
                  </div>
                ))}
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32 }}>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/tone`)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>← Tone</button>
              <ProofButton onClick={generateVariations} size="sm">Regenerate</ProofButton>
            </div>
          </motion.div>
        )}

        {/* Locked */}
        {phase === 'locked' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mango)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
              Locked
            </div>
            <input value={chosen} onChange={e => { setChosen(e.target.value); save(directions, variations, e.target.value) }}
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(110,107,104,0.3)', padding: '8px 0 16px', fontFamily: 'var(--font-display)', fontSize: 32, fontStyle: 'italic', fontWeight: 400, color: 'var(--dark)', outline: 'none', marginBottom: 24 }} />
            <div style={{ display: 'flex', gap: 12, marginBottom: 48 }}>
              <button onClick={() => setPhase('variations')} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>Go back to variations</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32, borderTop: '1px solid rgba(213,212,214,0.4)' }}>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/tone`)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>← Tone</button>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/manifesto`)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: 'var(--dark)', color: '#FDFCFA', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--mango)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--dark)')}>
                Continue to Manifesto →
              </button>
            </div>
          </motion.div>
        )}
      </main>

      <ProofDrawer project={project} mode="strategist" module="Tagline"
        open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <style>{`input::placeholder { color: var(--stone); }`}</style>
    </div>
  )
}
