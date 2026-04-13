'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProofStore } from '@/store'
import { motion } from 'framer-motion'

export default function Home() {
  const router = useRouter()
  const { createProject, projects } = useProofStore()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)

  const existingProjects = Object.values(projects).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  useEffect(() => {
    const key = localStorage.getItem('proof-api-key')
    setHasApiKey(!!key)
  }, [])

  function handleStart() {
    if (loading) return
    setLoading(true)
    const id = createProject(name, desc)
    router.push(`/project/${id}/brief`)
  }

  const inputStyle = {
    width: '100%',
    background: '#FDFCFA',
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
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top strip */}
      <div style={{
        height: 52,
        borderBottom: '1px solid rgba(194,189,183,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 44px',
      }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 300, letterSpacing: '0.15em' }}>
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
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--mango)', display: 'inline-block',
              animation: 'breathe 2s ease-in-out infinite',
            }} />
          )}
          Settings
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '80px 24px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 300, letterSpacing: '0.15em', marginBottom: 8 }}>
              proof<span style={{ color: 'var(--mango)' }}>.</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--concrete)', lineHeight: 1.75, marginBottom: 52, fontWeight: 300 }}>
              Brand strategy that fits like a tailored suit.
            </p>

            {/* API key warning */}
            {!hasApiKey && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  padding: '14px 18px',
                  background: '#FDFCFA',
                  border: '1px solid var(--aluminum)',
                  borderLeft: '2px solid var(--mango)',
                  borderRadius: '0 6px 6px 0',
                  marginBottom: 32,
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

            {/* New project */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 8 }}>
                Working title or project name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && document.getElementById('desc')?.focus()}
                placeholder="e.g. Keel, or leave blank"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--mango)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,161,10,0.08)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--aluminum)'; e.target.style.boxShadow = 'none' }}
              />
              <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 6, lineHeight: 1.6 }}>
                The brand may not have a name yet. The Naming module handles that.
              </p>
            </div>

            <div style={{ marginBottom: 28 }}>
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
                onFocus={e => { e.target.style.borderColor = 'var(--mango)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,161,10,0.08)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--aluminum)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <button
              onClick={handleStart}
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? 'var(--concrete)' : 'var(--dark)',
                color: '#FDFCFA',
                border: 'none',
                borderRadius: 6,
                padding: '14px',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.07em',
                cursor: loading ? 'default' : 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = 'var(--mango)') }}
              onMouseLeave={e => { if (!loading) (e.currentTarget.style.background = 'var(--dark)') }}
            >
              {loading ? 'Starting…' : 'Begin Discovery →'}
            </button>

            {/* Existing projects */}
            {existingProjects.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{ marginTop: 56 }}
              >
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>
                  Recent projects
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {existingProjects.slice(0, 5).map(p => (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/project/${p.id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 0',
                        borderBottom: '1px solid rgba(194,189,183,0.4)',
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'opacity 0.15s',
                      } as React.CSSProperties}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.65')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 400, color: 'var(--dark)', marginBottom: 2 }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 300 }}>
                          {p.description || p.status}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--aluminum)' }}>→</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      <style>{`@keyframes breathe { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </main>
  )
}
