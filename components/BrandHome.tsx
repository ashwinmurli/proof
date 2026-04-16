'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Project, BrandIdentity } from '@/types'
import { useProofStore } from '@/store'
import { useProofStream } from '@/lib/useProofStream'
import { buildSynthesisContext } from '@/lib/synthesisContext'

// ─── Identity helpers ────────────────────────────────────────────────────────

function identityVars(id: BrandIdentity | undefined): React.CSSProperties {
  if (!id) return {}
  return {
    '--bh-bg':      id.backgroundColor || '#FFFFFF',
    '--bh-text':    id.textColor        || '#111111',
    '--bh-primary': id.primaryColor     || '#111111',
    '--bh-accent':  id.accentColor      || id.primaryColor || '#111111',
    '--bh-display': id.displayFont      ? `"${id.displayFont}", Georgia, serif` : 'Georgia, serif',
    '--bh-body':    id.bodyFont         ? `"${id.bodyFont}", system-ui, sans-serif` : 'system-ui, sans-serif',
  } as React.CSSProperties
}

const GOOGLE_FONT_PAIRS = [
  { display: 'Playfair Display', body: 'DM Sans',     label: 'Editorial' },
  { display: 'Fraunces',         body: 'Inter',        label: 'Literary' },
  { display: 'Cormorant Garamond', body: 'Jost',       label: 'Refined' },
  { display: 'DM Serif Display', body: 'DM Sans',      label: 'Modern Serif' },
  { display: 'Space Grotesk',    body: 'Space Grotesk', label: 'Technical' },
  { display: 'Libre Baskerville', body: 'Source Sans 3', label: 'Classic' },
]

// ─── Small shared components ─────────────────────────────────────────────────

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  function copy(key: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }
  return { copied, copy }
}

function CopyBtn({ id, text, copied, onCopy }: { id: string; text: string; copied: string | null; onCopy: (id: string, text: string) => void }) {
  const ok = copied === id
  return (
    <button onClick={() => onCopy(id, text)} style={{
      fontFamily: 'var(--bh-body)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: ok ? 'var(--bh-accent)' : 'rgba(0,0,0,0.25)',
      background: 'none', border: '1px solid', borderColor: ok ? 'var(--bh-accent)' : 'rgba(0,0,0,0.15)',
      borderRadius: 4, padding: '4px 10px', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
    }}>
      {ok ? 'Copied' : 'Copy'}
    </button>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '64px 0' }} />
}

function ChapterLabel({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 40 }}>
      <span style={{ fontFamily: 'var(--bh-body)', fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--bh-accent)', opacity: 0.7 }}>{n}</span>
      <span style={{ fontFamily: 'var(--bh-body)', fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)' }}>{label}</span>
    </div>
  )
}

// ─── Visual Identity Wizard ───────────────────────────────────────────────────

