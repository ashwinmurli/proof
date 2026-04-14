'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProofStore } from '@/store'
import NamingModule from '@/components/modules/synthesis/NamingModule'

export default function NamingPage() {
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
  return <NamingModule project={project} />
}
