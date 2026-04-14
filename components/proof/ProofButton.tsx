'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface ProofButtonProps {
  onClick: (e: React.MouseEvent) => void
  children: ReactNode
  disabled?: boolean
  size?: 'sm' | 'md'
  variant?: 'outline' | 'solid'
  pulsing?: boolean
  style?: React.CSSProperties
}

export default function ProofButton({
  onClick, children, disabled = false,
  size = 'sm', variant = 'outline',
  pulsing = false, style = {},
}: ProofButtonProps) {
  const isSmall = size === 'sm'

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: isSmall ? 6 : 8,
    fontFamily: 'var(--font-sans)',
    fontSize: isSmall ? 11 : 13,
    fontWeight: 400,
    letterSpacing: '0.01em',
    borderRadius: 20,
    border: variant === 'outline' ? '1px solid rgba(184,179,172,0.6)' : 'none',
    background: variant === 'solid' ? 'var(--dark)' : 'none',
    color: variant === 'solid' ? '#FDFCFA' : 'var(--concrete)',
    padding: isSmall ? '4px 14px 4px 9px' : '8px 18px 8px 12px',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'all 0.18s',
    flexShrink: 0,
    ...style,
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={base}
      onMouseEnter={e => {
        if (disabled) return
        if (variant === 'outline') {
          e.currentTarget.style.borderColor = 'rgba(255,161,10,0.5)'
          e.currentTarget.style.color = 'var(--dark)'
        } else {
          e.currentTarget.style.background = 'var(--mango)'
        }
      }}
      onMouseLeave={e => {
        if (disabled) return
        if (variant === 'outline') {
          e.currentTarget.style.borderColor = 'rgba(184,179,172,0.6)'
          e.currentTarget.style.color = 'var(--concrete)'
        } else {
          e.currentTarget.style.background = 'var(--dark)'
        }
      }}
    >
      {/* proof. dot — always present */}
      <motion.span
        style={{
          width: isSmall ? 5 : 6,
          height: isSmall ? 5 : 6,
          borderRadius: '50%',
          background: variant === 'solid' ? 'rgba(255,255,255,0.6)' : 'var(--mango)',
          display: 'inline-block',
          flexShrink: 0,
        }}
        animate={pulsing ? {
          boxShadow: [
            '0 0 0 0px rgba(255,161,10,0.5)',
            '0 0 0 4px rgba(255,161,10,0)',
            '0 0 0 0px rgba(255,161,10,0.5)',
          ]
        } : {}}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {children}
    </button>
  )
}
