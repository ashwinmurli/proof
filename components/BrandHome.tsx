'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { useProofStore } from '@/store'

const NAV_SECTIONS = [
  { id: 'beliefs',     label: 'Beliefs' },
  { id: 'values',      label: 'Values' },
  { id: 'personality', label: 'Personality' },
  { id: 'tone',        label: 'Tone' },
  { id: 'naming',      label: 'Name' },
  { id: 'tagline',     label: 'Tagline' },
  { id: 'manifesto',   label: 'Manifesto' },
]

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  function copy(key: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }
  return { copied, copy }
}

function CopyButton({ id, text, copied, onCopy }: { id: string; text: string; copied: string | null; onCopy: (id: string, text: string) => void }) {
  const isCopied = copied === id
  return (
    <button
      onClick={() => onCopy(id, text)}
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: isCopied ? 'var(--mango)' : 'var(--aluminum)',
        background: 'none',
        border: '1px solid',
        borderColor: isCopied ? 'var(--mango)' : 'var(--aluminum)',
        borderRadius: 4,
        padding: '4px 10px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (!isCopied) { e.currentTarget.style.color = 'var(--stone)'; e.currentTarget.style.borderColor = 'var(--stone)' } }}
      onMouseLeave={e => { if (!isCopied) { e.currentTarget.style.color = 'var(--aluminum)'; e.currentTarget.style.borderColor = 'var(--aluminum)' } }}
    >
      {isCopied ? 'Copied' : 'Copy'}
    </button>
  )
}

