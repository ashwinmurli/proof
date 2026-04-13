'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProofStore } from '@/store'
import DebriefModule from '@/components/modules/DebriefModule'

export default function DebriefPage() {
  const params = useParams()
  const router = useRouter()
  const { projects, setActiveProject } = useProofStore()

  const projectId = params.id as string
  const project = projects[projectId]

  useEffect(() => {
    if (!project) { router.push('/'); return }
    setActiveProject(projectId)
  }, [project, projectId, router, setActiveProject])

  if (!project) return null

  return <DebriefModule project={project} />
}
