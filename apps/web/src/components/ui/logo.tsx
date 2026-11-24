export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <defs>
          <linearGradient id="fjg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7c4dff" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#fjg)" />
        <path d="M11 9h11v3.2h-7.4v3h6.4v3.2h-6.4V23H11z" fill="#fff" />
      </svg>
      <span className="text-lg">Forjapp</span>
    </span>
  );
}
