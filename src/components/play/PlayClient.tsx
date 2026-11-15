'use client';
import { useEffect, useRef } from 'react';
import { mountPlay } from '@/lib/play/mount';

interface Props {
  vocab: Array<{ fr: string; pt: string }>;
  phrases: Array<{ fr: string; pt: string; pron?: string }>;
  storageKey: string;
}

/** Monta a área lúdica (módulo sem framework, compartilhado com a demo e o app instalável). */
export function PlayClient({ vocab, phrases, storageKey }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return mountPlay(ref.current, { vocab, phrases, storageKey });
  }, [vocab, phrases, storageKey]);
  return <div ref={ref} />;
}
