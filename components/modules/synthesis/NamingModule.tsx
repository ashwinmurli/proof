'use client'
import { langInstruction, useLang } from '@/lib/i18n'

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

interface Candidate {
  name: string
  type: string
  logic: string
}

export default function NamingModule({ project }: { project: Project }) {
  const router = useRouter()
  const t = useLang(project)
  const { updateProject } = useProofStore()
  const { stream } = useProofStream()

  const existing = project.synthesis?.naming
  const [territory, setTerritory] = useState(existing?.territory || '')
  // allCandidates: initial 12 + all refined batches
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([])
  // visibleSet: what's rendered — starts as all 12, after refine = selected+refined
  const [visibleSet, setVisibleSet] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Candidate[]>([])
  const [chosen, setChosen] = useState(existing?.chosen || '')
  const [rationale, setRationale] = useState(existing?.rationale || '')
  const [phase, setPhase] = useState<'loading' | 'selecting' | 'locked'>(
    existing?.chosen ? 'locked' : existing?.territory ? 'selecting' : 'loading'
  )
  const [generating, setGenerating] = useState(false)
  const [refining, setRefining] = useState(false)
  const [refineBatches, setRefineBatches] = useState<number[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Restore from persisted data
  useEffect(() => {
    if (existing?.candidates?.length && existing.territory) {
      const parsed = parseCandidates(existing.candidates)
      setAllCandidates(parsed)
      setVisibleSet(parsed)
    }
  }, [])

  const ctx = buildSynthesisContext(project)

  function parseCandidates(raw: string[]): Candidate[] {
    return raw.map(r => {
      const parts = r.split('|||')
      return { name: parts[0] || '', type: parts[1] || '', logic: parts[2] || '' }
    }).filter(c => c.name)
  }

  function save(t = territory, c: Candidate[] = allCandidates, ch = chosen, r = rationale) {
    updateProject(project.id, {
      synthesis: {
        ...project.synthesis,
        naming: {
          territory: t,
          candidates: c.map(cd => `${cd.name}|||${cd.type}|||${cd.logic}`),
          chosen: ch,
          rationale: r,
        }
      }
    })
  }

  async function generate() {
    setGenerating(true)
    setPhase('loading')
    setAllCandidates([])
    setVisibleSet([])
    setSelected([])
    setRefineBatches([])

    const lang = project.language || "en"
    const prompt = `${langInstruction(lang)}${ctx}

You are helping name a brand. Based on everything above, do the following:

TERRITORY: Write a single paragraph (2-3 sentences) defining the naming territory. What is the emotional and strategic space this name needs to occupy? What should it feel like? What should it never feel like?

Then generate exactly 12 name candidates across different naming types. Each candidate gets:
- The name itself (1-2 words maximum, usually 1)
- Its type (one of: Evocative, Invented, Experiential, Metaphor, Suggestive, Facet)
- One sentence of logic: the specific thread in this brand that this name pulls on.

What makes a name earn its place:
- It is traceable to something real in the brief — a tension, a conviction, a specific observation
- A competitor in this category would not immediately claim it
- It has depth: you can see more in it the longer you look
- It does not explain the brand — it opens a door to it

What to avoid:
- Generic startup suffixes (-ly, -io, -ify, -hub)
- Names that merely describe the category
- Names so abstract they could mean anything to anyone

Format exactly:

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
        const t = text.match(/TERRITORY:\s*([\s\S]+?)(?=NAME_1:|$)/i)?.[1]?.trim() || ''
        const parsed: Candidate[] = []
        for (let i = 1; i <= 12; i++) {
          const name = text.match(new RegExp(`NAME_${i}:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim()
          const type = text.match(new RegExp(`TYPE_${i}:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim()
          const logic = text.match(new RegExp(`LOGIC_${i}:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim()
          if (name) parsed.push({ name, type: type || 'Evocative', logic: logic || '' })
        }
        setTerritory(t)
        setAllCandidates(parsed)
        setVisibleSet(parsed)
        save(t, parsed, '', '')
        setGenerating(false)
        setPhase('selecting')
      },
    })
  }

  useEffect(() => {
    if (phase === 'loading' && !generating) generate()
  }, [])

  async function refineSelected() {
    if (selected.length === 0) return
    setRefining(true)

    const prompt = `${ctx}

The strategist has shortlisted these name candidates:
${selected.map((c, i) => `${i+1}. ${c.name} (${c.type}) — ${c.logic}`).join('\n')}

Generate 3 refined name candidates that develop and sharpen the thinking behind these. Each should be more committed — more specific, more inevitable, more traceable to this brand's actual character.

Push further: if a name is evocative, find the more precise image. If it's invented, make it more distinctive. Each must earn its place.

REFINED_1_NAME: [name]
REFINED_1_TYPE: [type]
REFINED_1_LOGIC: [one sentence — the specific thread in this brand this name pulls on]

REFINED_2_NAME: [name]
REFINED_2_TYPE: [type]
REFINED_2_LOGIC: [one sentence]

REFINED_3_NAME: [name]
REFINED_3_TYPE: [type]
REFINED_3_LOGIC: [one sentence]`

    await stream({
      project, mode: 'strategist', module: 'Naming', prompt, maxTokens: 300,
      onChunk: () => {},
      onComplete: (text) => {
        const refined: Candidate[] = [1,2,3].map(n => ({
          name: text.match(new RegExp(`REFINED_${n}_NAME:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '',
          type: text.match(new RegExp(`REFINED_${n}_TYPE:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || 'Evocative',
          logic: text.match(new RegExp(`REFINED_${n}_LOGIC:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '',
        })).filter(c => c.name)

        const selectedSnapshot = selected.slice()
        setAllCandidates(prev => {
          const next = [...prev, ...refined]
          save(territory, next, chosen, rationale)
          return next
        })
        const newVisible = [...selectedSnapshot, ...refined]
        setVisibleSet(newVisible)
        setRefineBatches([selectedSnapshot.length])
        setSelected([])
        setRefining(false)
      },
    })
  }

  function toggleSelect(c: Candidate) {
    setSelected(prev => {
      if (prev.some(s => s.name === c.name)) return prev.filter(s => s.name !== c.name)
      if (prev.length >= 3) return prev
      return [...prev, c]
    })
  }

  function lockName(c: Candidate) {
    setChosen(c.name)
    setRationale(c.logic)
    save(territory, allCandidates, c.name, c.logic)
    setPhase('locked')
  }

  function lockCustom() {
    save(territory, allCandidates, chosen, rationale)
    setPhase('locked')
  }

  const hasDividerAt = (index: number) => refineBatches.includes(index)

  const typeColors: Record<string, string> = {
    Evocative: '#8B7355', Invented: '#5B7A6E', Experiential: '#7A5B8B',
    Metaphor: '#6B7A8B', Suggestive: '#8B6B5B', Facet: '#6B8B7A',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-0)' }}>
      <Strip project={project} phase="Synthesis — Naming" onAskProof={() => setDrawerOpen(true)} />

      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '72px 24px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 14 }}>
            {t('naming.phase')}
          </div>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 48, fontWeight: 300 }}>
            {phase === 'locked'
              ? t('action.locked')
              : selected.length > 0
              ? `${selected.length} selected — lock one or refine`
              : t('naming.select_refine')}
          </p>
        </motion.div>

        {/* Loading */}
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

        {/* ── LOCKED ── */}
        {phase === 'locked' && !generating && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
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
                <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mango)' }}>{t('action.locked')}</span>
              </div>
              <input
                value={chosen}
                onChange={e => { setChosen(e.target.value); save(territory, allCandidates, e.target.value, rationale) }}
                style={{ width: '100%', background: 'transparent', border: 'none', padding: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: 40, fontStyle: 'italic', color: 'var(--dark)', outline: 'none' }}
              />
              {rationale && (
                <p style={{ fontSize: 14, color: 'var(--concrete)', fontWeight: 300, lineHeight: 1.75, margin: '10px 0 0' }}>
                  {rationale}
                </p>
              )}
              <div style={{ height: 1, background: 'rgba(184,179,172,0.2)', margin: '18px 0 14px' }} />
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
              <button onClick={() => router.push(`/project/${project.id}/synthesis/tagline`)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: 'var(--dark)', color: '#FDFCFA', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--mango)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--dark)'}>
                {t('synthesis.continue_tagline')}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── SELECTING ── */}
        {phase === 'selecting' && !generating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Territory */}
            {territory && (
              <div style={{ marginBottom: 40, padding: '20px 24px', background: 'var(--surface-0)', borderRadius: 10, border: '1px solid rgba(184,179,172,0.25)' }}>
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
                  Naming territory
                </div>
                <p style={{ fontSize: 14, color: 'var(--concrete)', fontWeight: 300, lineHeight: 1.75, margin: 0 }}>
                  {territory}
                </p>
              </div>
            )}

            {/* Refining loader */}
            {refining && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0,1,2].map(i => <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}
                </div>
                <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>proof. is developing the selection…</span>
              </div>
            )}

            {/* Unified candidate list */}
            {!refining && visibleSet.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 32 }}>
                {visibleSet.map((c, i) => {
                  const isSelected = selected.some(s => s.name === c.name)
                  const isBatchStart = hasDividerAt(i)
                  const typeColor = typeColors[c.type] || 'var(--stone)'

                  return (
                    <div key={`${c.name}-${i}`}>
                      {isBatchStart && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 4px' }}>
                          <div style={{ flex: 1, height: 1, background: 'rgba(194,189,183,0.4)' }} />
                          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--stone)' }}>t('naming.refined')</span>
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
                        onClick={() => toggleSelect(c)}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-1)' }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 24, color: 'var(--dark)', lineHeight: 1.2 }}>
                              {c.name}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: typeColor }}>
                              {c.type}
                            </span>
                          </div>
                          {c.logic && (
                            <p style={{ fontSize: 13, color: 'var(--concrete)', fontWeight: 300, lineHeight: 1.6, margin: '4px 0 0' }}>
                              {c.logic}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                          {isSelected && (
                            <button
                              onClick={e => { e.stopPropagation(); lockName(c) }}
                              style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: '#FDFCFA', background: 'var(--dark)', border: 'none', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', transition: 'background 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--mango)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'var(--dark)'}
                            >
                              {t('action.lock')}
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

            {/* Custom name */}
            <div style={{ marginBottom: 40, paddingTop: 24, borderTop: '1px solid rgba(213,212,214,0.35)' }}>
              <div style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 300, marginBottom: 10 }}>Have one in mind?</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  value={chosen}
                  onChange={e => setChosen(e.target.value)}
                  placeholder="Write a name"
                  style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(184,179,172,0.5)', padding: '8px 0', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--dark)', outline: 'none' }}
                  onKeyDown={e => e.key === 'Enter' && chosen.trim() && lockCustom()}
                />
                {chosen.trim() && (
                  <button onClick={lockCustom}
                    style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: '#FDFCFA', background: 'var(--dark)', border: 'none', borderRadius: 20, padding: '5px 14px', cursor: 'pointer', flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--mango)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--dark)'}>
                    Lock →
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, borderTop: '1px solid rgba(213,212,214,0.35)' }}>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/tone`)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Tone
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <ProofButton onClick={generate} size="sm">Regenerate</ProofButton>
                {selected.length >= 1 && !refining && (
                  <ProofButton onClick={refineSelected} variant="solid" size="md" style={{ borderRadius: 5 }}>
                    Refine {selected.length === 1 ? 'this' : `these ${selected.length}`} →
                  </ProofButton>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <ProofDrawer project={project} mode="strategist" module="Naming"
        open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <style>{`input::placeholder { color: var(--stone); font-style: italic; }`}</style>
    </div>
  )
}