function IdentityWizard({ identity, onSave, onClose }: {
  identity: BrandIdentity | undefined
  onSave: (id: BrandIdentity) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<BrandIdentity>(identity || {})
  const [step, setStep] = useState(0)
  const set = (k: keyof BrandIdentity, v: string) => setDraft(d => ({ ...d, [k]: v }))

  const steps = [
    {
      label: 'Colours',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ColorInput label="Primary colour" value={draft.primaryColor || ''} onChange={v => set('primaryColor', v)} hint="Used for headings and key elements" />
          <ColorInput label="Accent colour" value={draft.accentColor || ''} onChange={v => set('accentColor', v)} hint="Used for labels and highlights — defaults to primary" />
          <ColorInput label="Background" value={draft.backgroundColor || ''} onChange={v => set('backgroundColor', v)} hint="The page background" />
          <ColorInput label="Text colour" value={draft.textColor || ''} onChange={v => set('textColor', v)} hint="Body text — defaults to near-black" />
        </div>
      ),
    },
    {
      label: 'Typography',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
            Choose a type pairing, or leave blank to use neutral defaults.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {GOOGLE_FONT_PAIRS.map(pair => {
              const active = draft.displayFont === pair.display
              return (
                <button key={pair.label}
                  onClick={() => { set('displayFont', pair.display); set('bodyFont', pair.body) }}
                  style={{
                    padding: '14px 16px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    background: active ? 'rgba(0,0,0,0.06)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.1)'}`,
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 6 }}>{pair.label}</div>
                  <div style={{ fontFamily: `"${pair.display}", serif`, fontSize: 16, color: 'rgba(0,0,0,0.85)', marginBottom: 2 }}>{pair.display}</div>
                  <div style={{ fontFamily: `"${pair.body}", sans-serif`, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{pair.body}</div>
                </button>
              )
            })}
          </div>
          {draft.displayFont && (
            <button onClick={() => { set('displayFont', ''); set('bodyFont', '') }}
              style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
              Clear selection → use neutral defaults
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        style={{
          background: '#fff', borderRadius: 14, padding: '32px 32px 28px',
          width: '100%', maxWidth: 480,
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', marginBottom: 4 }}>
              Brand identity — {step + 1} of {steps.length}
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, color: '#111' }}>{steps[step].label}</div>
          </div>
          <button onClick={onClose} style={{ fontSize: 18, color: 'rgba(0,0,0,0.3)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Step content */}
        <div style={{ marginBottom: 28 }}>{steps[step].content}</div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {step === 0 ? 'Cancel' : '← Back'}
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {step < steps.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)}
                style={{ fontFamily: 'system-ui', fontSize: 13, fontWeight: 500, background: '#111', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', cursor: 'pointer' }}>
                Next →
              </button>
            ) : (
              <button onClick={() => { onSave(draft); onClose() }}
                style={{ fontFamily: 'system-ui', fontSize: 13, fontWeight: 500, background: '#111', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', cursor: 'pointer' }}>
                Apply identity
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ColorInput({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const [text, setText] = useState(value)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const isValid = /^#[0-9A-Fa-f]{6}$/.test(text)

  function handleText(v: string) {
    setText(v)
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v)
  }

  function handlePicker(v: string) {
    setText(v)
    onChange(v)
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.45)', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Swatch — clicking opens native colour picker */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            onClick={() => colorInputRef.current?.click()}
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: isValid ? text : '#eeeeee',
              border: '1px solid rgba(0,0,0,0.12)',
              cursor: 'pointer',
              transition: 'transform 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          />
          <input
            ref={colorInputRef}
            type="color"
            value={isValid ? text : '#ffffff'}
            onChange={e => handlePicker(e.target.value)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
          />
        </div>
        {/* Hex text input */}
        <input
          value={text}
          onChange={e => handleText(e.target.value)}
          placeholder="#000000"
          style={{
            fontFamily: 'monospace', fontSize: 13, padding: '8px 12px', borderRadius: 8,
            border: `1px solid ${isValid ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.1)'}`,
            outline: 'none', width: 110, background: '#fafafa', color: '#111',
            transition: 'border-color 0.15s',
          }}
        />
        {hint && <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)', fontWeight: 300, lineHeight: 1.4 }}>{hint}</span>}
      </div>
    </div>
  )
}

// ─── Copy generator ───────────────────────────────────────────────────────────

function CopyGenerator({ project }: { project: Project }) {
  const { stream } = useProofStream()
  const [prompt, setPrompt] = useState('')
  const [output, setOutput] = useState('')
  const [generating, setGenerating] = useState(false)
  const { copied, copy } = useCopy()

  async function generate() {
    if (!prompt.trim()) return
    setGenerating(true)
    setOutput('')

    const ctx = buildSynthesisContext(project)
    const fullPrompt = `You are the brand voice of ${project.name}. Using only the brand's established character, tone, and voice — write the following:

${prompt}

Brand context:
${ctx}

Rules:
- Write entirely in the brand's voice — not proof.'s voice
- Be concise. Deliver exactly what was asked, nothing more
- No preamble, no explanation, no "here is your copy:"
- Just the copy itself`

    await stream({
      project, mode: 'strategist', module: 'CopyGenerator', prompt: fullPrompt, maxTokens: 400,
      onChunk: text => setOutput(text),
      onComplete: text => { setOutput(text); setGenerating(false) },
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate() }}
          placeholder="Write a tagline for our Instagram bio… / Give me three subject lines for a launch email… / Write a one-liner for a pitch deck cover…"
          style={{
            fontFamily: 'var(--bh-body)', fontSize: 14, fontWeight: 300,
            padding: '14px 16px', borderRadius: 8, resize: 'none',
            border: '1px solid rgba(0,0,0,0.12)', outline: 'none',
            background: 'rgba(0,0,0,0.02)', color: 'var(--bh-text)',
            lineHeight: 1.7, minHeight: 80,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={generate}
            disabled={!prompt.trim() || generating}
            style={{
              fontFamily: 'var(--bh-body)', fontSize: 13, fontWeight: 500,
              background: generating ? 'rgba(0,0,0,0.08)' : 'var(--bh-primary)',
              color: generating ? 'rgba(0,0,0,0.35)' : 'var(--bh-bg)',
              border: 'none', borderRadius: 6, padding: '10px 20px',
              cursor: prompt.trim() && !generating ? 'pointer' : 'default',
              transition: 'all 0.2s',
            }}>
            {generating ? 'Writing…' : 'Write →'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {output && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 20, padding: '20px 24px',
              background: 'rgba(0,0,0,0.03)', borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.08)',
            }}>
            <p style={{ fontFamily: 'var(--bh-display)', fontSize: 18, fontWeight: 400, color: 'var(--bh-text)', lineHeight: 1.75, margin: '0 0 16px' }}>
              {output}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <CopyBtn id="copy-gen" text={output} copied={copied} onCopy={copy} />
              <button
                onClick={() => { setOutput(''); setPrompt('') }}
                style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--bh-body)' }}>
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const NAV_CHAPTERS = [
  { id: 'beliefs',     label: 'What we believe' },
  { id: 'values',      label: 'What we stand for' },
  { id: 'personality', label: 'Who we are' },
  { id: 'tone',        label: 'How we speak' },
  { id: 'naming',      label: 'What we\'re called' },
  { id: 'tagline',     label: 'The line' },
  { id: 'manifesto',   label: 'What we\'re about' },
  { id: 'copy',        label: 'Write with the brand' },
]

export default function BrandHome({ project, readOnly = false }: { project: Project; readOnly?: boolean }) {
  const router = useRouter()
  const { updateProject, generateShareToken } = useProofStore()
  const { copied, copy } = useCopy()
  const s = project.synthesis || {}
  const id = project.identity
  const [activeSection, setActiveSection] = useState('beliefs')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  // Load Google Fonts if set
  useEffect(() => {
    if (!id?.displayFont && !id?.bodyFont) return
    const fonts = [id.displayFont, id.bodyFont].filter(Boolean).map(f => f!.replace(/ /g, '+'))
    const url = `https://fonts.googleapis.com/css2?${fonts.map(f => `family=${f}:ital,wght@0,300;0,400;0,500;1,400`).join('&')}&display=swap`
    if (!document.querySelector(`link[href="${url}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'; link.href = url
      document.head.appendChild(link)
    }
  }, [id?.displayFont, id?.bodyFont])

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id) }),
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  function saveIdentity(identity: BrandIdentity) {
    updateProject(project.id, { identity })
  }

  function share() {
    const token = project.shareToken || generateShareToken(project.id)
    const url = `${window.location.origin}/share/${token}`
    navigator.clipboard.writeText(url)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2500)
  }

  const vars = identityVars(id)
  const hasIdentity = !!(id?.primaryColor || id?.displayFont)
  const brandName = s.naming?.chosen || project.name
  const hasContent = !!(s.beliefs?.belief || s.values?.length || s.tone?.poleA || s.manifesto?.final)

  const tensions = s.personality?.tensions?.map(t => {
    const m = t.match(/^(.+?)\s+but never\s+(.+?)(?:\s*[—–-]\s*(.+))?$/)
    return { pos: m?.[1]?.trim() || t, neg: m?.[2]?.trim() || '', desc: m?.[3]?.trim() || '' }
  }) || []

  // Determine which nav items have content
  function chapterHasContent(id: string) {
    switch (id) {
      case 'beliefs':     return !!(s.beliefs?.belief)
      case 'values':      return !!(s.values?.length)
      case 'personality': return !!(tensions.length || s.personality?.dinner)
      case 'tone':        return !!(s.tone?.poleA)
      case 'naming':      return !!(s.naming?.chosen || s.naming?.territory)
      case 'tagline':     return !!(s.tagline?.chosen)
      case 'manifesto':   return !!(s.manifesto?.final)
      case 'copy':        return !!(s.manifesto?.final || s.tone?.poleA)
      default: return false
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: id?.backgroundColor || '#FAFAF8', display: 'flex', flexDirection: 'column', ...vars }}>

      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50, height: 52,
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px, 5vw, 44px)',
        background: id?.backgroundColor || '#FAFAF8',
      }}>
        {/* Left */}
        {readOnly ? (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(0,0,0,0.3)', letterSpacing: '0.08em' }}>
            proof<span style={{ color: 'var(--mango)' }}>.</span>
          </div>
        ) : (
          <button onClick={() => router.push(`/project/${project.id}/synthesis`)}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(0,0,0,0.7)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,0,0,0.4)'}>
            ← Synthesis
          </button>
        )}

        {/* Centre — brand name */}
        <div style={{ fontFamily: `var(--bh-display, var(--font-display))`, fontSize: 15, fontWeight: 400, color: id?.textColor || '#111', letterSpacing: '0.02em' }}>
          {brandName}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {!readOnly && (
            <>
              <button onClick={share}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: shareCopied ? 'var(--mango)' : 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => { if (!shareCopied) e.currentTarget.style.color = 'rgba(0,0,0,0.7)' }}
                onMouseLeave={e => { if (!shareCopied) e.currentTarget.style.color = 'rgba(0,0,0,0.4)' }}>
                {shareCopied ? 'Link copied' : 'Share'}
              </button>
              <button onClick={() => setWizardOpen(true)}
                style={{
                  fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: hasIdentity ? (id?.primaryColor || '#111') : 'rgba(0,0,0,0.35)',
                  background: 'none',
                  border: `1px solid ${hasIdentity ? (id?.primaryColor || 'rgba(0,0,0,0.25)') : 'rgba(0,0,0,0.15)'}`,
                  borderRadius: 4, padding: '4px 10px', cursor: 'pointer', transition: 'all 0.2s',
                }}>
                {hasIdentity ? 'Identity' : 'Add identity'}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>

        {/* Left nav */}
        <nav style={{
          position: 'sticky', top: 52, alignSelf: 'flex-start',
          width: 200, padding: '48px 0 48px 44px', flexShrink: 0,
        }}>
          {NAV_CHAPTERS.filter(c => chapterHasContent(c.id)).map(({ id: cid, label }) => {
            const isActive = activeSection === cid
            return (
              <button key={cid}
                onClick={() => sectionRefs.current[cid]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: `var(--bh-body, var(--font-sans))`,
                  fontSize: 12, fontWeight: isActive ? 500 : 300,
                  color: isActive ? (id?.primaryColor || '#111') : 'rgba(0,0,0,0.35)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '6px 0', textAlign: 'left', width: '100%',
                  transition: 'color 0.15s', letterSpacing: '0.01em',
                }}>
                <span style={{
                  width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
                  background: isActive ? (id?.accentColor || id?.primaryColor || 'var(--mango)') : 'transparent',
                  transition: 'background 0.15s',
                }} />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Main */}
        <main style={{ flex: 1, maxWidth: 660, padding: '64px clamp(20px, 5vw, 44px) 160px 0', minWidth: 0 }}>

          {!hasContent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingTop: 40 }}>
              <p style={{ fontSize: 15, color: 'rgba(0,0,0,0.4)', fontWeight: 300, lineHeight: 1.8 }}>
                Complete modules in Synthesis to build the brand home.
              </p>
              <button onClick={() => router.push(`/project/${project.id}/synthesis`)}
                style={{ marginTop: 24, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: '#111', color: '#fff', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: 'pointer' }}>
                Go to Synthesis →
              </button>
            </motion.div>
          )}

          {/* Cover */}
          {hasContent && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ marginBottom: 80 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)', marginBottom: 24 }}>
                Brand Foundation
              </div>
              <h1 style={{
                fontFamily: `var(--bh-display, var(--font-display))`,
                fontSize: 'clamp(48px, 8vw, 72px)', fontWeight: 400,
                color: id?.primaryColor || id?.textColor || '#111',
                lineHeight: 1.0, letterSpacing: '-0.025em',
                margin: '0 0 20px',
              }}>
                {brandName}
              </h1>
              {s.tagline?.chosen && (
                <p style={{
                  fontFamily: `var(--bh-display, var(--font-display))`,
                  fontStyle: 'italic', fontSize: 22, fontWeight: 400,
                  color: id?.accentColor || id?.primaryColor || 'rgba(0,0,0,0.55)',
                  lineHeight: 1.4, margin: 0,
                }}>
                  {s.tagline.chosen}
                </p>
              )}
            </motion.div>
          )}

          {/* 01 — Beliefs */}
          {s.beliefs?.belief && (
            <section id="beliefs" ref={el => { sectionRefs.current['beliefs'] = el }}>
              <ChapterLabel n="01" label="What we believe" />
              <div style={{ marginBottom: 32 }}>
                <p style={{ fontFamily: `var(--bh-display, var(--font-display))`, fontSize: 24, fontWeight: 400, color: id?.textColor || '#111', lineHeight: 1.5, margin: 0, maxWidth: 540 }}>
                  {s.beliefs.belief}
                </p>
              </div>
              {s.beliefs.building && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', marginBottom: 10 }}>What we're building</div>
                  <p style={{ fontFamily: `var(--bh-body, var(--font-sans))`, fontSize: 15, fontWeight: 300, color: 'rgba(0,0,0,0.65)', lineHeight: 1.85, margin: 0, maxWidth: 520 }}>{s.beliefs.building}</p>
                </div>
              )}
              {s.beliefs.working && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', marginBottom: 10 }}>How we work</div>
                  <p style={{ fontFamily: `var(--bh-body, var(--font-sans))`, fontSize: 15, fontWeight: 300, color: 'rgba(0,0,0,0.65)', lineHeight: 1.85, margin: 0, maxWidth: 520 }}>{s.beliefs.working}</p>
                </div>
              )}
              <Divider />
            </section>
          )}

          {/* 02 — Values */}
          {s.values && s.values.length > 0 && (
            <section id="values" ref={el => { sectionRefs.current['values'] = el }}>
              <ChapterLabel n="02" label="What we stand for" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
                {s.values.map((v, i) => (
                  <motion.div key={v.id || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <p style={{ fontFamily: `var(--bh-display, var(--font-display))`, fontStyle: 'italic', fontSize: 22, fontWeight: 400, color: id?.textColor || '#111', margin: '0 0 10px' }}>
                      {v.name}
                    </p>
                    {v.definition && <p style={{ fontFamily: `var(--bh-body, var(--font-sans))`, fontSize: 15, fontWeight: 300, color: 'rgba(0,0,0,0.65)', lineHeight: 1.85, margin: '0 0 6px', maxWidth: 500 }}>{v.definition}</p>}
                    {v.behaviour && <p style={{ fontFamily: `var(--bh-body, var(--font-sans))`, fontSize: 13, fontWeight: 300, color: 'rgba(0,0,0,0.4)', lineHeight: 1.75, margin: 0, maxWidth: 500 }}>In practice: {v.behaviour}</p>}
                  </motion.div>
                ))}
              </div>
              <Divider />
            </section>
          )}

          {/* 03 — Personality */}
          {(tensions.length > 0 || s.personality?.dinner) && (
            <section id="personality" ref={el => { sectionRefs.current['personality'] = el }}>
              <ChapterLabel n="03" label="Who we are" />
              {tensions.length > 0 && (
                <div style={{ marginBottom: s.personality?.dinner ? 48 : 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', marginBottom: 24 }}>Tension pairs</div>
                  {tensions.map((t, i) => (
                    <div key={i} style={{ padding: '18px 0', borderBottom: i < tensions.length - 1 ? '1px solid rgba(0,0,0,0.07)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: t.desc ? 6 : 0, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: `var(--bh-display, var(--font-display))`, fontSize: 22, fontWeight: 400, color: id?.textColor || '#111' }}>{t.pos}</span>
                        <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)', fontWeight: 300 }}>but never</span>
                        <span style={{ fontFamily: `var(--bh-display, var(--font-display))`, fontSize: 22, fontWeight: 400, color: 'rgba(0,0,0,0.4)' }}>{t.neg}</span>
                      </div>
                      {t.desc && <p style={{ fontFamily: `var(--bh-body, var(--font-sans))`, fontSize: 13, color: 'rgba(0,0,0,0.45)', fontWeight: 300, lineHeight: 1.7, margin: 0, maxWidth: 460 }}>{t.desc}</p>}
                    </div>
                  ))}
                </div>
              )}
              {(s.personality?.dinner || s.personality?.difficult || s.personality?.decision) && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', marginBottom: 24 }}>The person</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {[
                      { label: 'At a dinner party', val: s.personality.dinner },
                      { label: 'In a difficult conversation', val: s.personality.difficult },
                      { label: 'Making a decision under pressure', val: s.personality.decision },
                    ].filter(x => x.val).map((x, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 24, alignItems: 'start' }}>
                        <div style={{ fontFamily: `var(--bh-body, var(--font-sans))`, fontSize: 12, color: 'rgba(0,0,0,0.35)', fontWeight: 400, paddingTop: 2 }}>{x.label}</div>
                        <p style={{ fontFamily: `var(--bh-body, var(--font-sans))`, fontSize: 15, color: 'rgba(0,0,0,0.65)', fontWeight: 300, lineHeight: 1.8, margin: 0 }}>{x.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Divider />
            </section>
          )}

          {/* 04 — Tone */}
          {s.tone?.poleA && (
            <section id="tone" ref={el => { sectionRefs.current['tone'] = el }}>
              <ChapterLabel n="04" label="How we speak" />
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 4 }}>
                  <span style={{ fontFamily: `var(--bh-display, var(--font-display))`, fontStyle: 'italic', fontSize: 28, fontWeight: 400, color: id?.textColor || '#111' }}>{s.tone.poleA}</span>
                  <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.25)', fontWeight: 300 }}>—</span>
                  <span style={{ fontFamily: `var(--bh-display, var(--font-display))`, fontStyle: 'italic', fontSize: 28, fontWeight: 400, color: 'rgba(0,0,0,0.4)' }}>{s.tone.poleB}</span>
                </div>
              </div>
              {(s.tone.doesSoundLike || s.tone.doesntSoundLike) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {s.tone.doesSoundLike && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)', marginBottom: 10 }}>Sounds like us</div>
                      <p style={{ fontFamily: `var(--bh-display, var(--font-display))`, fontStyle: 'italic', fontSize: 16, color: id?.textColor || '#111', lineHeight: 1.7, margin: 0, maxWidth: 480 }}>"{s.tone.doesSoundLike}"</p>
                    </div>
                  )}
                  {s.tone.doesntSoundLike && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)', marginBottom: 10 }}>Doesn't sound like us</div>
                      <p style={{ fontFamily: `var(--bh-display, var(--font-display))`, fontStyle: 'italic', fontSize: 16, color: 'rgba(0,0,0,0.4)', lineHeight: 1.7, margin: 0, maxWidth: 480 }}>"{s.tone.doesntSoundLike}"</p>
                    </div>
                  )}
                </div>
              )}
              <Divider />
            </section>
          )}

          {/* 05 — Naming */}
          {(s.naming?.chosen || s.naming?.territory) && (
            <section id="naming" ref={el => { sectionRefs.current['naming'] = el }}>
              <ChapterLabel n="05" label="What we're called" />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
                <h2 style={{ fontFamily: `var(--bh-display, var(--font-display))`, fontSize: 'clamp(40px, 6vw, 56px)', fontWeight: 400, color: id?.primaryColor || id?.textColor || '#111', lineHeight: 1.0, letterSpacing: '-0.02em', margin: 0 }}>
                  {s.naming.chosen || project.name}
                </h2>
                <CopyBtn id="name" text={s.naming.chosen || project.name} copied={copied} onCopy={copy} />
              </div>
              {s.naming.rationale && <p style={{ fontFamily: `var(--bh-body, var(--font-sans))`, fontSize: 15, color: 'rgba(0,0,0,0.55)', fontWeight: 300, lineHeight: 1.85, margin: '0 0 10px', maxWidth: 480 }}>{s.naming.rationale}</p>}
              {s.naming.territory && <p style={{ fontFamily: `var(--bh-body, var(--font-sans))`, fontSize: 13, color: 'rgba(0,0,0,0.35)', fontWeight: 300, lineHeight: 1.75, margin: 0, maxWidth: 480, fontStyle: 'italic' }}>{s.naming.territory}</p>}
              <Divider />
            </section>
          )}

          {/* 06 — Tagline */}
          {s.tagline?.chosen && (
            <section id="tagline" ref={el => { sectionRefs.current['tagline'] = el }}>
              <ChapterLabel n="06" label="The line" />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <p style={{ fontFamily: `var(--bh-display, var(--font-display))`, fontStyle: 'italic', fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 400, color: id?.textColor || '#111', lineHeight: 1.2, margin: 0, maxWidth: 520 }}>
                  {s.tagline.chosen}
                </p>
                <CopyBtn id="tagline" text={s.tagline.chosen} copied={copied} onCopy={copy} />
              </div>
              <Divider />
            </section>
          )}

          {/* 07 — Manifesto */}
          {s.manifesto?.final && (
            <section id="manifesto" ref={el => { sectionRefs.current['manifesto'] = el }}>
              <ChapterLabel n="07" label="What we're about" />
              <div style={{ maxWidth: 560, marginBottom: 20 }}>
                {s.manifesto.final.split('\n\n').filter(Boolean).map((para, i) => (
                  <p key={i} style={{ fontFamily: `var(--bh-body, var(--font-sans))`, fontSize: 18, fontWeight: 400, color: id?.textColor || '#111', lineHeight: 1.85, margin: '0 0 24px' }}>
                    {para}
                  </p>
                ))}
              </div>
              <CopyBtn id="manifesto" text={s.manifesto.final} copied={copied} onCopy={copy} />
              <Divider />
            </section>
          )}

          {/* 08 — Copy generator */}
          {(s.manifesto?.final || s.tone?.poleA) && (
            <section id="copy" ref={el => { sectionRefs.current['copy'] = el }}>
              <ChapterLabel n="08" label="Write with the brand" />
              <p style={{ fontFamily: `var(--bh-body, var(--font-sans))`, fontSize: 15, fontWeight: 300, color: 'rgba(0,0,0,0.5)', lineHeight: 1.8, margin: '0 0 24px', maxWidth: 480 }}>
                Describe what you need. proof. will write it in the brand's voice.
              </p>
              <CopyGenerator project={project} />
            </section>
          )}

          {/* Footer */}
          {hasContent && (
            <div style={{ marginTop: 80, paddingTop: 32, borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {!readOnly ? (
                <button onClick={() => router.push(`/project/${project.id}/synthesis`)}
                  style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(0,0,0,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ← Back to Synthesis
                </button>
              ) : <div />}
              <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.2)', letterSpacing: '0.08em' }}>
                proof<span style={{ color: 'var(--mango)' }}>.</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Identity wizard */}
      <AnimatePresence>
        {wizardOpen && (
          <IdentityWizard
            identity={project.identity}
            onSave={saveIdentity}
            onClose={() => setWizardOpen(false)}
          />
        )}
      </AnimatePresence>

      <style>{`
        @media print { nav { display: none; } button { display: none !important; } }
        @media (max-width: 640px) { nav { display: none !important; } }
      `}</style>
    </div>
  )
}
