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
  const [allVariations, setAllVariations] = useState<string[]>(existing?.variations || [])
  // visibleSet: what's shown in the list — all variations initially, then selected+refined after each refine pass
  const [visibleSet, setVisibleSet] = useState<string[]>(existing?.variations || [])
  const [selected, setSelected] = useState<string[]>([])  // never seed from existing.chosen
  const [finalChosen, setFinalChosen] = useState(existing?.chosen || '')
  const [phase, setPhase] = useState<'loading' | 'selecting' | 'locked'>(
    existing?.chosen ? 'locked' : existing?.variations?.length ? 'selecting' : 'loading'
  )
  const [refining, setRefining] = useState(false)
  const [refineBatches, setRefineBatches] = useState<number[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const ctx = buildSynthesisContext(project)
  const initialCount = directions.length > 0 ? directions.length * 3 : 12

  useEffect(() => {
    if (phase === 'loading') generate()
  }, [])

  function save(d = directions, v = allVariations, c = finalChosen) {
    updateProject(project.id, { synthesis: { ...project.synthesis, tagline: { directions: d, variations: v, chosen: c } } })
  }

  async function generate() {
    const prompt = `${ctx}

Generate 4 strategic directions for a tagline, then 3 variations for each direction (12 total).

Each direction should approach the brand from a different angle — not 4 variations of the same idea. Consider: the brand's conviction, the tension at its heart, what it gives people, what it refuses to be.

A tagline earns its place when:
- It couldn't be said by any other brand in this category
- It couldn't be said any other way (the words are inevitable)
- It does something: provokes, reveals, commits, challenges

Avoid:
- Questions ("Are you ready to...?")
- Commands without weight ("Do more.", "Live better.")
- Category descriptions ("The [adjective] [noun] for [audience]")
- Anything a bank, airline, or tech company could also use

DIRECTION_1: [Name] — [one sentence on the strategic angle this direction explores]
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

Short. No em dashes. No exclamation marks.`

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
        setDirections(dirs)
        setAllVariations(vars)
        setVisibleSet(vars)
        setRefineBatches([])
        save(dirs, vars, '')
        setPhase('selecting')
      },
    })
  }

  async function refineSelected() {
    if (selected.length === 0) return
    setRefining(true)

    const prompt = `${ctx}

The strategist has shortlisted these tagline candidates:
${selected.map((s, i) => `${i+1}. ${s}`).join('\n')}

Generate 3 refined variations that develop and sharpen these. Each one should be more committed than where you started — less hedged, more specific, more inevitable.

Push each one further: if it's a statement, make it bolder. If it's a claim, make it more specific. If it's poetic, make it sharper. Cut anything that could be removed without losing the meaning.

REFINED_1: [tagline]
REFINED_2: [tagline]
REFINED_3: [tagline]

No em dashes. No exclamation marks. Shorter is almost always better.`

    await stream({
      project, mode: 'strategist', module: 'Tagline', prompt, maxTokens: 200,
      onChunk: () => {},
      onComplete: (text) => {
        const refined = [1,2,3].map(n => text.match(new RegExp(`REFINED_${n}:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '').filter(Boolean)
        const selectedSnapshot = selected.slice() // capture before clearing
        setAllVariations(prev => {
          const next = [...prev, ...refined]
          save(directions, next, finalChosen)
          return next
        })
        // Visible list: selected originals at top, refined below — with divider at refined start
        const newVisible = [...selectedSnapshot, ...refined]
        setVisibleSet(newVisible)
        setRefineBatches([selectedSnapshot.length]) // divider after the selected originals
        setSelected([])
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
    save(directions, allVariations, t)
    setPhase('locked')
  }

  const hasDividerAt = (index: number) => refineBatches.includes(index)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-0)' }}>
      <Strip project={project} phase="Synthesis — Tagline" onAskProof={() => setDrawerOpen(true)} />
      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '72px 24px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 14 }}>Synthesis — 6 of 7</div>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 48, fontWeight: 300 }}>
            {phase === 'locked'
              ? 'Locked.'
              : selected.length > 0
              ? `${selected.length} selected — lock one or refine`
              : 'Select up to 3 to refine, or lock one directly.'}
          </p>
        </motion.div>

        {/* Loading */}
        {phase === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}
            </div>
            <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>proof. is finding the territory and writing the lines…</span>
          </div>
        )}

        {/* ── LOCKED ── */}
        {phase === 'locked' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {/* Locked card */}
            <div style={{
              background: 'var(--surface-1)',
              borderRadius: 14,
              border: '1px solid rgba(184,179,172,0.25)',
              borderLeft: '1.5px solid var(--mango)',
              padding: '28px 32px',
              marginBottom: 24,
              boxShadow: '0 1px 3px rgba(26,24,22,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
                <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mango)' }}>Locked</span>
              </div>
              <textarea
                value={finalChosen}
                onChange={e => { setFinalChosen(e.target.value); save(directions, allVariations, e.target.value) }}
                rows={Math.max(1, Math.ceil(finalChosen.length / 32))}
                style={{ width: '100%', background: 'transparent', border: 'none', padding: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: 32, fontStyle: 'italic', color: 'var(--dark)', outline: 'none', resize: 'none', lineHeight: 1.25 }}
              />
              <div style={{ height: 1, background: 'rgba(184,179,172,0.2)', margin: '16px 0' }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setPhase('selecting')}
                  style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--concrete)', background: 'none', border: '1px solid rgba(184,179,172,0.6)', borderRadius: 20, padding: '4px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--concrete)'; e.currentTarget.style.color = 'var(--dark)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(184,179,172,0.6)'; e.currentTarget.style.color = 'var(--concrete)' }}
                >
                  Back to candidates
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 32, borderTop: '1px solid rgba(213,212,214,0.4)' }}>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/tone`)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Tone
              </button>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/manifesto`)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: 'var(--dark)', color: '#FDFCFA', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--mango)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--dark)'}>
                Continue to Manifesto →
              </button>
            </div>
          </motion.div>
        )}

        {/* ── SELECTING ── */}
        {phase === 'selecting' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Strategic directions — compact reference */}
            {directions.length > 0 && (
              <div style={{ marginBottom: 40, padding: '16px 20px', background: 'var(--surface-0)', borderRadius: 10, border: '1px solid rgba(184,179,172,0.25)' }}>
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 12 }}>Strategic directions</div>
                {directions.map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < directions.length - 1 ? 8 : 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 500, flexShrink: 0, width: 14 }}>{i+1}.</span>
                    <span style={{ fontSize: 13, color: 'var(--concrete)', fontWeight: 300, lineHeight: 1.55 }}>{d}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Refining loader */}
            {refining && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0,1,2].map(i => <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}
                </div>
                <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>proof. is sharpening the selection…</span>
              </div>
            )}

            {/* Unified list — originals + all refined batches */}
            {!refining && visibleSet.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 32 }}>
                {visibleSet.map((v, i) => {
                  const isSelected = selected.includes(v)
                  const isBatchStart = hasDividerAt(i)

                  return (
                    <div key={i}>
                      {/* Divider between initial and refined batches */}
                      {isBatchStart && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 4px' }}>
                          <div style={{ flex: 1, height: 1, background: 'rgba(194,189,183,0.4)' }} />
                          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--stone)' }}>Refined</span>
                          <div style={{ flex: 1, height: 1, background: 'rgba(194,189,183,0.4)' }} />
                        </div>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '14px 18px', borderRadius: 8,
                          background: isSelected ? 'var(--surface-1)' : 'transparent',
                          border: isSelected ? '1px solid rgba(255,161,10,0.3)' : '1px solid transparent',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onClick={() => toggleSelect(v)}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-1)' }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                      >
                        <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--dark)', flex: 1 }}>{v}</span>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                          {isSelected && (
                            <button
                              onClick={e => { e.stopPropagation(); lockTagline(v) }}
                              style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: '#FDFCFA', background: 'var(--dark)', border: 'none', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', transition: 'background 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--mango)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'var(--dark)'}
                            >
                              Lock →
                            </button>
                          )}
                          <div style={{
                            width: 18, height: 18, borderRadius: '50%',
                            border: `1.5px solid ${isSelected ? 'var(--mango)' : 'rgba(184,179,172,0.5)'}`,
                            background: isSelected ? 'var(--mango)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s', flexShrink: 0,
                          }}>
                            {isSelected && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="#FDFCFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Actions */}
            {!refining && visibleSet.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, borderTop: '1px solid rgba(213,212,214,0.4)' }}>
                <button onClick={() => router.push(`/project/${project.id}/synthesis/tone`)}
                  style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ← Tone
                </button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <ProofButton onClick={generate} size="sm">Regenerate</ProofButton>
                  {selected.length >= 1 && (
                    <ProofButton onClick={refineSelected} variant="solid" size="md" style={{ borderRadius: 5 }}>
                      Refine {selected.length === 1 ? 'this' : `these ${selected.length}`} →
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
