/* Jobs agendados. Uso: tsx --conditions=react-server scripts/jobs.ts <reminders|purge-recordings>
   Agende com cron diário (ver docker-compose.yml, serviço "jobs"). */
import { sendReminders, type PendingAssignment } from '../src/lib/notify/reminders';
import { emailFromEnv } from '../src/lib/notify/providers';
import { serviceClient } from './lib/env';

async function reminders() {
  const db = serviceClient();
  const { data } = await db
    .from('assignments')
    .select(
      'id,title,due_at,status,student_id,reminder_sent_at,profiles:student_id(email,full_name)',
    )
    .in('status', ['assigned', 'in_progress'])
    .is('reminder_sent_at', null)
    .lte('due_at', new Date(Date.now() + 86_400_000).toISOString());
  const list: PendingAssignment[] = (data ?? [])
    .map((a) => {
      const p = (Array.isArray(a.profiles) ? a.profiles[0] : a.profiles) as {
        email: string;
        full_name: string | null;
      } | null;
      return {
        id: a.id as string,
        title: a.title as string,
        dueAt: new Date(a.due_at as string),
        studentId: a.student_id as string,
        studentEmail: p?.email ?? '',
        studentName: p?.full_name ?? null,
        status: a.status as string,
        alreadyReminded: false,
      };
    })
    .filter((a) => a.studentEmail);
  const sent = await sendReminders(list, emailFromEnv(), process.env.NEXT_PUBLIC_SITE_URL ?? '');
  for (const id of sent) {
    const a = list.find((x) => x.id === id)!;
    await db
      .from('assignments')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', id);
    await db
      .from('notification_log')
      .upsert(
        { user_id: a.studentId, channel: 'email', kind: 'assignment_due', ref_id: id },
        { onConflict: 'user_id,channel,kind,ref_id', ignoreDuplicates: true },
      );
  }
  console.warn(`Lembretes enviados: ${sent.length}`);
}

/** Apaga gravações de voz vencidas (30 dias): primeiro o arquivo, depois a linha. */
async function purgeRecordings() {
  const db = serviceClient();
  const { data } = await db
    .from('voice_recordings')
    .select('id,storage_path')
    .lte('expires_at', new Date().toISOString())
    .limit(1000);
  const rows = data ?? [];
  if (rows.length === 0) return console.warn('Nenhuma gravação vencida.');
  const { error } = await db.storage
    .from('recordings')
    .remove(rows.map((r) => r.storage_path as string));
  if (error) throw new Error(`Storage: ${error.message}`);
  await db
    .from('voice_recordings')
    .delete()
    .in(
      'id',
      rows.map((r) => r.id as string),
    );
  console.warn(`Gravações apagadas: ${rows.length}`);
}

const job = process.argv[2];
const jobs: Record<string, () => Promise<void>> = {
  reminders,
  'purge-recordings': purgeRecordings,
};
if (!job || !jobs[job]) {
  console.error(`Uso: jobs.ts <${Object.keys(jobs).join('|')}>`);
  process.exit(1);
}
jobs[job]!().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
