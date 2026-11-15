/** Anel de progresso (azul da marca). Mostra o percentual no centro e expõe o valor para leitores de tela. */
export function ProgressRing({
  value,
  size = 128,
  label,
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const stroke = Math.max(8, size / 12);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ?? 'Progresso'}: ${pct}%`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-blue-tint)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-brand-blue)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <span
        className="absolute text-center font-bold text-brand-blue-dark"
        style={{ fontSize: size / 4.2 }}
      >
        {pct}%
      </span>
    </div>
  );
}
