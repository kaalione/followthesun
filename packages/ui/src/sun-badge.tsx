interface SunBadgeProps {
  inSun: boolean | null;
  className?: string;
}

export function SunBadge({ inSun, className = '' }: SunBadgeProps) {
  if (inSun === null) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium bg-gray-100 text-gray-600 ${className}`}>
        <span>—</span> Okänd
      </span>
    );
  }

  return inSun ? (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold bg-amber-100 text-amber-800 ${className}`}>
      <span className="text-base">☀️</span> Sol just nu
    </span>
  ) : (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium bg-slate-100 text-slate-600 ${className}`}>
      <span className="text-base">🌥</span> I skugga
    </span>
  );
}
