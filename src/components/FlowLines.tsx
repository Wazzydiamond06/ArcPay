/** Decorative background: dashed curved network lines whose dashes flow continuously. */
const LINES = [
  { d: 'M-40 620 C 240 520, 420 760, 700 560 S 1160 240, 1480 300', cls: 'flow-line flow-fast', w: 2.5, o: 0.7 },
  { d: 'M-40 380 C 200 200, 460 460, 720 300 S 1180 520, 1480 420', cls: 'flow-line flow-slow', w: 2, o: 0.5 },
  { d: 'M-40 160 C 300 60, 520 280, 800 140 S 1200 60, 1480 180', cls: 'flow-line flow-rev', w: 1.75, o: 0.4 },
  { d: 'M-40 740 C 320 700, 600 820, 900 700 S 1260 660, 1480 760', cls: 'flow-line flow-slow', w: 1.75, o: 0.35 },
]

const NODES = [
  { x: 700, y: 560 },
  { x: 720, y: 300 },
  { x: 800, y: 140 },
]

export function FlowLines() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      viewBox="0 0 1440 800"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="flow-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {LINES.map((line) => (
        <path
          key={line.d}
          d={line.d}
          className={line.cls}
          stroke="url(#flow-gradient)"
          strokeWidth={line.w}
          strokeOpacity={line.o}
          strokeLinecap="round"
          strokeDasharray="4 18"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {NODES.map((n) => (
        <circle key={`${n.x}-${n.y}`} cx={n.x} cy={n.y} r="5" fill="#D97706" fillOpacity="0.55" />
      ))}
    </svg>
  )
}
