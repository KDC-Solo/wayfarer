export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="var(--accent)" />
      <path
        d="M8 24 L16 8 L24 24"
        fill="none"
        stroke="var(--bg)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="8" r="2.2" fill="var(--bg)" />
    </svg>
  );
}
