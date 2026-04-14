'use client'

import { useState, useEffect } from 'react'
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
  const [directions, setDirections] = useState<string[]>(existing?.directions || [])
  const [variations, setVariations] = useState<string[]>(existing?.variations || [])
  const [selected, setSelected] = useState<string[]>(existing?.chosen ? [existing.chosen] : [])
  const [finalChosen, setFinalChosen] = useState(existing?.chosen || '')
  const [phase, setPhase] = useState<'loading' | 'selecting' | 'refining' | 'locked'>(
    existing?.chosen ? 'locked' : existing?.variations?.length ? 'selecting' : 'loading'
  )
  const [refining, setRefining] = useState(false)
  const [refinedVariations, setRefinedVariations] = useState<string[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const ctx = buildSynthesisContext(project)

  useEffect(() => {
    if (phase === 'loading') generate()
  }, [])

  function save(d = directions, v = variations, c = finalChosen) {
    updateProject(project.id, { synthesis: { ...project.synthesis, tagline: { directions: d, variations: v, chosen: c } } })
  }

  async function generate() {
    // Generate directions + variations in one pass
    const prompt = `${ctx}

Generate 4 strategic directions for a tagline, then 3 variations for each direction (12 total).

DIRECTION_1: [Name] — [one sentence on the strategic angle]
DIRECTION_2: [Name] — [one sentence]
DIRECTION_3: [Name] — [one sentence]
DIRECTION_4: [Name] — [one sentence]

VARIATION_1_A: [tagline]
VARIATION_1_B: [tagline]
VARIATION_1_C: [tagline]
VARIATION_2_A: [tagline]
VARIATION_2_B: [tagline]
VARIATION_2_C: [tagline]
VARIATION_3_A: [tagline]
VARIATION_3_B: [tagline]
VARIATION_3_C: [tagline]
VARIATION_4_A: [tagline]
VARIATION_4_B: [tagline]
VARIATION_4_C: [tagline]

A tagline earns its place when it couldn't be said by anyone else and couldn't be said any other way. Short. No em dashes.`

    await stream({
      project, mode: 'strategist', module: 'Tagline', prompt, maxTokens: 700,
      onChunk: () => {},
      onComplete: (text) => {
        const dirs = [1,2,3,4].map(n => text.match(new RegExp(`DIRECTION_${n}:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '').filter(Boolean)
        const vars: string[] = []
        for (let d = 1; d <= 4; d++) {
          for (const l of ['A','B','C']) {
            const m = text.match(new RegExp(`VARIATION_${d}_${l}:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim()
            if (m) vars.push(m)
          }
        }
        setDirections(dirs); setVariations(vars)
        save(dirs, vars, '')
        setPhase('selecting')
      },
    })
  }

  async function refineSelected() {
    setRefining(true)
    setPhase('refining')
    const prompt = `${ctx}

The strategist has shortlisted these tagline candidates:
${selected.map((s, i) => `${i+1}. ${s}`).join('\n')}

Generate 6 refined variations that develop and sharpen these directions. Draw on the best of each.

REFINED_1: [tagline]
REFINED_2: [tagline]
REFINED_3: [tagline]
REFINED_4: [tagline]
REFINED_5: [tagline]
REFINED_6: [tagline]

Each must be shorter, sharper, and more distinctive than what you started with. No em dashes.`

    await stream({
      project, mode: 'strategist', module: 'Tagline', prompt, maxTokens: 300,
      onChunk: () => {},
      onComplete: (text) => {
        const refined = [1,2,3,4,5,6].map(n => text.match(new RegExp(`REFINED_${n}:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '').filter(Boolean)
        setRefinedVariations(refined)
        setRefining(false)
      },
    })
  }

  function toggleSelect(v: string) {
    setSelected(prev => {
      if (prev.includes(v)) return prev.filter(s => s !== v)
      if (prev.length >= 3) return prev
      return [...prev, v]
    })
  }

  function lockTagline(t: string) {
    setFinalChosen(t)
    save(directions, variations, t)
    setPhase('locked')
  }

  const activeVariations = phase === 'refining' || refinedVariations.length > 0 ? refinedVariations : variations

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F2EB' }}>
      <Strip project={project} phase="Synthesis — Tagline" onAskProof={() => setDrawerOpen(true)} />
      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '80px 24px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>Synthesis — 6 of 7</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.06, letterSpacing: '-0.015em', marginBottom: 20 }}>The line.</h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 48, fontWeight: 300 }}>
            {phase === 'locked' ? 'Locked.' : phase === 'selecting' ? 'Select up to 3 to refine, or lock one now.' : phase === 'refining' && !refining ? 'Pick the one.' : 'A tagline earns its place when it couldn\'t be said by anyone else.'}
          </p>
        </motion.div>

        {/* Loading */}
        {phase === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}</div>
            <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>proof. is finding the territory and writing the lines…</span>
          </div>
        )}

        {/* Locked */}
        {phase === 'locked' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mango)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
              Locked
            </div>
            <input value={finalChosen} onChange={e => { setFinalChosen(e.target.value); save(directions, variations, e.target.value) }}
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(110,107,104,0.3)', padding: '8px 0 16px', fontFamily: 'var(--font-display)', fontSize: 32, fontStyle: 'italic', color: 'var(--dark)', outline: 'none', marginBottom: 24 }} />
            <button onClick={() => setPhase('selecting')} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 48 }}>Go back to variations</button>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 32, borderTop: '1px solid rgba(213,212,214,0.4)' }}>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/tone`)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>← Tone</button>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/manifesto`)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: 'var(--dark)', color: '#FDFCFA', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--mango)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--dark)'}>
                Continue to Manifesto →
              </button>
            </div>
          </motion.div>
        )}

        {/* Selecting / Refining */}
        {(phase === 'selecting' || phase === 'refining') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Directions — compact reference */}
            {directions.length > 0 && (
              <div style={{ marginBottom: 40, padding: '16px 20px', background: '#EDE9E2', borderRadius: 10, border: '1px solid rgba(184,179,172,0.2)' }}>
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 12 }}>Strategic directions</div>
                {directions.map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < directions.length - 1 ? 8 : 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 500, flexShrink: 0, width: 14 }}>{i+1}.</span>
                    <span style={{ fontSize: 13, color: 'var(--concrete)', fontWeight: 300, lineHeight: 1.55 }}>{d}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Refining loading */}
            {refining && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                <div style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}</div>
                <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>proof. is sharpening the selected directions…</span>
              </div>
            )}

            {/* Variations grid */}
            {!refining && activeVariations.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                {phase === 'selecting' && selected.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 300, marginBottom: 16 }}>
                    {selected.length}/3 selected{selected.length >= 1 && ' — '}
                    {selected.length >= 1 && <span style={{ color: 'var(--concrete)' }}>lock one or refine {selected.length > 1 ? 'these' : 'this'}</span>}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {activeVariations.map((v, i) => {
                    const isSelected = selected.includes(v)
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 8, background: isSelected ? '#FAF8F4' : 'transparent', border: isSelected ? '1px solid rgba(255,161,10,0.3)' : '1px solid transparent', cursor: 'pointer', transition: 'all 0.15s' }}
                        onClick={() => toggleSelect(v)}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F5F2E8' }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--dark)', flex: 1 }}>{v}</span>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                          {isSelected && (
                            <button onClick={e => { e.stopPropagation(); lockTagline(v) }}
                              style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: '#FDFCFA', background: 'var(--dark)', border: 'none', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', transition: 'background 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--mango)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'var(--dark)'}>
                              Lock →
                            </button>
                          )}
                          <div style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${isSelected ? 'var(--mango)' : 'rgba(184,179,172,0.5)'}`, background: isSelected ? 'var(--mango)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}>
                            {isSelected && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="#FDFCFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            {!refining && activeVariations.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, borderTop: '1px solid rgba(213,212,214,0.4)' }}>
                <button onClick={() => router.push(`/project/${project.id}/synthesis/tone`)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>← Tone</button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <ProofButton onClick={generate} size="sm">Regenerate</ProofButton>
                  {selected.length >= 1 && phase === 'selecting' && (
                    <ProofButton onClick={refineSelected} variant="solid" size="md" style={{ borderRadius: 5 }}>
                      Refine {selected.length} selected →
                    </ProofButton>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>

      <ProofDrawer project={project} mode="strategist" module="Tagline"
        open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <style>{`input::placeholder { color: var(--stone); }`}</style>
    </div>
  )
}
