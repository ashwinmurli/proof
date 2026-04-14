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

export default function ToneModule({ project }: { project: Project }) {
  const router = useRouter()
  const { updateProject } = useProofStore()
  const { stream } = useProofStream()

  const existing = project.synthesis?.tone
  const [poleA, setPoleA] = useState(existing?.poleA || '')
  const [poleB, setPoleB] = useState(existing?.poleB || '')
  const [doesSound, setDoesSound] = useState(existing?.doesSoundLike || '')
  const [doesntSound, setDoesntSound] = useState(existing?.doesntSoundLike || '')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(!!existing?.poleA)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [summaryState, setSummaryState] = useState<'thinking' | 'arrived' | null>(null)
  const [summaryText, setSummaryText] = useState('')

  const ctx = buildSynthesisContext(project)
  const allFilled = poleA.trim() && poleB.trim() && doesSound.trim() && doesntSound.trim()
  const isSummaryActive = summaryState === 'thinking' || summaryState === 'arrived'

  useEffect(() => { if (!generated) generate() }, [])

  function save(a = poleA, b = poleB, ds = doesSound, dns = doesntSound) {
    updateProject(project.id, { synthesis: { ...project.synthesis, tone: { poleA: a, poleB: b, doesSoundLike: ds, doesntSoundLike: dns } } })
  }

  async function generate() {
    setGenerating(true)
    const prompt = `${ctx}

Define the tone of voice for this brand.

Write exactly:
POLE_A: [One end of the spectrum — e.g. "Direct and unambiguous"]
POLE_B: [Other end — e.g. "Warm and unhurried"]
DOES_SOUND: [Write 2-3 actual sentences that sound like this brand. Not descriptions — real sentences in the brand's voice.]
DOESNT_SOUND: [Write 2-3 sentences that sound like the wrong version of this brand — the generic category voice it must avoid.]

No em dashes. The examples should be specific enough that a copywriter knows immediately.`

    await stream({
      project, mode: 'strategist', module: 'Tone', prompt, maxTokens: 500,
      onChunk: () => {},
      onComplete: (text) => {
        const a = text.match(/POLE_A:\s*(.+?)(?=\n|$)/)?.[1]?.trim() || ''
        const b = text.match(/POLE_B:\s*(.+?)(?=\n|$)/)?.[1]?.trim() || ''
        const ds = text.match(/DOES_SOUND:\s*(.+?)(?=\nDOESNT_SOUND:|$)/s)?.[1]?.trim() || ''
        const dns = text.match(/DOESNT_SOUND:\s*(.+?)$/s)?.[1]?.trim() || ''
        setPoleA(a); setPoleB(b); setDoesSound(ds); setDoesntSound(dns)
        save(a, b, ds, dns)
        setGenerating(false); setGenerated(true)
      },
    })
  }

  async function fetchSummary() {
    setSummaryState('thinking'); setDrawerOpen(true)
    const prompt = `${ctx}

Tone of voice:
Spectrum: from "${poleA}" to "${poleB}"
Sounds like: ${doesSound}
Doesn't sound like: ${doesntSound}

In 2 sentences: is this spectrum specific enough to guide copy decisions? Does the example sentence actually sound different from the category? No em dashes.`

    await stream({
      project, mode: 'strategist', module: 'Tone', prompt, maxTokens: 180,
      onChunk: () => {},
      onComplete: (text) => { setSummaryText(text); setSummaryState('arrived') },
    })
  }

  const handleAdvance = useCallback(() => {
    if (!allFilled) { setDrawerOpen(true); return }
    if (!summaryState) { fetchSummary(); return }
    // Skip naming if brand already has a name
    const hasName = project.name && project.name !== 'Untitled project'
    router.push(`/project/${project.id}/synthesis/${hasName ? 'tagline' : 'naming'}`)
  }, [allFilled, summaryState, project.id, project.name, router])

  const ta = { width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(213,212,214,0.4)', padding: '6px 0 12px', fontFamily: 'var(--font-sans)' as const, fontSize: 15, fontWeight: 300 as const, color: 'var(--dark)', outline: 'none', resize: 'none' as const, lineHeight: 1.8, minHeight: 80 }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F2EB' }}>
      <Strip project={project} phase="Synthesis — Tone" onAskProof={() => { setSummaryState(null); setDrawerOpen(true) }} />
      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '80px 24px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>Synthesis — 4 of 7</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.06, letterSpacing: '-0.015em', marginBottom: 20 }}>How we speak.</h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 56, fontWeight: 300 }}>
            Not rules — a spectrum. The poles define the range. The examples make it real. Not "warm but professional" — actual sentences.
          </p>
        </motion.div>

        <AnimatePresence>
          {generating && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0,1,2].map(i => <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}
              </div>
              <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>proof. is finding the brand's voice…</span>
            </motion.div>
          )}
        </AnimatePresence>

        {generated && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Spectrum */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 20 }}>The spectrum</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 12, alignItems: 'center' }}>
                <input value={poleA} onChange={e => { setPoleA(e.target.value); save(e.target.value, poleB, doesSound, doesntSound) }}
                  placeholder="One end" style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(213,212,214,0.4)', padding: '6px 0 10px', fontFamily: 'var(--font-display)', fontSize: 18, fontStyle: 'italic', color: 'var(--dark)', outline: 'none' }} />
                <div style={{ textAlign: 'center', color: 'var(--stone)', fontSize: 13 }}>↔</div>
                <input value={poleB} onChange={e => { setPoleB(e.target.value); save(poleA, e.target.value, doesSound, doesntSound) }}
                  placeholder="Other end" style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(213,212,214,0.4)', padding: '6px 0 10px', fontFamily: 'var(--font-display)', fontSize: 18, fontStyle: 'italic', color: 'var(--dark)', outline: 'none', textAlign: 'right' }} />
              </div>
            </div>

            {/* Examples */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 10 }}>This sounds like us</div>
              <textarea value={doesSound} onChange={e => { setDoesSound(e.target.value); save(poleA, poleB, e.target.value, doesntSound) }} placeholder="Write actual sentences in the brand's voice." style={ta} />
            </div>

            <div style={{ marginBottom: 48 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 10 }}>This doesn't sound like us</div>
              <textarea value={doesntSound} onChange={e => { setDoesntSound(e.target.value); save(poleA, poleB, doesSound, e.target.value) }} placeholder="Write the generic category voice this brand must avoid." style={ta} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32, borderTop: '1px solid rgba(213,212,214,0.4)' }}>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/personality`)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>← Personality</button>
              <button onClick={handleAdvance} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: allFilled ? 'var(--dark)' : '#D5D4D6', color: allFilled ? '#FDFCFA' : '#8C8780', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: allFilled ? 'pointer' : 'default', transition: 'all 0.2s' }}
                onMouseEnter={e => { if (allFilled) (e.currentTarget.style.background = 'var(--mango)') }}
                onMouseLeave={e => { if (allFilled) (e.currentTarget.style.background = 'var(--dark)') }}>
                Continue →
              </button>
            </div>
          </motion.div>
        )}
      </main>

      <ProofDrawer project={project} mode="strategist" module="Tone"
        open={drawerOpen || isSummaryActive} onClose={() => { setDrawerOpen(false); setSummaryState(null) }}
        summaryMode={isSummaryActive} summaryState={summaryState} summaryText={summaryText}
        summaryThinkingLabel="Listening to the voice…" summaryContinueLabel="Continue →"
        onContinue={handleAdvance} onReview={() => { setSummaryState(null); setDrawerOpen(false) }} />
      <style>{`textarea::placeholder { color: var(--stone); font-style: italic; } input::placeholder { color: var(--stone); }`}</style>
    </div>
  )
}
