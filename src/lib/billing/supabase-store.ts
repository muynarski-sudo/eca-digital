import 'server-only';
import type { BillingStore, SubStatus } from './process';
import { adminClient } from '@/lib/supabase/admin';

export function supabaseBillingStore(): BillingStore {
  const db = adminClient();
  return {
    async recordEvent(key, type, payload) {
      const { error } = await db
        .from('webhook_events')
        .insert({
          provider: 'hotmart',
          event_key: key,
          event_type: type,
          payload: payload as object,
        });
      if (!error) return true;
      if (error.code !== '23505') throw new Error(error.message);
      // reenvio: só reprocessa se a tentativa anterior falhou
      const { data } = await db
        .from('webhook_events')
        .update({ status: 'received', detail: null })
        .eq('provider', 'hotmart')
        .eq('event_key', key)
        .eq('status', 'failed')
        .select('id');
      return (data?.length ?? 0) > 0;
    },
    async finishEvent(key, status, detail) {
      await db
        .from('webhook_events')
        .update({ status, detail: detail ?? null })
        .eq('provider', 'hotmart')
        .eq('event_key', key);
    },
    async findStudentByEmail(email) {
      const { data } = await db
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      return data?.id ?? null;
    },
    async getSubscription(externalId) {
      const { data } = await db
        .from('subscriptions')
        .select('id,last_event_at,valid_until')
        .eq('origin', 'hotmart')
        .eq('external_id', externalId)
        .maybeSingle();
      if (!data) return null;
      return {
        id: data.id,
        lastEventAt: data.last_event_at ? new Date(data.last_event_at) : null,
        validUntil: data.valid_until ? new Date(data.valid_until) : null,
      };
    },
    async upsertSubscription(s) {
      const { error } = await db
        .from('subscriptions')
        .upsert(
          {
            student_id: s.studentId,
            origin: 'hotmart',
            external_id: s.externalId,
            status: s.status as SubStatus,
            valid_until: s.validUntil?.toISOString() ?? null,
            last_event_at: s.lastEventAt.toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'origin,external_id' },
        );
      if (error) throw new Error(error.message);
    },
    async setSubscriptionStatus(externalId, status, lastEventAt, validUntil) {
      const patch: Record<string, unknown> = {
        status,
        last_event_at: lastEventAt.toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (validUntil !== undefined) patch.valid_until = validUntil?.toISOString() ?? null;
      const { error } = await db
        .from('subscriptions')
        .update(patch)
        .eq('origin', 'hotmart')
        .eq('external_id', externalId);
      if (error) throw new Error(error.message);
    },
    async upsertPendingGrant(g) {
      const { error } = await db
        .from('pending_grants')
        .upsert(
          {
            email: g.email,
            origin: 'hotmart',
            external_id: g.externalId,
            status: g.status,
            valid_until: g.validUntil?.toISOString() ?? null,
            last_event_at: g.lastEventAt.toISOString(),
          },
          { onConflict: 'origin,external_id' },
        );
      if (error) throw new Error(error.message);
    },
    async inviteByEmail(email) {
      if (process.env.HOTMART_AUTO_INVITE !== 'true') return;
      await db.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback`,
      });
    },
  };
}
