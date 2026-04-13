'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Project } from '@/types'
import { useProofStream } from '@/lib/useProofStream'

interface StripProps {
  project: Project
  phase: string
  onAskProof: () => void
  thoughtCount?: number
}

export default function Strip({ project, phase, onAskProof, thoughtCount = 0 }: StripProps) {
  const router = useRouter()
  const btnRef = useRef<HTMLButtonElement>(null)

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      height: 52,
      background: '#F5F2EB',
      borderBottom: '1px solid rgba(184,179,172,0.35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 44px',
      flexShrink: 0,
    }}>
      <button
        onClick={() => router.push(`/project/${project.id}`)}
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 300,
          letterSpacing: '0.15em',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--dark)',
          padding: 0,
        }}
      >
        proof<span style={{ color: 'var(--mango)' }}>.</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 12, color: 'var(--stone)' }}>
          {project.name ? `${project.name}` : ''}
        </span>
        {project.name && (
          <span style={{ fontSize: 12, color: '#D5D4D6' }}>·</span>
        )}
        <span style={{ fontSize: 12, color: 'var(--stone)' }}>{phase}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* proof. thoughts indicator — in the strip */}
        <AnimatePresence>
          {thoughtCount > 0 && (
            <motion.button
              ref={btnRef}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={onAskProof}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 10px 4px 8px',
                borderRadius: 20,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,161,10,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <motion.div
                style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--mango)', flexShrink: 0 }}
                animate={{
                  boxShadow: [
                    '0 0 0 0px rgba(255,161,10,0.5)',
                    '0 0 0 4px rgba(255,161,10,0)',
                    '0 0 0 0px rgba(255,161,10,0.5)',
                  ]
                }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span style={{
                fontSize: 11,
                fontWeight: 400,
                color: 'var(--mango)',
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                letterSpacing: '0.01em',
              }}>
                {thoughtCount} {thoughtCount === 1 ? 'note' : 'notes'}
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Ask proof. button */}
        <button
          onClick={onAskProof}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--concrete)',
            background: 'none',
            border: '1px solid rgba(184,179,172,0.6)',
            borderRadius: 20,
            padding: '5px 14px 5px 9px',
            cursor: 'pointer',
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--concrete)'
            e.currentTarget.style.color = 'var(--dark)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(184,179,172,0.6)'
            e.currentTarget.style.color = 'var(--concrete)'
          }}
        >
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'var(--mango)', display: 'inline-block',
            animation: 'breathe 3s ease-in-out infinite',
          }} />
          Ask proof.
        </button>

        <button
          onClick={() => router.push('/settings')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--stone)', fontSize: 15, lineHeight: 1,
            padding: '2px 4px', transition: 'color 0.18s',
          }}
          title="Settings"
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--concrete)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--stone)')}
        >
          ⚙
        </button>
      </div>

      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.65); }
        }
      `}</style>
    </div>
  )
}
