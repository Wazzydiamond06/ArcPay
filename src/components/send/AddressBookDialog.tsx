import { BookUser, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { formatPhone } from '@/lib/arcpay'
import type { Contact } from '@/lib/addressBook'

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** Saved Nigerian recipients. Tap one to fill the phone number on the transfer form. */
export function AddressBookDialog({
  open,
  onOpenChange,
  contacts,
  onSelect,
  onRemove,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Contact[]
  onSelect: (contact: Contact) => void
  onRemove: (national: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Address Book</DialogTitle>
        <DialogDescription>Saved Nigerian phone numbers. Names come from verified accounts.</DialogDescription>

        {contacts.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-2xl bg-white/70 px-6 py-8 text-center">
            <BookUser className="h-7 w-7 text-bronze/40" />
            <p className="mt-2 font-bold text-bronze">No saved contacts yet</p>
            <p className="mt-1 text-sm text-bronze/65">
              Verify a recipient on the transfer form, then choose Save contact.
            </p>
          </div>
        ) : (
          <ul className="mt-5 max-h-[50dvh] space-y-2 overflow-y-auto">
            {contacts.map((c) => (
              <li key={c.national} className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/80 p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-gradient text-sm font-extrabold text-bronze-dark">
                  {initials(c.name)}
                </span>
                <button type="button" onClick={() => onSelect(c)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-bold text-bronze">{c.name}</p>
                  <p className="text-sm tabular-nums text-bronze/60">{formatPhone(c.national)}</p>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(c.national)}
                  aria-label={`Remove ${c.name}`}
                  className="grid h-9 w-9 place-items-center rounded-full text-bronze/50 transition hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
