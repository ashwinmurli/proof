'use client'
import { langInstruction, useLang } from '@/lib/i18n'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { useProofStore } from '@/store'
import { useProofStream } from '@/lib/useProofStream'
import { buildSynthesisContext } from '@/lib/synthesisContext'
import Strip from '@/components/proof/Strip'
import ProofDrawer from '@/components/proof/ProofDrawer'
import ProofButton from '@/components/proof/ProofButton'

export default function ToneModule({ project }: { project: Project }) {
  const router = useRouter()
  const t = useLang(project)
  const { updateProject } = useProofStore()
  const { stream } = useProofStream()

  const existing = project.synthesis?.tone
  const [poleA, setPoleA] = useState(existing?.poleA || '')
  const [poleB, setPoleB] = useState(existing?.poleB || '')
  const [poleOptions, setPoleOptions] = useState<{ a: string[]; b: string[] }>({ a: [], b: [] })
  const [doesSound, setDoesSound] = useState(existing?.doesSoundLike || '')
  const [doesntSound, setDoesntSound] = useState(existing?.doesntSoundLike || '')
  const [generating, setGenerating] = useState(false)
  const [generatingExamples, setGeneratingExamples] = useState(false)
  const [generated, setGenerated] = useState(!!existing?.poleA)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [summaryState, setSummaryState] = useState<'thinking' | 'arrived' | null>(null)
  const [summaryText, setSummaryText] = useState('')
  const summaryStateRef = useRef<'thinking' | 'arrived' | null>(null)
  useEffect(() => { summaryStateRef.current = summaryState }, [summaryState])

  const ctx = buildSynthesisContext(project)
  const allFilled = poleA.trim() && poleB.trim() && doesSound.trim() && doesntSound.trim()
  const isSummaryActive = summaryState === 'thinking' || summaryState === 'arrived'

  useEffect(() => {
    if (!generated) {
      generate()
    } else if (poleA && poleB && poleOptions.a.length === 0) {
      // Has existing poles but no options — regenerate options
      generateOptions()
    }
  }, [])

  // Regenerate examples when poles change (with debounce)
  const prevPolesRef = useRef({ a: poleA, b: poleB })
  useEffect(() => {
    if (!generated) return
    if (poleA === prevPolesRef.current.a && poleB === prevPolesRef.current.b) return
    prevPolesRef.current = { a: poleA, b: poleB }
    if (!poleA.trim() || !poleB.trim()) return
    const t = setTimeout(() => generateExamples(poleA, poleB), 800)
    return () => clearTimeout(t)
  }, [poleA, poleB])

  function save(a = poleA, b = poleB, ds = doesSound, dns = doesntSound) {
    updateProject(project.id, { synthesis: { ...project.synthesis, tone: { poleA: a, poleB: b, doesSoundLike: ds, doesntSoundLike: dns } } })
  }

  async function generateOptions() {
    // Just generate pole alternatives without regenerating examples
    const lang = project.language || "en"
    const prompt = `${langInstruction(lang)}${ctx}

The current tone spectrum is: "${poleA}" to "${poleB}"

Generate 2 alternatives for each pole:
POLE_A_1: [current: ${poleA}]
POLE_A_2: [alternative]
POLE_A_3: [another alternative]
POLE_B_1: [current: ${poleB}]
POLE_B_2: [alternative]
POLE_B_3: [another alternative]`

    await stream({
      project, mode: 'strategist', module: 'Tone', prompt, maxTokens: 200,
      onChunk: () => {},
      onComplete: (text) => {
        const stripMd = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').trim()
        const aOpts = [1,2,3].map(n => text.match(new RegExp(`POLE_A_${n}:\s*(.+?)(?=\n|$)`))?.[1]?.trim() || '').filter(Boolean).map(stripMd)
        const bOpts = [1,2,3].map(n => text.match(new RegExp(`POLE_B_${n}:\s*(.+?)(?=\n|$)`))?.[1]?.trim() || '').filter(Boolean).map(stripMd)
        setPoleOptions({ a: aOpts.length ? aOpts : [poleA], b: bOpts.length ? bOpts : [poleB] })
      },
    })
  }

  async function generate() {
    setGenerating(true)
    const prompt = `${ctx}

Define the tone of voice spectrum for this brand. Give 3 options for each pole so the strategist can choose.

POLE_A_1: [first option for left pole — 2-3 words]
POLE_A_2: [second option]
POLE_A_3: [third option]
POLE_B_1: [first option for right pole — 2-3 words]
POLE_B_2: [second option]
POLE_B_3: [third option]
CHOSEN_A: [which POLE_A option best fits — repeat the exact text]
CHOSEN_B: [which POLE_B option best fits — repeat the exact text]

No em dashes. Each option should be meaningfully different.`

    await stream({
      project, mode: 'strategist', module: 'Tone', prompt, maxTokens: 300,
      onChunk: () => {},
      onComplete: async (text) => {
        const stripMd = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').trim()
        const aOpts = [1,2,3].map(n => text.match(new RegExp(`POLE_A_${n}:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '').filter(Boolean).map(stripMd)
        const bOpts = [1,2,3].map(n => text.match(new RegExp(`POLE_B_${n}:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '').filter(Boolean).map(stripMd)
        const chosenA = stripMd(text.match(/CHOSEN_A:\s*(.+?)(?=\n|$)/)?.[1]?.trim() || aOpts[0] || '')
        const chosenB = stripMd(text.match(/CHOSEN_B:\s*(.+?)(?=\n|$)/)?.[1]?.trim() || bOpts[0] || '')
        setPoleOptions({ a: aOpts, b: bOpts })
        setPoleA(chosenA); setPoleB(chosenB)
        setGenerating(false); setGenerated(true)
        await generateExamples(chosenA, chosenB)
      },
    })
  }

  async function generateExamples(a: string, b: string) {
    if (!a || !b) return
    setGeneratingExamples(true)
    const prompt = `${ctx}

Tone spectrum: from "${a}" to "${b}"

Write 3-4 sentences that sound like this brand — use the full spectrum, not just one pole. Then write 3-4 sentences that sound like the generic category voice this brand must avoid.

DOES_SOUND: [3-4 sentences in the brand's actual voice]
DOESNT_SOUND: [3-4 sentences in the generic category voice to avoid]

Be specific. The examples should be immediately recognisable. No em dashes.`

    await stream({
      project, mode: 'strategist', module: 'Tone', prompt, maxTokens: 400,
      onChunk: () => {},
      onComplete: (text) => {
        const ds = text.match(/DOES_SOUND:\s*(.+?)(?=\nDOESNT_SOUND:|$)/s)?.[1]?.trim() || ''
        const dns = text.match(/DOESNT_SOUND:\s*(.+?)$/s)?.[1]?.trim() || ''
        setDoesSound(ds); setDoesntSound(dns)
        save(a, b, ds, dns)
        setGeneratingExamples(false)
      },
    })
  }

  async function fetchSummary() {
    setSummaryState('thinking'); setDrawerOpen(true)
    const fullCtx = `${ctx}\n\nTone spectrum: from "${poleA}" to "${poleB}"\nSounds like: ${doesSound}\nDoesn't sound like: ${doesntSound}`
    const prompt = `${fullCtx}\n\nIn 2 sentences: is this spectrum specific enough to guide copy decisions? Does the example actually sound different from the category? No em dashes.`
    await stream({
      project, mode: 'strategist', module: 'Tone', prompt, maxTokens: 180,
      onChunk: () => {},
      onComplete: (text) => { setSummaryText(text); setSummaryState('arrived') },
    })
  }

  const handleAdvance = useCallback(() => {
    if (!allFilled) { setDrawerOpen(true); return }
    if (!summaryStateRef.current) { fetchSummary(); return }
    // Go to Naming unless it's already been done
    const namingDone = !!(project.synthesis?.naming?.chosen || project.synthesis?.naming?.territory)
    router.push(`/project/${project.id}/synthesis/${namingDone ? 'tagline' : 'naming'}`)
  }, [allFilled, project.id, project.synthesis?.naming, router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-0)' }}>
      <Strip project={project} phase="Synthesis — Tone" onAskProof={() => { setSummaryState(null); setDrawerOpen(true) }} />
      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '72px 24px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 14 }}>{t('tone.phase')}</div>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 48, fontWeight: 300 }}>
            Not rules — a spectrum. proof. suggests two poles. Pick the ones that fit, or write your own. The examples update to match.
          </p>
        </motion.div>

        {generating && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}</div>
            <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>t('tone.generating')…</span>
          </div>
        )}

        {generated && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Spectrum selector */}
            <div style={{ marginBottom: 52 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 20 }}>The spectrum</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 32px 1fr', gap: 12, alignItems: 'start', marginBottom: 16 }}>
                {/* Pole A options */}
                <div>
                  {poleOptions.a.map((opt, i) => (
                    <div key={i} onClick={() => setPoleA(opt)}
                      style={{ padding: '10px 14px', marginBottom: 6, borderRadius: 8, cursor: 'pointer', border: poleA === opt ? '1px solid rgba(255,161,10,0.4)' : '1px solid rgba(184,179,172,0.3)', background: poleA === opt ? '#FAF8F4' : 'transparent', transition: 'all 0.15s' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, color: poleA === opt ? 'var(--dark)' : 'var(--concrete)' }}>{opt}</span>
                    </div>
                  ))}
                  <input value={poleA} onChange={e => setPoleA(e.target.value)} onBlur={() => save(poleA, poleB, doesSound, doesntSound)}
                    placeholder="Or write your own"
                    style={{ width: '100%', marginTop: 4, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(213,212,214,0.5)', padding: '6px 0', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--dark)', outline: 'none' }} />
                </div>

                <div style={{ textAlign: 'center', paddingTop: 12, color: 'var(--stone)', fontSize: 14 }}>↔</div>

                {/* Pole B options */}
                <div>
                  {poleOptions.b.map((opt, i) => (
                    <div key={i} onClick={() => setPoleB(opt)}
                      style={{ padding: '10px 14px', marginBottom: 6, borderRadius: 8, cursor: 'pointer', border: poleB === opt ? '1px solid rgba(255,161,10,0.4)' : '1px solid rgba(184,179,172,0.3)', background: poleB === opt ? '#FAF8F4' : 'transparent', transition: 'all 0.15s' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, color: poleB === opt ? 'var(--dark)' : 'var(--concrete)' }}>{opt}</span>
                    </div>
                  ))}
                  <input value={poleB} onChange={e => setPoleB(e.target.value)} onBlur={() => save(poleA, poleB, doesSound, doesntSound)}
                    placeholder="Or write your own"
                    style={{ width: '100%', marginTop: 4, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(213,212,214,0.5)', padding: '6px 0', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--dark)', outline: 'none' }} />
                </div>
              </div>
            </div>

            {/* Examples — update when poles change */}
            {generatingExamples ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
                <div style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <motion.div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}</div>
                <span style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 300 }}>Updating examples to match the spectrum…</span>
              </div>
            ) : (doesSound || doesntSound) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 12 }}>{t('tone.sounds_like')}</div>
                  <div style={{ padding: '20px 24px', background: '#FAF8F4', borderRadius: 10, border: '1px solid rgba(184,179,172,0.25)', borderLeft: '1.5px solid var(--mango)' }}>
                    <textarea value={doesSound} onChange={e => { setDoesSound(e.target.value); save(poleA, poleB, e.target.value, doesntSound) }}
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 300, color: 'var(--dark)', lineHeight: 1.8, minHeight: 80 }} />
                  </div>
                </div>
                <div style={{ marginBottom: 48 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 12 }}>{t('tone.not_sounds_like')}</div>
                  <div style={{ padding: '20px 24px', background: '#FAF8F4', borderRadius: 10, border: '1px solid rgba(184,179,172,0.25)' }}>
                    <textarea value={doesntSound} onChange={e => { setDoesntSound(e.target.value); save(poleA, poleB, doesSound, e.target.value) }}
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 300, color: 'var(--dark)', lineHeight: 1.8, minHeight: 80 }} />
                  </div>
                </div>
              </motion.div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32, borderTop: '1px solid rgba(213,212,214,0.4)' }}>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/personality`)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>← Personality</button>
              <button onClick={handleAdvance} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: allFilled ? 'var(--dark)' : '#D5D4D6', color: allFilled ? '#FDFCFA' : '#8C8780', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: allFilled ? 'pointer' : 'default', transition: 'all 0.2s' }}
                onMouseEnter={e => { if (allFilled) e.currentTarget.style.background = 'var(--mango)' }}
                onMouseLeave={e => { if (allFilled) e.currentTarget.style.background = 'var(--dark)' }}>
                t('synthesis.continue_naming')
              </button>
            </div>
          </motion.div>
        )}
      </main>

      <ProofDrawer project={project} mode="strategist" module="Tone"
        open={drawerOpen || isSummaryActive} onClose={() => { setDrawerOpen(false); setSummaryState(null) }}
        summaryMode={isSummaryActive} summaryState={summaryState} summaryText={summaryText}
        summaryThinkingLabel="Listening to the voice…" summaryContinueLabel="Continue →"
        summaryLabel="On the tone"
        onContinue={handleAdvance} onReview={() => { setSummaryState(null); setDrawerOpen(false) }} />
      <style>{`textarea::placeholder { color: var(--stone); } input::placeholder { color: var(--stone); }`}</style>
    </div>
  )
}
