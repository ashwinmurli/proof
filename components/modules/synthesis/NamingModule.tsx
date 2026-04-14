'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { useProofStore } from '@/store'
import { useProofStream } from '@/lib/useProofStream'
import { buildSynthesisContext } from '@/lib/synthesisContext'
import Strip from '@/components/proof/Strip'
import ProofDrawer from '@/components/proof/ProofDrawer'
import ProofButton from '@/components/proof/ProofButton'

interface Candidate {
  name: string
  type: string   // e.g. Evocative, Invented, Experiential
  logic: string  // one-sentence rationale
}

export default function NamingModule({ project }: { project: Project }) {
  const router = useRouter()
  const { updateProject } = useProofStore()
  const { stream } = useProofStream()

  const existing = project.synthesis?.naming
  const [territory, setTerritory] = useState(existing?.territory || '')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [chosen, setChosen] = useState(existing?.chosen || '')
  const [rationale, setRationale] = useState(existing?.rationale || '')
  const [phase, setPhase] = useState<'loading' | 'selecting' | 'locked'>(
    existing?.chosen ? 'locked' : existing?.territory ? 'selecting' : 'loading'
  )
  const [generating, setGenerating] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [editingLocked, setEditingLocked] = useState(false)

  // Restore candidates from naming data
  useEffect(() => {
    if (existing?.candidates?.length && existing.territory) {
      const parsed = parseCandidatesFromRaw(existing.candidates)
      setCandidates(parsed)
    }
  }, [])

  const ctx = buildSynthesisContext(project)

  function save(t = territory, c: Candidate[] = candidates, ch = chosen, r = rationale) {
    // Store candidates as serialised strings for persistence
    const serialised = c.map(cd => `${cd.name}|||${cd.type}|||${cd.logic}`)
    updateProject(project.id, {
      synthesis: {
        ...project.synthesis,
        naming: { territory: t, candidates: serialised, chosen: ch, rationale: r }
      }
    })
  }

  function parseCandidatesFromRaw(raw: string[]): Candidate[] {
    return raw.map(r => {
      const parts = r.split('|||')
      return { name: parts[0] || '', type: parts[1] || '', logic: parts[2] || '' }
    }).filter(c => c.name)
  }

  async function generate() {
    setGenerating(true)
    setPhase('loading')
    setCandidates([])

    const prompt = `${ctx}

You are helping name a brand. Based on everything above, do the following:

TERRITORY: Write a single paragraph (2–3 sentences) defining the naming territory. What is the emotional and strategic space this name needs to occupy? What should it feel like? What should it never feel like?

Then generate exactly 12 name candidates across different naming types. Each candidate gets:
- The name itself
- Its type (one of: Evocative, Invented, Experiential, Metaphor, Suggestive, Facet)
- One sentence of logic: why this name earns its place for this specific brand.

The names should be surprising, specific, and traceable to something real in the brand. No generic startup names. No appending "-ly" or "-io" to random words. No names that a competitor would immediately also want.

Format exactly like this:

TERRITORY: [paragraph]

NAME_1: [name]
TYPE_1: [type]
LOGIC_1: [one sentence]

NAME_2: [name]
TYPE_2: [type]
LOGIC_2: [one sentence]

NAME_3: [name]
TYPE_3: [type]
LOGIC_3: [one sentence]

NAME_4: [name]
TYPE_4: [type]
LOGIC_4: [one sentence]

NAME_5: [name]
TYPE_5: [type]
LOGIC_5: [one sentence]

NAME_6: [name]
TYPE_6: [type]
LOGIC_6: [one sentence]

NAME_7: [name]
TYPE_7: [type]
LOGIC_7: [one sentence]

NAME_8: [name]
TYPE_8: [type]
LOGIC_8: [one sentence]

NAME_9: [name]
TYPE_9: [type]
LOGIC_9: [one sentence]

NAME_10: [name]
TYPE_10: [type]
LOGIC_10: [one sentence]

NAME_11: [name]
TYPE_11: [type]
LOGIC_11: [one sentence]

NAME_12: [name]
TYPE_12: [type]
LOGIC_12: [one sentence]`

    await stream({
      project, mode: 'strategist', module: 'Naming', prompt, maxTokens: 1000,
      onChunk: () => {},
      onComplete: (text) => {
        // Parse territory
        const territoryMatch = text.match(/TERRITORY:\s*([\s\S]+?)(?=NAME_1:|$)/i)
        const t = territoryMatch?.[1]?.trim() || ''

        // Parse candidates
        const parsed: Candidate[] = []
        for (let i = 1; i <= 12; i++) {
          const name = text.match(new RegExp(`NAME_${i}:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim()
          const type = text.match(new RegExp(`TYPE_${i}:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim()
          const logic = text.match(new RegExp(`LOGIC_${i}:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim()
          if (name) parsed.push({ name, type: type || 'Evocative', logic: logic || '' })
        }

        setTerritory(t)
        setCandidates(parsed)
        save(t, parsed, '', '')
        setGenerating(false)
        setPhase('selecting')
      },
    })
  }

  useEffect(() => {
    if (phase === 'loading' && !generating) generate()
  }, [])

  function lockName(c: Candidate) {
    setChosen(c.name)
    setRationale(c.logic)
    save(territory, candidates, c.name, c.logic)
    setPhase('locked')
    setEditingLocked(false)
  }

  function handleCustomLock() {
    save(territory, candidates, chosen, rationale)
    setPhase('locked')
    setEditingLocked(false)
  }

  const typeColors: Record<string, string> = {
    Evocative:    '#8B7355',
    Invented:     '#5B7A6E',
    Experiential: '#7A5B8B',
    Metaphor:     '#6B7A8B',
    Suggestive:   '#8B6B5B',
    Facet:        '#6B8B7A',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F2EB' }}>
      <Strip project={project} phase="Synthesis — Naming" onAskProof={() => setDrawerOpen(true)} />

      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '80px 24px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>

          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>
            Synthesis — 5 of 7
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.06, letterSpacing: '-0.015em', marginBottom: 20 }}>
            {phase === 'locked' ? chosen || 'Named.' : 'What are we called.'}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 48, fontWeight: 300 }}>
            {phase === 'locked'
              ? 'The name is set. You can still swap it out.'
              : phase === 'selecting'
              ? 'proof. has mapped the territory and generated candidates. Lock one, or write your own.'
              : 'A name earns its place when it couldn\'t have come from anywhere else.'}
          </p>
        </motion.div>

        {/* Loading state */}
        {(phase === 'loading' || generating) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => (
                <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }}
                  animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }} />
              ))}
            </div>
            <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
              proof. is finding the territory and writing the candidates…
            </span>
          </div>
        )}

        {/* Locked state */}
        {phase === 'locked' && !generating && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {/* Locked name */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mango)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
                Locked
              </div>
              {editingLocked ? (
                <>
                  <input
                    value={chosen}
                    onChange={e => setChosen(e.target.value)}
                    autoFocus
                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(110,107,104,0.3)', padding: '8px 0 16px', fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--dark)', outline: 'none', marginBottom: 16 }}
                    placeholder="The name"
                  />
                  <textarea
                    value={rationale}
                    onChange={e => setRationale(e.target.value)}
                    rows={2}
                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(110,107,104,0.2)', padding: '0 0 12px', fontSize: 14, color: 'var(--concrete)', outline: 'none', resize: 'none', fontFamily: 'var(--font-sans)', fontWeight: 300, lineHeight: 1.7 }}
                    placeholder="Why this name."
                  />
                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button onClick={handleCustomLock} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, background: 'var(--dark)', color: '#FDFCFA', border: 'none', borderRadius: 5, padding: '8px 16px', cursor: 'pointer' }}>
                      Done
                    </button>
                    <button onClick={() => setEditingLocked(false)} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontStyle: 'italic', color: 'var(--dark)', marginBottom: 12, lineHeight: 1.1 }}>
                    {chosen}
                  </div>
                  {rationale && (
                    <p style={{ fontSize: 14, color: 'var(--concrete)', fontWeight: 300, lineHeight: 1.75, maxWidth: 460, marginBottom: 16 }}>
                      {rationale}
                    </p>
                  )}
                  <button onClick={() => setEditingLocked(true)} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Edit
                  </button>
                </>
              )}
            </div>

            <button onClick={() => setPhase('selecting')} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 48 }}>
              Back to candidates
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 32, borderTop: '1px solid rgba(213,212,214,0.4)' }}>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/tone`)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Tone
              </button>
              <button
                onClick={() => router.push(`/project/${project.id}/synthesis/tagline`)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: 'var(--dark)', color: '#FDFCFA', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--mango)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--dark)'}>
                Continue to Tagline →
              </button>
            </div>
          </motion.div>
        )}

        {/* Selecting state */}
        {phase === 'selecting' && !generating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Territory */}
            {territory && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                style={{ marginBottom: 40, padding: '20px 24px', background: '#EDE9E2', borderRadius: 10, border: '1px solid rgba(184,179,172,0.2)' }}>
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
                  Naming territory
                </div>
                <p style={{ fontSize: 14, color: 'var(--concrete)', fontWeight: 300, lineHeight: 1.75, margin: 0 }}>
                  {territory}
                </p>
              </motion.div>
            )}

            {/* Candidates */}
            {candidates.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {candidates.map((c, i) => {
                    const isHovered = hoveredIdx === i
                    const typeColor = typeColors[c.type] || 'var(--stone)'
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onMouseEnter={() => setHoveredIdx(i)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        style={{
                          padding: '16px 18px',
                          borderRadius: 8,
                          background: isHovered ? '#FAF8F4' : 'transparent',
                          border: isHovered ? '1px solid rgba(255,161,10,0.2)' : '1px solid transparent',
                          cursor: 'default',
                          transition: 'all 0.15s',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: isHovered && c.logic ? 8 : 0 }}>
                              <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 24, color: 'var(--dark)', lineHeight: 1.2 }}>
                                {c.name}
                              </span>
                              <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: typeColor, flexShrink: 0 }}>
                                {c.type}
                              </span>
                            </div>
                            <AnimatePresence>
                              {isHovered && c.logic && (
                                <motion.p
                                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                  animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  style={{ fontSize: 13, color: 'var(--concrete)', fontWeight: 300, lineHeight: 1.65, margin: 0, overflow: 'hidden' }}>
                                  {c.logic}
                                </motion.p>
                              )}
                            </AnimatePresence>
                          </div>

                          <AnimatePresence>
                            {isHovered && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => lockName(c)}
                                style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: '#FDFCFA', background: 'var(--dark)', border: 'none', borderRadius: 20, padding: '5px 14px', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--mango)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'var(--dark)'}>
                                Lock →
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Custom name input */}
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              style={{ marginBottom: 40, paddingTop: 24, borderTop: '1px solid rgba(213,212,214,0.4)' }}>
              <div style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 300, marginBottom: 12 }}>
                Have one in mind?
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  value={chosen}
                  onChange={e => setChosen(e.target.value)}
                  placeholder="Write a name"
                  style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(184,179,172,0.5)', padding: '8px 0', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--dark)', outline: 'none' }}
                  onKeyDown={e => e.key === 'Enter' && chosen.trim() && handleCustomLock()}
                />
                {chosen.trim() && (
                  <button onClick={handleCustomLock}
                    style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: '#FDFCFA', background: 'var(--dark)', border: 'none', borderRadius: 20, padding: '5px 14px', cursor: 'pointer', flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--mango)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--dark)'}>
                    Lock →
                  </button>
                )}
              </div>
            </motion.div>

            {/* Footer actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, borderTop: '1px solid rgba(213,212,214,0.4)' }}>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/tone`)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Tone
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <ProofButton onClick={generate} size="sm">Regenerate</ProofButton>
                <button
                  onClick={() => router.push(`/project/${project.id}/synthesis/tagline`)}
                  style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: 'transparent', color: 'var(--stone)', border: '1px solid rgba(184,179,172,0.5)', borderRadius: 5, padding: '10px 20px', cursor: 'pointer' }}>
                  Skip →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <ProofDrawer project={project} mode="strategist" module="Naming"
        open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <style>{`input::placeholder, textarea::placeholder { color: var(--stone); }`}</style>
    </div>
  )
}
