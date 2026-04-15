'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Project } from '@/types'
import ProofButton from '@/components/proof/ProofButton'

interface StripProps {
  project: Project
  phase: string
  onAskProof: () => void
  thoughtCount?: number
  answeredCount?: number
  totalCount?: number
}

// All navigable stages in order — with a completion check
function getStages(project: Project) {
  const s = project.synthesis
  const answeredCount = Object.values(project.brief?.answers || {}).filter(a => a.value?.trim().length > 10).length

  return [
    // Discovery
    { label: 'Brief',              path: 'brief',            done: answeredCount >= 3,                                              group: 'Discovery' },
    { label: 'Debrief',            path: 'debrief',          done: !!(project.debrief?.situation),                                  group: 'Discovery' },
    { label: 'Discovery Summary',  path: 'discovery-summary',done: !!(project.discoverySummary),                                   group: 'Discovery' },
    // Synthesis
    { label: 'Beliefs',            path: 'synthesis/beliefs',    done: !!(s?.beliefs?.belief),       group: 'Synthesis' },
    { label: 'Values',             path: 'synthesis/values',     done: !!(s?.values?.[0]?.name),     group: 'Synthesis' },
    { label: 'Personality',        path: 'synthesis/personality',done: !!(s?.personality?.dinner),   group: 'Synthesis' },
    { label: 'Tone',               path: 'synthesis/tone',       done: !!(s?.tone?.poleA),           group: 'Synthesis' },
    { label: 'Naming',             path: 'synthesis/naming',     done: !!(s?.naming?.territory),     group: 'Synthesis' },
    { label: 'Tagline',            path: 'synthesis/tagline',    done: !!(s?.tagline?.variations?.length), group: 'Synthesis' },
    { label: 'Manifesto',          path: 'synthesis/manifesto',  done: !!(s?.manifesto?.final),      group: 'Synthesis' },
    // Output
    { label: 'Brand Home',         path: 'brand-home',           done: !!(s?.manifesto?.final),      group: 'Output' },
  ]
}

export default function Strip({
  project, phase, onAskProof,
  thoughtCount = 0, answeredCount = 0, totalCount,
}: StripProps) {
  const router = useRouter()
  const [navOpen, setNavOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!navOpen) return
    function handle(e: MouseEvent) {
      if (!navRef.current?.contains(e.target as Node)) setNavOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [navOpen])

  // Close on Escape
  useEffect(() => {
    if (!navOpen) return
    function handle(e: KeyboardEvent) { if (e.key === 'Escape') setNavOpen(false) }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [navOpen])

  const stages = getStages(project)
  const completedCount = stages.filter(s => s.done).length
  const groups = ['Discovery', 'Synthesis', 'Output']

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10, height: 52,
      background: 'var(--surface-0)',
      borderBottom: '1px solid rgba(184,179,172,0.3)',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '0 clamp(20px, 5vw, 44px)',
      flexShrink: 0,
    }}>
      {/* Left — wordmark → homepage */}
      <button
        onClick={() => router.push('/')}
        style={{
          fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300,
          letterSpacing: '0.15em', background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--dark)', padding: 0, justifySelf: 'start',
        }}
      >
        proof<span style={{ color: 'var(--mango)' }}>.</span>
      </button>

      {/* Centre — phase + clickable nav */}
      <div ref={navRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setNavOpen(v => !v)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
            borderRadius: 6,
          }}
        >
          <span style={{
            fontSize: 10, fontWeight: 500, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--stone)', lineHeight: 1,
          }}>
            {phase}
          </span>

          {/* Progress dashes — always shown, represent overall project completion */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {stages.map((s, i) => (
              <motion.div
                key={i}
                style={{ width: 14, height: 2, borderRadius: 1 }}
                animate={{ background: s.done ? 'var(--mango)' : 'rgba(184,179,172,0.35)' }}
                transition={{ duration: 0.4, delay: i * 0.02 }}
              />
            ))}
          </div>
        </button>

        {/* Nav popup */}
        <AnimatePresence>
          {navOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--surface-2)',
                border: '1px solid rgba(184,179,172,0.35)',
                borderRadius: 12,
                boxShadow: '0 4px 16px rgba(26,24,22,0.1), 0 1px 3px rgba(26,24,22,0.06)',
                padding: '8px 0',
                minWidth: 220,
                zIndex: 100,
              }}
            >
              {groups.map((group, gi) => {
                const groupStages = stages.filter(s => s.group === group)
                const anyDone = groupStages.some(s => s.done)
                if (!anyDone) return null

                return (
                  <div key={group}>
                    {gi > 0 && <div style={{ height: 1, background: 'rgba(184,179,172,0.25)', margin: '6px 0' }} />}
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--aluminum)', padding: '4px 16px 2px' }}>
                      {group}
                    </div>
                    {groupStages.filter(s => s.done).map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setNavOpen(false)
                          router.push(`/project/${project.id}/${s.path}`)
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          width: '100%', padding: '8px 16px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          textAlign: 'left', transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-0)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 400, color: 'var(--dark)' }}>
                          {s.label}
                        </span>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--mango)', flexShrink: 0, display: 'inline-block' }} />
                      </button>
                    ))}
                  </div>
                )
              })}

              {completedCount === 0 && (
                <div style={{ padding: '10px 16px', fontSize: 13, color: 'var(--stone)', fontWeight: 300 }}>
                  Nothing completed yet.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right — proof. button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifySelf: 'end' }}>
        <AnimatePresence mode="wait">
          {thoughtCount > 0 ? (
            <motion.div key="notes" initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 4 }} transition={{ duration: 0.18 }}>
              <ProofButton onClick={onAskProof} pulsing>{thoughtCount} {thoughtCount === 1 ? 'note' : 'notes'}</ProofButton>
            </motion.div>
          ) : (
            <motion.div key="ask" initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 4 }} transition={{ duration: 0.18 }}>
              <ProofButton onClick={onAskProof}>Ask proof.</ProofButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
