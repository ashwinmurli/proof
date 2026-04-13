'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function SettingsPage() {
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('proof-api-key')
    if (stored) setApiKey(stored)
  }, [])

  function save() {
    if (apiKey.trim()) {
      localStorage.setItem('proof-api-key', apiKey.trim())
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Strip */}
      <div style={{
        height: 52,
        background: 'var(--bg)',
        borderBottom: '1px solid rgba(194,189,183,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 44px',
      }}>
        <button
          onClick={() => router.push('/')}
          style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 300, letterSpacing: '0.15em', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          proof<span style={{ color: 'var(--mango)' }}>.</span>
        </button>
        <div style={{ fontSize: 12, color: 'var(--stone)' }}>Settings</div>
        <div style={{ width: 80 }} />
      </div>

      <main style={{ flex: 1, maxWidth: 560, width: '100%', margin: '0 auto', padding: '80px 24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 36,
            fontWeight: 400,
            color: 'var(--dark)',
            marginBottom: 48,
          }}>
            Settings
          </h1>

          {/* API Key */}
          <div style={{ marginBottom: 40 }}>
            <div style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--stone)',
              marginBottom: 8,
            }}>
              Anthropic API Key
            </div>
            <p style={{ fontSize: 13, color: 'var(--concrete)', lineHeight: 1.7, marginBottom: 16, fontWeight: 300 }}>
              proof. calls the Anthropic API to power its thinking. Your key is stored only in this browser and never sent anywhere else.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && save()}
                placeholder="sk-ant-..."
                style={{
                  flex: 1,
                  background: '#FDFCFA',
                  border: '1px solid var(--aluminum)',
                  borderRadius: 6,
                  padding: '11px 16px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  fontWeight: 300,
                  color: 'var(--dark)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--mango)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(255,161,10,0.08)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--aluminum)'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button
                onClick={save}
                style={{
                  background: saved ? 'var(--mango)' : 'var(--dark)',
                  color: '#FDFCFA',
                  border: 'none',
                  borderRadius: 6,
                  padding: '11px 20px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {saved ? 'Saved ✓' : 'Save'}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(194,189,183,0.5)', marginBottom: 40 }} />

          {/* About */}
          <div>
            <div style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--stone)',
              marginBottom: 12,
            }}>
              About
            </div>
            <p style={{ fontSize: 13, color: 'var(--concrete)', lineHeight: 1.8, fontWeight: 300 }}>
              proof. is a brand strategy partner for creative directors and strategists.
              Built on the conviction that good brand work requires both rigorous thinking
              and genuine creative courage — and that the right questions, asked well,
              make the difference.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
