import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

/**
 * ATENÇÃO: os nomes de evento e o formato do payload abaixo NÃO foram confirmados na documentação oficial
 * (developers.hotmart.com ficou inacessível neste ambiente). Foram montados a partir de integrações de terceiros
 * e do formato conhecido da versão 2.0.0. Confirme com um webhook de teste do painel da Hotmart antes de produção
 * (ver DECISIONS.md, seção Hotmart). Todo o mapeamento está concentrado aqui de propósito.
 */
export type BillingAction = 'activate' | 'cancel' | 'refund' | 'chargeback' | 'past_due' | 'ignore';

export const EVENT_ACTIONS: Record<string, BillingAction> = {
  PURCHASE_APPROVED: 'activate',
  PURCHASE_COMPLETE: 'activate',
  PURCHASE_CANCELED: 'cancel',
  SUBSCRIPTION_CANCELLATION: 'cancel',
  PURCHASE_REFUNDED: 'refund',
  PURCHASE_CHARGEBACK: 'chargeback',
  PURCHASE_DELAYED: 'past_due',
  PURCHASE_EXPIRED: 'past_due',
};

const payloadSchema = z.object({
  id: z.string().optional(),
  event: z.string().min(1),
  version: z.string().optional(),
  creation_date: z.union([z.number(), z.string()]).optional(),
  hottok: z.string().optional(),
  data: z
    .object({
      buyer: z.object({ email: z.string().email().optional() }).partial().optional(),
      subscriber: z.object({ email: z.string().email().optional() }).partial().optional(),
      purchase: z
        .object({
          transaction: z.string().optional(),
          status: z.string().optional(),
          approved_date: z.union([z.number(), z.string()]).optional(),
        })
        .partial()
        .optional(),
      subscription: z.object({ status: z.string().optional() }).partial().optional(),
    })
    .partial()
    .optional(),
});

export interface HotmartEvent {
  eventKey: string;
  eventType: string;
  action: BillingAction;
  email: string | null;
  transaction: string | null;
  occurredAt: Date;
  approvedAt: Date | null;
}

const toDate = (v: number | string | undefined): Date | null => {
  if (v === undefined) return null;
  const d = typeof v === 'number' ? new Date(v) : new Date(/^\d+$/.test(v) ? Number(v) : v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function parseHotmart(raw: string, body: unknown): HotmartEvent {
  const p = payloadSchema.parse(body);
  const email =
    (p.data?.buyer?.email ?? p.data?.subscriber?.email ?? null)?.trim().toLowerCase() ?? null;
  const transaction = p.data?.purchase?.transaction ?? null;
  const occurredAt = toDate(p.creation_date) ?? new Date();
  const eventKey = p.id ?? createHash('sha256').update(raw).digest('hex');
  return {
    eventKey,
    eventType: p.event,
    action: EVENT_ACTIONS[p.event] ?? 'ignore',
    email,
    transaction,
    occurredAt,
    approvedAt: toDate(p.data?.purchase?.approved_date),
  };
}

/** Comparação em tempo constante (hash dos dois lados para igualar o tamanho). */
export function verifyHottok(received: string | null | undefined, expected: string): boolean {
  if (!received || !expected) return false;
  const a = createHash('sha256').update(received).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/** O token chega no cabeçalho X-HOTMART-HOTTOK (confirmado por integrações de terceiros) ou, em versões antigas, no corpo. */
export function extractHottok(headers: Pick<Headers, 'get'>, body: unknown): string | null {
  const fromHeader = headers.get('x-hotmart-hottok');
  if (fromHeader) return fromHeader;
  const b = body as { hottok?: unknown } | null;
  return typeof b?.hottok === 'string' ? b.hottok : null;
}
