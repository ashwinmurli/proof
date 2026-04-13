'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Project } from '@/types'

interface StripProps {
  project: Project
  phase: string
  onAskProof: () => void
  thoughtCount?: number
  answeredCount?: number
  totalCount?: number
}

export default function Strip({
  project, phase, onAskProof,
  thoughtCount = 0, answeredCount = 0, totalCount = 5,
}: StripProps) {
  const router = useRouter()

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10, height: 56,
      background: '#F5F2EB',
      borderBottom: '1px solid rgba(184,179,172,0.35)',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '0 44px',
      flexShrink: 0,
    }}>
      {/* Left — wordmark */}
      <button
        onClick={() => router.push(`/project/${project.id}`)}
        style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 300, letterSpacing: '0.15em', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dark)', padding: 0, justifySelf: 'start' }}
      >
        proof<span style={{ color: 'var(--mango)' }}>.</span>
      </button>

      {/* Centre — project name above progress marks */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: '0.03em', lineHeight: 1 }}>
          {project.name || 'Untitled'}
        </span>
        {totalCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {Array.from({ length: totalCount }).map((_, i) => (
              <motion.div
                key={i}
                style={{ width: 18, height: 2, borderRadius: 1 }}
                animate={{ background: i < answeredCount ? 'var(--mango)' : 'rgba(184,179,172,0.45)' }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right — notes + ask + settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifySelf: 'end' }}>
        <AnimatePresence>
          {thoughtCount > 0 && (
            <motion.button
              initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.2 }}
              onClick={onAskProof}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px', borderRadius: 20, transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,161,10,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <motion.div
                style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--mango)' }}
                animate={{ boxShadow: ['0 0 0 0px rgba(255,161,10,0.5)', '0 0 0 4px rgba(255,161,10,0)', '0 0 0 0px rgba(255,161,10,0.5)'] }}
                transition={{ duration: 2.2, repeat: Infinity }}
              />
              <span style={{ fontSize: 11, color: 'var(--mango)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                {thoughtCount} {thoughtCount === 1 ? 'note' : 'notes'}
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        <button
          onClick={onAskProof}
          style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--concrete)', background: 'none', border: '1px solid rgba(184,179,172,0.6)', borderRadius: 20, padding: '5px 14px 5px 9px', cursor: 'pointer', transition: 'all 0.18s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--concrete)'; e.currentTarget.style.color = 'var(--dark)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(184,179,172,0.6)'; e.currentTarget.style.color = 'var(--concrete)' }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block', animation: 'breathe 3s ease-in-out infinite' }} />
          Ask proof.
        </button>

        <button
          onClick={() => router.push('/settings')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--stone)', fontSize: 15, lineHeight: 1, padding: '2px 4px', transition: 'color 0.18s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--concrete)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--stone)')}
        >⚙</button>
      </div>

      <style>{`@keyframes breathe { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.65)} }`}</style>
    </div>
  )
}
