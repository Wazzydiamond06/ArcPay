import { Navigate, useNavigate } from 'react-router-dom'
import { OnboardingWizard } from '@/components/receive/OnboardingWizard'
import { loadProfile, saveProfile, type ReceiverProfile } from '@/lib/receiver'

/** /receive: receiver onboarding. Returning receivers go straight to the dashboard. */
export default function Receive() {
  const navigate = useNavigate()

  if (loadProfile()) return <Navigate to="/receive/dashboard" replace />

  const complete = (profile: ReceiverProfile) => {
    saveProfile(profile)
    void navigate('/receive/dashboard')
  }

  return (
    <div className="relative isolate">
      <div className="mesh-bg absolute inset-x-0 top-0 -z-10 h-72 opacity-70" />
      <div className="mx-auto max-w-md px-4 pb-10 pt-8">
        <OnboardingWizard onComplete={complete} />
      </div>
    </div>
  )
}
