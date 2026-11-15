/** Faixa tricolor fina (azul, branco, vermelho). Decorativa. */
export function TricolorBar({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex h-1.5 w-full ${className}`}>
      <div className="flex-1 bg-brand-blue" />
      <div className="flex-1 border-y border-line bg-white" />
      <div className="flex-1 bg-brand-red" />
    </div>
  );
}
