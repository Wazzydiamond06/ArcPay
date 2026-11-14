import { toast } from 'sonner'

/** Subtle red-tinted error toast. A stable id prevents stacking while the user keeps typing. */
export function errorToast(id: string, message: string, duration = 4000) {
  toast.error(message, {
    id,
    duration,
    className: '!rounded-2xl !border !border-red-300/70 !bg-red-50/95 !text-red-800 !shadow-lg backdrop-blur',
  })
}

export function clearToast(id: string) {
  toast.dismiss(id)
}
