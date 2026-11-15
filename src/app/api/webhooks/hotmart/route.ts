import { NextResponse } from 'next/server';
import { extractHottok, parseHotmart, verifyHottok } from '@/lib/billing/hotmart';
import { processHotmartEvent } from '@/lib/billing/process';
import { supabaseBillingStore } from '@/lib/billing/supabase-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const expected = process.env.HOTMART_HOTTOK ?? '';
  const raw = await req.text();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'json inválido' }, { status: 400 });
  }
  if (!verifyHottok(extractHottok(req.headers, body), expected)) {
    console.warn('[hotmart] webhook rejeitado: token inválido');
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  }
  let event;
  try {
    event = parseHotmart(raw, body);
  } catch {
    return NextResponse.json({ error: 'payload inválido' }, { status: 400 });
  }
  try {
    const periodDays = Number(process.env.HOTMART_PERIOD_DAYS ?? '32');
    const result = await processHotmartEvent(supabaseBillingStore(), event, body, { periodDays });
    console.warn(
      `[hotmart] ${event.eventType} ${result.outcome}${result.detail ? ` (${result.detail})` : ''}`,
    );
    return NextResponse.json({ ok: true, outcome: result.outcome });
  } catch (e) {
    console.error('[hotmart] falha ao processar', e instanceof Error ? e.message : e);
    // 500 faz a Hotmart reenviar; o evento ficou registrado como "failed"
    return NextResponse.json({ error: 'falha ao processar' }, { status: 500 });
  }
}
