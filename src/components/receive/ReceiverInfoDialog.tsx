import { Landmark } from 'lucide-react'
import { NameAvatar } from '@/components/NameAvatar'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { formatPhone } from '@/lib/arcpay'
import type { ReceiverProfile } from '@/lib/receiver'

export type ReceiverPanel = 'profile' | 'banks' | 'help'

const FAQ = [
  ['Where is my money?', 'Everything you receive and withdraw is listed under Transaction History.'],
  ['How do withdrawals work?', 'Choose Withdraw to Naira Account, enter an amount, and pick your bank. The account name must match your registered name.'],
  ['Can I withdraw to someone else?', 'No. Withdrawals only go to a bank account in your own name.'],
]

/** The three profile-menu panels: your details, saved banks (placeholder) and help. */
export function ReceiverInfoDialog({
  panel,
  onClose,
  profile,
}: {
  panel: ReceiverPanel | null
  onClose: () => void
  profile: ReceiverProfile
}) {
  const fullName = `${profile.firstName} ${profile.lastName}`
  return (
    <Dialog open={panel !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {panel === 'profile' && (
          <>
            <DialogTitle>My Profile</DialogTitle>
            <DialogDescription>The details your account was registered with.</DialogDescription>
            <div className="mt-6 flex flex-col items-center text-center">
              <NameAvatar name={fullName} size={72} />
              <p className="mt-3 text-2xl font-extrabold tracking-tight text-bronze">{fullName}</p>
            </div>
            <dl className="mt-6 space-y-3 rounded-2xl bg-white/70 p-4 text-bronze">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm font-semibold text-bronze/60">Legal name</dt>
                <dd className="font-bold">{fullName}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm font-semibold text-bronze/60">Phone number</dt>
                <dd className="font-bold tabular-nums">{formatPhone(profile.national)}</dd>
              </div>
            </dl>
          </>
        )}

        {panel === 'banks' && (
          <>
            <DialogTitle>Saved Banks</DialogTitle>
            <DialogDescription>Manage the bank accounts you withdraw to.</DialogDescription>
            <div className="mt-6 flex flex-col items-center rounded-2xl bg-white/70 px-6 py-8 text-center">
              <Landmark className="h-7 w-7 text-bronze/40" />
              <p className="mt-2 font-bold text-bronze">No saved banks yet</p>
              <p className="mt-1 text-pretty text-sm text-bronze/65">
                Saving your account number for faster withdrawals is coming soon. For now, enter your bank details each time you withdraw.
              </p>
            </div>
          </>
        )}

        {panel === 'help' && (
          <>
            <DialogTitle>Help &amp; Support</DialogTitle>
            <DialogDescription>Quick answers about your account.</DialogDescription>
            <dl className="mt-5 space-y-4">
              {FAQ.map(([question, answer]) => (
                <div key={question} className="rounded-2xl bg-white/70 p-4">
                  <dt className="font-bold text-bronze">{question}</dt>
                  <dd className="mt-1 text-pretty text-sm text-bronze/70">{answer}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
