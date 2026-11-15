import type { HotmartEvent } from './hotmart';

export type SubStatus = 'active' | 'past_due' | 'canceled' | 'refunded' | 'chargeback';

export interface BillingStore {
  /** Registra o evento. Devolve false se já foi processado ou ignorado (reenvio). Evento que falhou antes volta a ser processável. */
  recordEvent(key: string, type: string, payload: unknown): Promise<boolean>;
  finishEvent(key: string, status: 'processed' | 'ignored' | 'failed', detail?: string): Promise<void>;
  findStudentByEmail(email: string): Promise<string | null>;
  getSubscription(externalId: string): Promise<{ id: string; lastEventAt: Date | null; validUntil: Date | null } | null>;
  upsertSubscription(s: { studentId: string; externalId: string; status: SubStatus; validUntil: Date | null; lastEventAt: Date }): Promise<void>;
  setSubscriptionStatus(externalId: string, status: SubStatus, lastEventAt: Date, validUntil?: Date | null): Promise<void>;
  upsertPendingGrant(g: { email: string; externalId: string; status: SubStatus; validUntil: Date | null; lastEventAt: Date }): Promise<void>;
  inviteByEmail?(email: string): Promise<void>;
}

export type ProcessResult = { outcome: 'processed' | 'duplicate' | 'ignored'; detail?: string };

const DAY = 86_400_000;

export interface ProcessOptions {
  /** Dias de acesso concedidos a cada cobrança aprovada (mensal + margem). */
  periodDays?: number;
  now?: Date;
}

/** Aplica um evento da Hotmart. Idempotente: o mesmo evento nunca é aplicado duas vezes, e eventos fora de ordem não desfazem os mais novos. */
export async function processHotmartEvent(store: BillingStore, ev: HotmartEvent, raw: unknown, opts: ProcessOptions = {}): Promise<ProcessResult> {
  const periodDays = opts.periodDays ?? 32;
  const fresh = await store.recordEvent(ev.eventKey, ev.eventType, raw);
  if (!fresh) return { outcome: 'duplicate' };
  try {
    if (ev.action === 'ignore') {
      await store.finishEvent(ev.eventKey, 'ignored', `evento sem efeito: ${ev.eventType}`);
      return { outcome: 'ignored', detail: ev.eventType };
    }
    if (!ev.transaction || !ev.email) {
      await store.finishEvent(ev.eventKey, 'ignored', 'sem transação ou e-mail');
      return { outcome: 'ignored', detail: 'payload incompleto' };
    }
    const existing = await store.getSubscription(ev.transaction);
    if (existing?.lastEventAt && existing.lastEventAt.getTime() > ev.occurredAt.getTime()) {
      await store.finishEvent(ev.eventKey, 'ignored', 'evento mais antigo que o já aplicado');
      return { outcome: 'ignored', detail: 'fora de ordem' };
    }
    const status: SubStatus =
      ev.action === 'activate' ? 'active' : ev.action === 'cancel' ? 'canceled' : ev.action === 'refund' ? 'refunded' : ev.action === 'chargeback' ? 'chargeback' : 'past_due';
    const base = ev.approvedAt ?? ev.occurredAt;
    const validUntil = ev.action === 'activate' ? new Date(base.getTime() + periodDays * DAY) : null;

    const studentId = await store.findStudentByEmail(ev.email);
    if (!studentId) {
      await store.upsertPendingGrant({ email: ev.email, externalId: ev.transaction, status, validUntil, lastEventAt: ev.occurredAt });
      await store.inviteByEmail?.(ev.email);
      await store.finishEvent(ev.eventKey, 'processed', 'comprador ainda sem cadastro: acesso pendente');
      return { outcome: 'processed', detail: 'pending' };
    }
    if (existing) {
      // cancelamento mantém a validade já paga; reembolso, chargeback e atraso preservam a data só para histórico
      await store.setSubscriptionStatus(ev.transaction, status, ev.occurredAt, ev.action === 'activate' ? validUntil : undefined);
    } else {
      await store.upsertSubscription({ studentId, externalId: ev.transaction, status, validUntil, lastEventAt: ev.occurredAt });
    }
    await store.finishEvent(ev.eventKey, 'processed', status);
    return { outcome: 'processed', detail: status };
  } catch (e) {
    await store.finishEvent(ev.eventKey, 'failed', e instanceof Error ? e.message : String(e));
    throw e;
  }
}
