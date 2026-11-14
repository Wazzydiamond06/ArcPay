import { Navigate, useNavigate } from 'react-router-dom'
import { SenderOnboarding } from '@/components/send/SenderOnboarding'
import { Skeleton } from '@/components/ui/skeleton'
import { saveSenderProfile, type SenderProfile } from '@/lib/sender'
import { useSenderSession } from '@/lib/useSenderSession'

/** /send: sender onboarding. A wallet that is already connected with a saved profile skips straight to the dashboard. */
export default function Send() {
  const navigate = useNavigate()
  const session = useSenderSession()

  if (session.active) return <Navigate to="/send/dashboard" replace />

  const complete = (profile: SenderProfile) => {
    saveSenderProfile(profile)
    void navigate('/send/dashboard')
  }

  return (
    <div className="relative isolate">
      <div className="mesh-bg absolute inset-x-0 top-0 -z-10 h-72 opacity-70" />
      <div className="mx-auto max-w-md px-4 pb-10 pt-8">
        {session.settling ? (
          // Restoring the previous wallet session: show the shape of the next screen, not the connect hook.
          <div role="status" aria-label="Restoring your session" className="flex min-h-[60dvh] flex-col justify-center gap-4">
            <Skeleton className="mx-auto h-9 w-4/5" />
            <Skeleton className="mx-auto h-9 w-3/5" />
            <Skeleton className="mx-auto mt-2 h-5 w-2/3" />
            <Skeleton className="mt-8 h-16 w-full rounded-full" />
          </div>
        ) : (
          <SenderOnboarding onComplete={complete} />
        )}
      </div>
    </div>
  )
}
