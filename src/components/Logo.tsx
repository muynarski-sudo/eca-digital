import Image from 'next/image';

/** Logo Falando Francês (PNG com fundo transparente, 413x132). */
export function Logo({ height = 40, className = '' }: { height?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Falando Francês"
      width={Math.round((413 / 132) * height)}
      height={height}
      priority
      unoptimized
      className={className}
    />
  );
}
