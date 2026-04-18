'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Project, BrandIdentity } from '@/types'
import { useProofStore } from '@/store'
import { useProofStream } from '@/lib/useProofStream'
import { buildSynthesisContext } from '@/lib/synthesisContext'
import { t, useLang, TranslationKey } from '@/lib/i18n'

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

function IdentityWizard({ identity, onSave, onClose, lang }: {
  identity: BrandIdentity | undefined
  onSave: (id: BrandIdentity) => void
  onClose: () => void
  lang: 'en' | 'nl'
}) {
  const [draft, setDraft] = useState<BrandIdentity>(identity || {})
  const [step, setStep] = useState(0)
  const set = (k: keyof BrandIdentity, v: string) => setDraft(d => ({ ...d, [k]: v }))
  const tw = (key: TranslationKey) => t(key, lang)

  const steps = [
    {
      label: tw('wizard.colours'),
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ColorPicker label={tw('wizard.primary')} value={draft.primaryColor || ''} onChange={v => set('primaryColor', v)} hint={tw('wizard.primary_hint')} />
          <ColorPicker label={tw('wizard.accent')} value={draft.accentColor || ''} onChange={v => set('accentColor', v)} hint={tw('wizard.accent_hint')} />
          <ColorPicker label={tw('wizard.background')} value={draft.backgroundColor || ''} onChange={v => set('backgroundColor', v)} hint={tw('wizard.bg_hint')} />
          <ColorPicker label={tw('wizard.text')} value={draft.textColor || ''} onChange={v => set('textColor', v)} hint={tw('wizard.text_hint')} />
        </div>
      ),
    },
    {
      label: tw('wizard.typography'),
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
            {tw('wizard.choose_pair')}
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
              {tw('wizard.clear')}
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
              {tw('wizard.brand_identity')} — {step + 1} {tw('wizard.of')} {steps.length}
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
            {step === 0 ? tw('wizard.cancel') : tw('wizard.back')}
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {step < steps.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)}
                style={{ fontFamily: 'system-ui', fontSize: 13, fontWeight: 500, background: '#111', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', cursor: 'pointer' }}>
                {tw('wizard.next')}
              </button>
            ) : (
              <button onClick={() => { onSave(draft); onClose() }}
                style={{ fontFamily: 'system-ui', fontSize: 13, fontWeight: 500, background: '#111', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', cursor: 'pointer' }}>
                {tw('wizard.apply')}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ColorPicker({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const [open, setOpen] = useState(false)
  const [hex, setHex] = useState(value || '')
  const [hue, setHue] = useState(0)
  const [sat, setSat] = useState(0.8)
  const [lit, setLit] = useState(0.45)
  const canvasRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const isValid = /^#[0-9A-Fa-f]{6}$/.test(hex)

  useEffect(() => {
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setHex(value)
      const [h, s, l] = hexToHsl(value)
      setHue(h); setSat(s); setLit(l)
    }
  }, [value])

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (!pickerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function commitHsl(h: number, s: number, l: number) {
    const newHex = hslToHex(h, s, l)
    setHex(newHex); onChange(newHex)
  }

  function handleCanvas(e: React.MouseEvent<HTMLDivElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    const newSat = x
    const newLit = 1 - y * (0.5 + x * 0.5)
    setSat(newSat); setLit(newLit)
    commitHsl(hue, newSat, newLit)
  }

  function handleHex(v: string) {
    setHex(v)
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
      const [h, s, l] = hexToHsl(v)
      setHue(h); setSat(s); setLit(l); onChange(v)
    }
  }

  const cursorX = sat * 100
  const cursorY = (1 - (lit - 0.5 * (1 - sat)) / (0.5 + sat * 0.5)) * 100

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setOpen(o => !o)} style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0, padding: 0,
          background: isValid ? hex : 'rgba(184,179,172,0.2)',
          border: `1px solid ${open ? 'var(--mango)' : 'rgba(184,179,172,0.4)'}`,
          cursor: 'pointer', boxShadow: open ? '0 0 0 2px rgba(255,161,10,0.2)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }} />
        <input value={hex} onChange={e => handleHex(e.target.value)} placeholder="#000000"
          style={{
            fontFamily: 'monospace', fontSize: 13, padding: '8px 12px', borderRadius: 8,
            border: `1px solid ${isValid ? 'rgba(184,179,172,0.4)' : 'rgba(184,179,172,0.25)'}`,
            outline: 'none', width: 110, background: 'var(--surface-0)', color: 'var(--dark)',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--mango)'}
          onBlur={e => e.target.style.borderColor = isValid ? 'rgba(184,179,172,0.4)' : 'rgba(184,179,172,0.25)'}
        />
        {hint && <span style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 300, lineHeight: 1.4 }}>{hint}</span>}
      </div>

      {open && (
        <div ref={pickerRef} style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 300,
          background: 'var(--surface-1)', borderRadius: 12,
          border: '1px solid rgba(184,179,172,0.3)',
          boxShadow: '0 4px 12px rgba(26,24,22,0.08), 0 16px 40px rgba(26,24,22,0.12)',
          padding: 16, width: 228,
        }}>
          {/* SL canvas */}
          <div ref={canvasRef}
            onMouseDown={e => { isDragging.current = true; handleCanvas(e) }}
            onMouseMove={e => { if (isDragging.current) handleCanvas(e) }}
            onMouseUp={() => { isDragging.current = false }}
            onMouseLeave={() => { isDragging.current = false }}
            style={{
              width: '100%', height: 128, borderRadius: 8, marginBottom: 10,
              position: 'relative', cursor: 'crosshair', userSelect: 'none',
              background: `hsl(${hue}, 100%, 50%)`,
            }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'linear-gradient(to right, #fff, transparent)' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'linear-gradient(to bottom, transparent, #000)' }} />
            <div style={{
              position: 'absolute', pointerEvents: 'none',
              left: `${Math.max(4, Math.min(96, cursorX))}%`,
              top: `${Math.max(4, Math.min(96, cursorY))}%`,
              transform: 'translate(-50%, -50%)',
              width: 14, height: 14, borderRadius: '50%',
              background: isValid ? hex : '#ccc',
              border: '2px solid #fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
            }} />
          </div>

          {/* Hue rail */}
          <div style={{ marginBottom: 12, padding: '2px 0' }}>
            <div style={{
              position: 'relative', height: 10, borderRadius: 5, cursor: 'pointer',
              background: 'linear-gradient(to right,#f00,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00)',
            }} onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect()
              const newHue = Math.round(((e.clientX - rect.left) / rect.width) * 360)
              setHue(newHue); commitHsl(newHue, sat, lit)
            }}>
              <div style={{
                position: 'absolute', pointerEvents: 'none',
                left: `${(hue / 360) * 100}%`, top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 16, height: 16, borderRadius: '50%',
                background: `hsl(${hue},100%,50%)`,
                border: '2px solid #fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              }} />
            </div>
          </div>

          {/* Hex + swatch row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, background: isValid ? hex : 'rgba(184,179,172,0.2)', border: '1px solid rgba(184,179,172,0.3)' }} />
            <input value={hex} onChange={e => handleHex(e.target.value)} placeholder="#000000"
              style={{
                fontFamily: 'monospace', fontSize: 12, padding: '6px 10px', borderRadius: 6,
                border: '1px solid rgba(184,179,172,0.3)', outline: 'none', flex: 1,
                background: 'var(--surface-0)', color: 'var(--dark)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--mango)'}
              onBlur={e => e.target.style.borderColor = 'rgba(184,179,172,0.3)'}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255
  const max = Math.max(r,g,b), min = Math.min(r,g,b)
  let h = 0, s = 0; const l = (max+min)/2
  if (max !== min) {
    const d = max-min; s = l>0.5 ? d/(2-max-min) : d/(max+min)
    switch(max) { case r: h=((g-b)/d+(g<b?6:0))/6; break; case g: h=((b-r)/d+2)/6; break; case b: h=((r-g)/d+4)/6; break }
  }
  return [Math.round(h*360), s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s*Math.min(l,1-l)
  const f = (n: number) => { const k=(n+h/30)%12; return Math.round(255*(l-a*Math.max(Math.min(k-3,9-k,1),-1))).toString(16).padStart(2,'0') }
  return `#${f(0)}${f(8)}${f(4)}`
}



function CopyGenerator({ project }: { project: Project }) {
  const { stream } = useProofStream()
  const tl = useLang(project)
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
          placeholder={tl('bh.copy_placeholder')}
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
            {generating ? tl('bh.writing') : tl('bh.copy_write')}
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

const NAV_CHAPTER_IDS = ['beliefs','values','personality','tone','naming','tagline','manifesto','copy']

export default function BrandHome({ project, readOnly = false }: { project: Project; readOnly?: boolean }) {
  const router = useRouter()
  const { updateProject, generateShareToken } = useProofStore()
  const tl = useLang(project)

  const NAV_CHAPTERS = [
    { id: 'beliefs',     label: tl('bh.beliefs') },
    { id: 'values',      label: tl('bh.values') },
    { id: 'personality', label: tl('bh.personality') },
    { id: 'tone',        label: tl('bh.tone') },
    { id: 'naming',      label: tl('bh.naming') },
    { id: 'tagline',     label: tl('bh.tagline') },
    { id: 'manifesto',   label: tl('bh.manifesto') },
    { id: 'copy',        label: tl('bh.copy') },
  ]
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
                {shareCopied ? tl('action.link_copied') : tl('action.share')}
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
                {hasIdentity ? tl('bh.identity') : tl('bh.add_identity')}
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
                {tl('bh.complete_synthesis')}
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
                {tl('bh.foundation')}
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
              <ChapterLabel n="01" label={tl('bh.beliefs')} />
              <div style={{ marginBottom: 32 }}>
                <p style={{ fontFamily: `var(--bh-display, var(--font-display))`, fontSize: 24, fontWeight: 400, color: id?.textColor || '#111', lineHeight: 1.5, margin: 0, maxWidth: 540 }}>
                  {s.beliefs.belief}
                </p>
              </div>
              {s.beliefs.building && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', marginBottom: 10 }}>{tl('bh.building')}</div>
                  <p style={{ fontFamily: `var(--bh-body, var(--font-sans))`, fontSize: 15, fontWeight: 300, color: 'rgba(0,0,0,0.65)', lineHeight: 1.85, margin: 0, maxWidth: 520 }}>{s.beliefs.building}</p>
                </div>
              )}
              {s.beliefs.working && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', marginBottom: 10 }}>{tl('bh.working')}</div>
                  <p style={{ fontFamily: `var(--bh-body, var(--font-sans))`, fontSize: 15, fontWeight: 300, color: 'rgba(0,0,0,0.65)', lineHeight: 1.85, margin: 0, maxWidth: 520 }}>{s.beliefs.working}</p>
                </div>
              )}
              <Divider />
            </section>
          )}

          {/* 02 — Values */}
          {s.values && s.values.length > 0 && (
            <section id="values" ref={el => { sectionRefs.current['values'] = el }}>
              <ChapterLabel n="02" label={tl('bh.values')} />
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
              <ChapterLabel n="03" label={tl('bh.personality')} />
              {tensions.length > 0 && (
                <div style={{ marginBottom: s.personality?.dinner ? 48 : 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', marginBottom: 24 }}>{tl('bh.tension_pairs')}</div>
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
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', marginBottom: 24 }}>{tl('bh.the_person')}</div>
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
              <ChapterLabel n="04" label={tl('bh.tone')} />
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
                      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)', marginBottom: 10 }}>{tl('bh.sounds_like')}</div>
                      <p style={{ fontFamily: `var(--bh-display, var(--font-display))`, fontStyle: 'italic', fontSize: 16, color: id?.textColor || '#111', lineHeight: 1.7, margin: 0, maxWidth: 480 }}>"{s.tone.doesSoundLike}"</p>
                    </div>
                  )}
                  {s.tone.doesntSoundLike && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)', marginBottom: 10 }}>{tl('bh.not_sounds_like')}</div>
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
              <ChapterLabel n="05" label={tl('bh.naming')} />
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
              <ChapterLabel n="06" label={tl('bh.tagline')} />
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
              <ChapterLabel n="07" label={tl('bh.manifesto')} />
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
              <ChapterLabel n="08" label={tl('bh.copy')} />
              <p style={{ fontFamily: `var(--bh-body, var(--font-sans))`, fontSize: 15, fontWeight: 300, color: 'rgba(0,0,0,0.5)', lineHeight: 1.8, margin: '0 0 24px', maxWidth: 480 }}>
                {tl('bh.copy_description')}
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
                  {tl('bh.back_synthesis')}
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
            lang={project.language || 'en'}
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
