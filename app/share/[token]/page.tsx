'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useProofStore } from '@/store'
import { Project } from '@/types'
import BriefModule from '@/components/modules/BriefModule'

export default function SharePage() {
  const params = useParams()
  const token = params.token as string
  const { projects } = useProofStore()
  const [project, setProject] = useState<Project | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    // Find project by share token
    const found = Object.values(projects).find(p => p.shareToken === token)
    if (found) {
      setProject(found)
    } else {
      setNotFound(true)
    }
  }, [token, projects])

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 24, fontWeight: 300, letterSpacing: '0.15em', marginBottom: 16 }}>
            proof<span style={{ color: 'var(--mango)' }}>.</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--concrete)', lineHeight: 1.7 }}>
            This link doesn&apos;t match any active brief. It may have expired or been changed.
          </p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mango)', animation: 'breathe 1.5s ease-in-out infinite' }} />
        <style>{`@keyframes breathe { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.6)} }`}</style>
      </div>
    )
  }

  return <BriefModule project={project} mode="client" />
}
