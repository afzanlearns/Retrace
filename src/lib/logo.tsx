export function RetraceLogo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 1 9 9" />
      <path d="M3 12h6l-3 4-3-4z" />
    </svg>
  );
}

export function RetraceWordmark({ className }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className ?? ""}`}>
      Retrace
    </span>
  );
}
