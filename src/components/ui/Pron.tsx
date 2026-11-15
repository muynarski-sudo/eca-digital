/** Francês em destaque, pronúncia aportuguesada em cinza entre parênteses e tradução logo abaixo. */
export function FrenchLine({ fr, pt, pron, size = 'md' }: { fr: string; pt?: string; pron?: string; size?: 'md' | 'lg' }) {
  return (
    <div>
      <p lang="fr" className={`font-bold text-brand-blue-dark ${size === 'lg' ? 'text-2xl' : 'text-lg'}`}>
        {fr} {pron && <span className="text-base font-normal text-ink-muted">({pron})</span>}
      </p>
      {pt && <p className="text-ink-soft">{pt}</p>}
    </div>
  );
}
