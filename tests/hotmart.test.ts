import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractHottok, parseHotmart, verifyHottok } from '@/lib/billing/hotmart';
import { processHotmartEvent, type BillingStore, type SubStatus } from '@/lib/billing/process';

class MemStore implements BillingStore {
  events = new Map<string, { type: string; status: string; detail?: string }>();
  subs = new Map<
    string,
    { studentId: string; status: SubStatus; validUntil: Date | null; lastEventAt: Date }
  >();
  pending = new Map<string, { email: string; status: SubStatus }>();
  students = new Map<string, string>([['aluno@x.com', 'student-1']]);
  invited: string[] = [];
  failNext = false;
  async recordEvent(key: string, type: string) {
    const e = this.events.get(key);
    if (e && e.status !== 'failed') return false;
    this.events.set(key, { type, status: 'received' });
    return true;
  }
  async finishEvent(key: string, status: 'processed' | 'ignored' | 'failed', detail?: string) {
    this.events.set(key, { ...(this.events.get(key) ?? { type: '' }), status, detail });
  }
  async findStudentByEmail(email: string) {
    return this.students.get(email) ?? null;
  }
  async getSubscription(id: string) {
    const s = this.subs.get(id);
    return s ? { id, lastEventAt: s.lastEventAt, validUntil: s.validUntil } : null;
  }
  async upsertSubscription(s: {
    studentId: string;
    externalId: string;
    status: SubStatus;
    validUntil: Date | null;
    lastEventAt: Date;
  }) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('banco fora do ar');
    }
    this.subs.set(s.externalId, s);
  }
  async setSubscriptionStatus(
    id: string,
    status: SubStatus,
    lastEventAt: Date,
    validUntil?: Date | null,
  ) {
    const s = this.subs.get(id)!;
    this.subs.set(id, {
      ...s,
      status,
      lastEventAt,
      validUntil: validUntil === undefined ? s.validUntil : validUntil,
    });
  }
  async upsertPendingGrant(g: { email: string; externalId: string; status: SubStatus }) {
    this.pending.set(g.externalId, { email: g.email, status: g.status });
  }
  async inviteByEmail(email: string) {
    this.invited.push(email);
  }
}

const payload = (
  event: string,
  over: Record<string, unknown> = {},
  id = `evt-${event}-${Math.random()}`,
) => ({
  id,
  event,
  version: '2.0.0',
  creation_date: Date.parse('2026-03-10T12:00:00Z'),
  data: {
    buyer: { email: 'Aluno@X.com' },
    purchase: { transaction: 'HP1', approved_date: Date.parse('2026-03-10T12:00:00Z') },
  },
  ...over,
});
const run = (store: BillingStore, body: ReturnType<typeof payload>) => {
  const raw = JSON.stringify(body);
  return processHotmartEvent(store, parseHotmart(raw, body), body);
};

describe('hottok', () => {
  it('compara em tempo constante e rejeita token vazio, errado ou de outro tamanho', () => {
    expect(verifyHottok('abc123', 'abc123')).toBe(true);
    expect(verifyHottok('abc124', 'abc123')).toBe(false);
    expect(verifyHottok('abc', 'abc123')).toBe(false);
    expect(verifyHottok('', 'abc123')).toBe(false);
    expect(verifyHottok(null, 'abc123')).toBe(false);
    expect(verifyHottok('abc123', '')).toBe(false);
  });
  it('lê o token do cabeçalho ou do corpo', () => {
    expect(extractHottok(new Headers({ 'X-HOTMART-HOTTOK': 'tok' }), {})).toBe('tok');
    expect(extractHottok(new Headers(), { hottok: 'tok2' })).toBe('tok2');
    expect(extractHottok(new Headers(), {})).toBeNull();
  });
});

