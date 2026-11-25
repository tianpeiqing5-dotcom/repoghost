// Small inline SVG ghost used across the UI (no external images).
export default function Ghost({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        fill="#e8f4ff"
        d="M32 4C18 4 10 16 10 30v26l6-6 6 6 5-5 5 5 5-5 5 5 6-6 6 6V30C54 16 46 4 32 4z"
      />
      <circle cx="24" cy="28" r="4" fill="#0b0e14" />
      <circle cx="40" cy="28" r="4" fill="#0b0e14" />
      <ellipse cx="32" cy="40" rx="4" ry="5" fill="#0b0e14" />
    </svg>
  )
}