function ShareButton({ project }: { project: Project }) {
  const { generateShareToken } = useProofStore()
  const [copied, setCopied] = useState(false)
  function share() {
    const token = project.shareToken || generateShareToken(project.id)
    const url = `${window.location.origin}/share/${token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }
  return (
    <button
      onClick={share}
      style={{
        fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: copied ? 400 : 300,
        color: copied ? 'var(--mango)' : 'var(--stone)',
        background: 'none', border: 'none', cursor: 'pointer',
        transition: 'color 0.2s',
        display: 'flex', alignItems: 'center', gap: 5,
      }}
      onMouseEnter={e => { if (!copied) e.currentTarget.style.color = 'var(--concrete)' }}
      onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'var(--stone)' }}
    >
      {copied && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />}
      {copied ? 'Link copied' : 'Share'}
    </button>
  )
}

function SectionLabel({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 40 }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--aluminum)', minWidth: 18 }}>{n}</span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)' }}>{label}</span>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(194,189,183,0.35)', margin: '72px 0' }} />
}

export default function BrandHome({ project, readOnly = false }: { project: Project; readOnly?: boolean }) {
  const router = useRouter()
  const { copied, copy } = useCopy()
  const s = project.synthesis || {}
  const [activeSection, setActiveSection] = useState('beliefs')
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    )
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const brandName = project.name && project.name !== 'Untitled project' ? project.name : 'The brand'
  const chosenName = s.naming?.chosen || project.name
  const hasAnyContent = !!(s.beliefs?.belief || s.values?.length || s.personality?.tensions?.length || s.tone?.poleA || s.tagline?.chosen || s.manifesto?.final)

  const tensions = s.personality?.tensions?.map(t => {
    const m = t.match(/^(.+?)\s+but never\s+(.+?)(?:\s*—\s*(.+))?$/)
    return { pos: m?.[1]?.trim() || t, neg: m?.[2]?.trim() || '', description: m?.[3]?.trim() || '' }
  }) || []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Top strip */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: 52, borderBottom: '1px solid rgba(194,189,183,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px, 5vw, 44px)', background: 'var(--bg)',
        backdropFilter: 'blur(12px)',
      }}>
        {readOnly ? (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--stone)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
            proof.
          </div>
        ) : (
          <button
            onClick={() => router.push(`/project/${project.id}/synthesis`)}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--concrete)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--stone)'}
          >
            ← Synthesis
          </button>
        )}

        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 400, letterSpacing: '0.06em', color: 'var(--dark)' }}>
          {chosenName || brandName}
          <span style={{ color: 'var(--mango)', marginLeft: 1 }}>.</span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {!readOnly && (
            <>
              <ShareButton project={project} />
              <button
                onClick={() => window.print()}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--concrete)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--stone)'}
              >
                Export
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>

        {/* Left nav */}
        <nav style={{
          position: 'sticky', top: 52, alignSelf: 'flex-start',
          width: 180, padding: '40px 0 40px 44px', flexShrink: 0,
        }}>
          {NAV_SECTIONS.map(({ id, label }) => {
            const sectionHasContent = sectionHasData(id, s, project.name)
            if (!sectionHasContent) return null
            const isActive = activeSection === id
            return (
              <button key={id}
                onClick={() => {
                  sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  fontWeight: isActive ? 500 : 300,
                  color: isActive ? 'var(--dark)' : 'var(--stone)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '7px 0',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'color 0.2s',
                  letterSpacing: '0.01em',
                }}
              >
                {isActive && (
                  <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', marginRight: 8, verticalAlign: 'middle', marginBottom: 1 }} />
                )}
                {label}
              </button>
            )
          })}
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, maxWidth: 680, padding: '64px clamp(20px, 5vw, 44px) 160px 0', minWidth: 0 }}>

          {!hasAnyContent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingTop: 40 }}>
              <p style={{ fontSize: 15, color: 'var(--stone)', fontWeight: 300, lineHeight: 1.8 }}>
                Complete modules in Synthesis to build the brand home.
              </p>
              <button
                onClick={() => router.push(`/project/${project.id}/synthesis`)}
                style={{ marginTop: 24, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: 'var(--dark)', color: '#FDFCFA', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: 'pointer' }}>
                Go to Synthesis →
              </button>
            </motion.div>
          )}

          {/* Cover */}
          {hasAnyContent && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ marginBottom: 80 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 20 }}>
                Brand Foundation
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.0, letterSpacing: '-0.02em', marginBottom: s.tagline?.chosen ? 20 : 16 }}>
                {chosenName || brandName}
              </h1>
              {s.tagline?.chosen && (
                <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, fontWeight: 400, color: 'var(--concrete)', lineHeight: 1.4, maxWidth: 480, marginBottom: 20 }}>
                  {s.tagline.chosen}
                </p>
              )}
              {project.description && (
                <p style={{ fontSize: 14, color: 'var(--stone)', fontWeight: 300, lineHeight: 1.75, maxWidth: 480 }}>
                  {project.description}
                </p>
              )}
            </motion.div>
          )}

          {/* 1. Beliefs */}
          {s.beliefs?.belief && (
            <section id="beliefs" ref={el => { sectionRefs.current['beliefs'] = el }}>
              <SectionLabel n="01" label="What we believe" />
              <div style={{ marginBottom: 40 }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 12 }}>Belief</div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.5, maxWidth: 520 }}>
                  {s.beliefs.belief}
                </p>
              </div>
              {s.beliefs.building && (
                <div style={{ marginBottom: 40 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 12 }}>What we're building</div>
                  <p style={{ fontSize: 16, color: 'var(--concrete)', fontWeight: 300, lineHeight: 1.8, maxWidth: 520 }}>
                    {s.beliefs.building}
                  </p>
                </div>
              )}
              {s.beliefs.working && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 12 }}>How we work</div>
                  <p style={{ fontSize: 16, color: 'var(--concrete)', fontWeight: 300, lineHeight: 1.8, maxWidth: 520 }}>
                    {s.beliefs.working}
                  </p>
                </div>
              )}
              <Divider />
            </section>
          )}

          {/* 2. Values */}
          {s.values && s.values.length > 0 && (
            <section id="values" ref={el => { sectionRefs.current['values'] = el }}>
              <SectionLabel n="02" label="What we stand for" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                {s.values.map((v, i) => (
                  <motion.div key={v.id || i}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 10 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 28, color: 'var(--dark)', fontWeight: 400 }}>
                        {v.name}
                      </span>
                    </div>
                    {v.definition && (
                      <p style={{ fontSize: 15, color: 'var(--concrete)', fontWeight: 300, lineHeight: 1.8, maxWidth: 480, marginBottom: v.behaviour ? 10 : 0 }}>
                        {v.definition}
                      </p>
                    )}
                    {v.behaviour && (
                      <p style={{ fontSize: 13, color: 'var(--stone)', fontWeight: 300, lineHeight: 1.75, maxWidth: 480, fontStyle: 'italic' }}>
                        In practice: {v.behaviour}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
              <Divider />
            </section>
          )}

          {/* 3. Personality */}
          {tensions.length > 0 && (
            <section id="personality" ref={el => { sectionRefs.current['personality'] = el }}>
              <SectionLabel n="03" label="Who we are" />

              {/* Tension pairs */}
              <div style={{ marginBottom: 48 }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 24 }}>Tension pairs</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {tensions.map((t, i) => (
                    <div key={i} style={{ padding: '20px 0', borderBottom: i < tensions.length - 1 ? '1px solid rgba(194,189,183,0.3)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: t.description ? 8 : 0 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--dark)' }}>{t.pos}</span>
                        <span style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 300 }}>but never</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--concrete)' }}>{t.neg}</span>
                      </div>
                      {t.description && (
                        <p style={{ fontSize: 13, color: 'var(--stone)', fontWeight: 300, lineHeight: 1.7, maxWidth: 460 }}>{t.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Scenario portraits */}
              {(s.personality?.dinner || s.personality?.difficult || s.personality?.decision) && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 24 }}>The person</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                    {[
                      { label: 'At a dinner party', val: s.personality.dinner },
                      { label: 'In a difficult conversation', val: s.personality.difficult },
                      { label: 'Making a decision under pressure', val: s.personality.decision },
                    ].filter(item => item.val).map((item, i) => (
                      <div key={i}>
                        <div style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 400, marginBottom: 8, letterSpacing: '0.01em' }}>{item.label}</div>
                        <p style={{ fontSize: 15, color: 'var(--concrete)', fontWeight: 300, lineHeight: 1.8, maxWidth: 520 }}>{item.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Divider />
            </section>
          )}

          {/* 4. Tone of Voice */}
          {s.tone?.poleA && (
            <section id="tone" ref={el => { sectionRefs.current['tone'] = el }}>
              <SectionLabel n="04" label="How we speak" />

              <div style={{ marginBottom: 40 }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 20 }}>Spectrum</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--dark)' }}>{s.tone.poleA}</span>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, var(--dark), var(--aluminum))', margin: '0 20px', opacity: 0.4 }} />
                  <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--concrete)' }}>{s.tone.poleB}</span>
                </div>
              </div>

              {s.tone.doesSoundLike && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div style={{ padding: '20px 24px', background: 'var(--surface-1)', borderRadius: 10, border: '1px solid rgba(184,179,172,0.2)' }}>
                    <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 12 }}>Sounds like us</div>
                    <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, color: 'var(--dark)', lineHeight: 1.75 }}>
                      "{s.tone.doesSoundLike}"
                    </p>
                  </div>
                  {s.tone.doesntSoundLike && (
                    <div style={{ padding: '20px 24px', background: 'var(--surface-1)', borderRadius: 10, border: '1px solid rgba(184,179,172,0.2)', opacity: 0.6 }}>
                      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 12 }}>Doesn't sound like us</div>
                      <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, color: 'var(--concrete)', lineHeight: 1.75 }}>
                        "{s.tone.doesntSoundLike}"
                      </p>
                    </div>
                  )}
                </div>
              )}
              <Divider />
            </section>
          )}

          {/* 5. Name */}
          {(s.naming?.chosen || s.naming?.territory) && (
            <section id="naming" ref={el => { sectionRefs.current['naming'] = el }}>
              <SectionLabel n="05" label="What we're called" />
              <div style={{ marginBottom: s.naming?.rationale ? 20 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.0, letterSpacing: '-0.02em' }}>
                    {s.naming?.chosen || project.name}
                  </h2>
                  <CopyButton id="name" text={s.naming?.chosen || project.name} copied={copied} onCopy={copy} />
                </div>
              </div>
              {s.naming?.rationale && (
                <p style={{ fontSize: 15, color: 'var(--concrete)', fontWeight: 300, lineHeight: 1.8, maxWidth: 480, marginTop: 16 }}>
                  {s.naming.rationale}
                </p>
              )}
              {s.naming?.territory && (
                <p style={{ fontSize: 13, color: 'var(--stone)', fontWeight: 300, lineHeight: 1.75, maxWidth: 480, marginTop: 12, fontStyle: 'italic' }}>
                  {s.naming.territory}
                </p>
              )}
              <Divider />
            </section>
          )}

          {/* 6. Tagline */}
          {s.tagline?.chosen && (
            <section id="tagline" ref={el => { sectionRefs.current['tagline'] = el }}>
              <SectionLabel n="06" label="The line" />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 40, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.2, maxWidth: 520 }}>
                  {s.tagline.chosen}
                </p>
                <CopyButton id="tagline" text={s.tagline.chosen} copied={copied} onCopy={copy} />
              </div>
              <Divider />
            </section>
          )}

          {/* 7. Manifesto */}
          {s.manifesto?.final && (
            <section id="manifesto" ref={el => { sectionRefs.current['manifesto'] = el }}>
              <SectionLabel n="07" label="What we're about" />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 24 }}>
                <div style={{ flex: 1 }} />
                <CopyButton id="manifesto" text={s.manifesto.final} copied={copied} onCopy={copy} />
              </div>
              <div style={{ maxWidth: 540 }}>
                {s.manifesto.final.split('\n\n').map((para, i) => (
                  <p key={i} style={{
                    fontSize: 18,
                    color: 'var(--dark)',
                    fontWeight: 300,
                    lineHeight: 1.85,
                    marginBottom: 24,
                    fontFamily: 'var(--font-sans)',
                  }}>
                    {para}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* Back to synthesis */}
          {hasAnyContent && (
            <div style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid rgba(194,189,183,0.35)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {!readOnly ? (
                <button
                  onClick={() => router.push(`/project/${project.id}/synthesis`)}
                  style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ← Back to Synthesis
                </button>
              ) : <div />}
              <div style={{ fontSize: 11, color: 'var(--aluminum)', fontWeight: 300, letterSpacing: '0.05em' }}>
                proof.
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @media print { nav { display: none; } button { display: none !important; } }
        @media (max-width: 640px) { nav { display: none !important; } }
      `}</style>
    </div>
  )
}

function sectionHasData(id: string, s: ReturnType<typeof extractSynthesis>, projectName?: string): boolean {
  switch (id) {
    case 'beliefs':     return !!(s.beliefs?.belief)
    case 'values':      return !!(s.values?.length)
    case 'personality': return !!(s.personality?.tensions?.length)
    case 'tone':        return !!(s.tone?.poleA)
    case 'naming':      return !!(s.naming?.chosen || s.naming?.territory)
    case 'tagline':     return !!(s.tagline?.chosen)
    case 'manifesto':   return !!(s.manifesto?.final)
    default: return false
  }
}

function extractSynthesis(project: Project) {
  return project.synthesis || {}
}
