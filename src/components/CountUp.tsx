import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

const format = (n: number, decimals: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

/**
 * Counts from the previous value (0 on first load) to `value` over `duration` seconds.
 * Renders with tabular figures so digits keep a fixed width while counting.
 */
export function CountUp({
  value,
  duration = 1,
  prefix = '',
  decimals = 2,
  className,
}: {
  value: number
  duration?: number
  prefix?: string
  decimals?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(reduce ? value : 0)
  const current = useRef(reduce ? value : 0)

  useEffect(() => {
    const controls = animate(current.current, value, {
      duration: reduce ? 0 : duration,
      ease: 'easeOut',
      onUpdate: (v) => {
        current.current = v
        setDisplay(v)
      },
    })
    return () => controls.stop()
  }, [value, duration, reduce])

  return (
    <span
      className={className}
      style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}
      aria-label={`${prefix}${format(value, decimals)}`}
    >
      {prefix}
      {format(display, decimals)}
    </span>
  )
}
