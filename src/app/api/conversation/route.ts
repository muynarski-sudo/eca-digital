import { NextResponse } from 'next/server';
import { z } from 'zod';
import { conversationFromEnv } from '@/lib/conversation/provider';
import { scenarioById } from '@/lib/conversation/scenarios';
import { serverClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const body = z.object({
  scenario: z.string(),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(400) })).min(1).max(12),
});

/** Nada da conversa é gravado no banco. Só o texto da cena vai ao provedor de IA (transferência internacional: ver DECISIONS.md). */
export async function POST(req: Request) {
  const provider = conversationFromEnv();
  if (!provider) return NextResponse.json({ error: 'recurso desligado' }, { status: 404 });
  const db = await serverClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  const scenario = parsed.success ? scenarioById(parsed.data.scenario) : undefined;
  if (!parsed.success || !scenario) return NextResponse.json({ error: 'pedido inválido' }, { status: 400 });
  try {
    return NextResponse.json(await provider.reply(scenario, parsed.data.messages));
  } catch {
    return NextResponse.json({ error: 'não consegui responder agora' }, { status: 502 });
  }
}
