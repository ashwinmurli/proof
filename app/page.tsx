'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProofStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'

function projectStageLabel(status: string): string {
  switch (status) {
    case 'brief': return 'Discovery — Brief'
    case 'debrief': return 'Discovery — Debrief'
    case 'synthesis': return 'Synthesis'
    case 'complete': return 'Complete'
    default: return 'Just started'
  }
}

function projectPath(status: string, id: string): string {
  switch (status) {
    case 'brief': return `/project/${id}/brief`
    case 'debrief': return `/project/${id}/debrief`
    case 'synthesis': return `/project/${id}/synthesis`
    default: return `/project/${id}`
  }
}

export default function Home() {
  const router = useRouter()
  const { createProject, projects, deleteProject } = useProofStore()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const existingProjects = Object.values(projects).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
  const hasProjects = existingProjects.length > 0

  useEffect(() => {
    const key = localStorage.getItem('proof-api-key')
    setHasApiKey(!!key)
    // Show form immediately if no projects
    if (Object.keys(projects).length === 0) setShowNewForm(true)
  }, [])

  function handleStart() {
    if (loading || !desc.trim()) return
    setLoading(true)
    const id = createProject(name, desc)
    router.push(`/project/${id}/brief`)
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--surface-2)',
    border: '1px solid var(--aluminum)',
    borderRadius: 6,
    padding: '12px 16px',
    fontFamily: 'var(--font-sans)',
    fontSize: 14,
    fontWeight: 300,
    color: 'var(--dark)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  } as React.CSSProperties

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Top strip */}
      <div style={{
        height: 52,
        borderBottom: '1px solid rgba(194,189,183,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 44px',
        background: 'var(--bg)',
      }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, letterSpacing: '0.15em' }}>
          proof<span style={{ color: 'var(--mango)' }}>.</span>
        </div>
        <button
          onClick={() => router.push('/settings')}
          style={{
            fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--stone)',
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--concrete)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--stone)')}
        >
          {!hasApiKey && (
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--mango)', display: 'inline-block',
              animation: 'breathe 2s ease-in-out infinite',
            }} />
          )}
          Settings
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '64px 24px 80px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>

            {/* Wordmark */}
            <div style={{ marginBottom: hasProjects ? 48 : 40 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 24, fontWeight: 300, letterSpacing: '0.15em', marginBottom: 6 }}>
                proof<span style={{ color: 'var(--mango)' }}>.</span>
              </div>
              {!hasProjects && (
                <p style={{ fontSize: 14, color: 'var(--stone)', lineHeight: 1.7, fontWeight: 300 }}>
                  Brand strategy that fits like a tailored suit.
                </p>
              )}
            </div>

            {/* Existing projects — shown first for returning users */}
            {hasProjects && (
              <div style={{ marginBottom: 48 }}>
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 14 }}>
                  Projects
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {existingProjects.slice(0, 6).map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      style={{ borderBottom: '1px solid rgba(194,189,183,0.35)' }}
                    >
                      {confirmDelete === p.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0' }}>
                          <span style={{ fontSize: 12, color: 'var(--concrete)', fontWeight: 300 }}>Delete {p.name || 'this project'}?</span>
                          <div style={{ display: 'flex', gap: 14 }}>
                            <button onClick={() => { deleteProject(p.id); setConfirmDelete(null) }}
                              style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#b91c1c', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 400 }}>
                              Delete
                            </button>
                            <button onClick={() => setConfirmDelete(null)}
                              style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0' }}
                          onMouseEnter={e => { const b = e.currentTarget.querySelector('.del-btn') as HTMLElement; if (b) b.style.opacity = '1' }}
                          onMouseLeave={e => { const b = e.currentTarget.querySelector('.del-btn') as HTMLElement; if (b) b.style.opacity = '0' }}
                        >
                          <button onClick={() => router.push(projectPath(p.status, p.id))}
                            style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 400, color: 'var(--dark)' }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--stone)', fontWeight: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.description ? (p.description.length > 48 ? p.description.slice(0, 48).trimEnd() + '…' : p.description) : projectStageLabel(p.status)}
                            </div>
                          </button>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 12 }}>
                            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--aluminum)' }}>
                              {projectStageLabel(p.status)}
                            </div>
                            <button className="del-btn" onClick={() => setConfirmDelete(p.id)}
                              style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--aluminum)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s, color 0.15s', lineHeight: 1, padding: '0 2px' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#b91c1c'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--aluminum)'}>
                              ×
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* API key warning */}
            {!hasApiKey && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{
                  padding: '13px 16px', background: 'var(--surface-1)',
                  border: '1px solid var(--aluminum)', borderLeft: '2px solid var(--mango)',
                  borderRadius: '0 6px 6px 0', marginBottom: 24,
                }}
              >
                <p style={{ fontSize: 13, color: 'var(--concrete)', lineHeight: 1.6, fontWeight: 300 }}>
                  Add your Anthropic API key in{' '}
                  <button
                    onClick={() => router.push('/settings')}
                    style={{ background: 'none', border: 'none', color: 'var(--mango)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)', padding: 0, fontWeight: 400 }}
                  >
                    Settings
                  </button>
                  {' '}to enable proof.
                </p>
              </motion.div>
            )}

            {/* New project — toggle for returning users */}
            {hasProjects && !showNewForm ? (
              <button
                onClick={() => setShowNewForm(true)}
                style={{
                  fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 400,
                  color: 'var(--stone)', background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 7,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--dark)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--stone)')}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
                New project
              </button>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={hasProjects ? { opacity: 0, y: 8 } : { opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 8 }}>
                      Working title
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && document.getElementById('desc')?.focus()}
                      placeholder="e.g. Keel — or leave blank"
                      style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--mango)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,161,10,0.08)' }}
                      onBlur={e => { e.target.style.borderColor = 'var(--aluminum)'; e.target.style.boxShadow = 'none' }}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 8 }}>
                      What is this brand building?
                    </label>
                    <input
                      id="desc"
                      type="text"
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleStart()}
                      placeholder="e.g. Financial planning for people going through divorce"
                      style={inputStyle}
                      autoFocus={hasProjects}
                      onFocus={e => { e.target.style.borderColor = 'var(--mango)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,161,10,0.08)' }}
                      onBlur={e => { e.target.style.borderColor = 'var(--aluminum)'; e.target.style.boxShadow = 'none' }}
                    />
                    {!desc.trim() && (
                      <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 6, lineHeight: 1.5 }}>
                        Required — seeds every AI call.
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={handleStart}
                      disabled={loading || !desc.trim()}
                      style={{
                        flex: 1,
                        background: loading || !desc.trim() ? 'var(--aluminum)' : 'var(--dark)',
                        color: '#FDFCFA',
                        border: 'none', borderRadius: 6, padding: '13px',
                        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                        letterSpacing: '0.06em',
                        cursor: loading || !desc.trim() ? 'default' : 'pointer',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => { if (!loading && desc.trim()) e.currentTarget.style.background = 'var(--mango)' }}
                      onMouseLeave={e => { if (!loading && desc.trim()) e.currentTarget.style.background = 'var(--dark)' }}
                    >
                      {loading ? 'Starting…' : 'Begin Discovery →'}
                    </button>
                    {hasProjects && (
                      <button
                        onClick={() => { setShowNewForm(false); setName(''); setDesc('') }}
                        style={{
                          background: 'none', border: '1px solid var(--aluminum)',
                          borderRadius: 6, padding: '13px 16px',
                          fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)',
                          cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--stone)'; e.currentTarget.style.color = 'var(--dark)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--aluminum)'; e.currentTarget.style.color = 'var(--stone)' }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        </div>
      </div>

      <style>{`@keyframes breathe { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </main>
  )
}
