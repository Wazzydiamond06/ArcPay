import * as React from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-card backdrop-blur-xl', className)}
      {...props}
    />
  )
}