describe('processamento de eventos da Hotmart', () => {
  let store: MemStore;
  beforeEach(() => (store = new MemStore()));

  it('aprovação ativa a assinatura com validade de 32 dias', async () => {
    const r = await run(store, payload('PURCHASE_APPROVED'));
    expect(r.outcome).toBe('processed');
    const s = store.subs.get('HP1')!;
    expect(s.status).toBe('active');
    expect(s.studentId).toBe('student-1');
    expect(s.validUntil?.toISOString()).toBe('2026-04-11T12:00:00.000Z');
  });

  it('evento repetido (mesmo id) é ignorado sem efeito colateral', async () => {
    const body = payload('PURCHASE_APPROVED', {}, 'same-id');
    expect((await run(store, body)).outcome).toBe('processed');
    const first = structuredClone(store.subs.get('HP1'));
    expect((await run(store, body)).outcome).toBe('duplicate');
    expect(store.subs.get('HP1')).toEqual(first);
    expect(store.events.size).toBe(1);
  });

  it('cancelamento muda o status e preserva o período já pago', async () => {
    await run(store, payload('PURCHASE_APPROVED'));
    const before = store.subs.get('HP1')!.validUntil;
    await run(
      store,
      payload('SUBSCRIPTION_CANCELLATION', { creation_date: Date.parse('2026-03-15T12:00:00Z') }),
    );
    const s = store.subs.get('HP1')!;
    expect(s.status).toBe('canceled');
    expect(s.validUntil).toEqual(before);
  });

  it('reembolso, chargeback e atraso', async () => {
    await run(store, payload('PURCHASE_APPROVED'));
    await run(
      store,
      payload('PURCHASE_DELAYED', { creation_date: Date.parse('2026-03-12T00:00:00Z') }),
    );
    expect(store.subs.get('HP1')!.status).toBe('past_due');
    await run(
      store,
      payload('PURCHASE_REFUNDED', { creation_date: Date.parse('2026-03-13T00:00:00Z') }),
    );
    expect(store.subs.get('HP1')!.status).toBe('refunded');
    await run(
      store,
      payload('PURCHASE_CHARGEBACK', { creation_date: Date.parse('2026-03-14T00:00:00Z') }),
    );
    expect(store.subs.get('HP1')!.status).toBe('chargeback');
  });

  it('nova aprovação (renovação) reativa e estende a validade', async () => {
    await run(store, payload('PURCHASE_APPROVED'));
    await run(
      store,
      payload('PURCHASE_DELAYED', { creation_date: Date.parse('2026-04-12T00:00:00Z') }),
    );
    await run(
      store,
      payload('PURCHASE_APPROVED', {
        creation_date: Date.parse('2026-04-13T12:00:00Z'),
        data: {
          buyer: { email: 'aluno@x.com' },
          purchase: { transaction: 'HP1', approved_date: Date.parse('2026-04-13T12:00:00Z') },
        },
      }),
    );
    const s = store.subs.get('HP1')!;
    expect(s.status).toBe('active');
    expect(s.validUntil?.toISOString()).toBe('2026-05-15T12:00:00.000Z');
  });

  it('evento mais antigo que o já aplicado não desfaz o estado atual', async () => {
    await run(
      store,
      payload('PURCHASE_REFUNDED', { creation_date: Date.parse('2026-03-20T00:00:00Z') }),
    );
    expect(store.subs.get('HP1')!.status).toBe('refunded');
    const r = await run(
      store,
      payload('PURCHASE_APPROVED', { creation_date: Date.parse('2026-03-10T00:00:00Z') }),
    );
    expect(r.outcome).toBe('ignored');
    expect(store.subs.get('HP1')!.status).toBe('refunded');
  });

  it('comprador sem cadastro vira acesso pendente e recebe convite', async () => {
    const body = payload('PURCHASE_APPROVED', {
      data: { buyer: { email: 'novo@x.com' }, purchase: { transaction: 'HP2' } },
    });
    const r = await run(store, body);
    expect(r).toEqual({ outcome: 'processed', detail: 'pending' });
    expect(store.pending.get('HP2')).toEqual({ email: 'novo@x.com', status: 'active' });
    expect(store.invited).toEqual(['novo@x.com']);
    expect(store.subs.size).toBe(0);
  });

  it('evento desconhecido é registrado e ignorado', async () => {
    const r = await run(store, payload('PURCHASE_BILLET_PRINTED'));
    expect(r.outcome).toBe('ignored');
    expect(store.subs.size).toBe(0);
    expect([...store.events.values()][0]?.status).toBe('ignored');
  });

  it('falha no meio fica registrada e o reenvio é reprocessado', async () => {
    const body = payload('PURCHASE_APPROVED', {}, 'retry-id');
    store.failNext = true;
    await expect(run(store, body)).rejects.toThrow('banco fora do ar');
    expect(store.events.get('retry-id')?.status).toBe('failed');
    expect((await run(store, body)).outcome).toBe('processed');
    expect(store.subs.get('HP1')?.status).toBe('active');
  });

  it('sem id no payload, a chave vem do hash do corpo (reenvio idêntico é duplicado)', async () => {
    const body = {
      event: 'PURCHASE_APPROVED',
      creation_date: 1,
      data: { buyer: { email: 'aluno@x.com' }, purchase: { transaction: 'HP9' } },
    };
    const raw = JSON.stringify(body);
    expect((await processHotmartEvent(store, parseHotmart(raw, body), body)).outcome).toBe(
      'processed',
    );
    expect((await processHotmartEvent(store, parseHotmart(raw, body), body)).outcome).toBe(
      'duplicate',
    );
  });
});

describe('rota POST /api/webhooks/hotmart', () => {
  it('rejeita assinatura inválida com 401 e não toca no banco', async () => {
    vi.resetModules();
    vi.doMock('server-only', () => ({}));
    const touch = vi.fn();
    vi.doMock('@/lib/billing/supabase-store', () => ({
      supabaseBillingStore: () => {
        touch();
        return new MemStore();
      },
    }));
    process.env.HOTMART_HOTTOK = 'segredo-correto';
    const { POST } = await import('@/app/api/webhooks/hotmart/route');
    const mk = (headers: Record<string, string>) =>
      new Request('http://x/api/webhooks/hotmart', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload('PURCHASE_APPROVED')),
      });
    expect((await POST(mk({ 'x-hotmart-hottok': 'errado' }))).status).toBe(401);
    expect((await POST(mk({}))).status).toBe(401);
    expect(touch).not.toHaveBeenCalled();
    expect((await POST(mk({ 'x-hotmart-hottok': 'segredo-correto' }))).status).toBe(200);
    expect(touch).toHaveBeenCalled();
  });
  it('rejeita corpo que não é JSON', async () => {
    vi.resetModules();
    vi.doMock('server-only', () => ({}));
    vi.doMock('@/lib/billing/supabase-store', () => ({
      supabaseBillingStore: () => new MemStore(),
    }));
    const { POST } = await import('@/app/api/webhooks/hotmart/route');
    expect((await POST(new Request('http://x', { method: 'POST', body: 'nao-json' }))).status).toBe(
      400,
    );
  });
});
