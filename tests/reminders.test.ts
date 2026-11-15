import { describe, expect, it } from 'vitest';
import { ConsoleEmail } from '@/lib/notify/providers';
import { dueForReminder, sendReminders, type PendingAssignment } from '@/lib/notify/reminders';

const now = new Date('2026-05-10T12:00:00Z');
const mk = (over: Partial<PendingAssignment>): PendingAssignment => ({ id: 'a', title: 'T', dueAt: new Date('2026-05-11T00:00:00Z'), studentId: 's', studentEmail: 's@x.com', studentName: 'Ana Souza', status: 'assigned', alreadyReminded: false, ...over });

describe('lembretes de tarefa', () => {
  it('lembra tarefa que vence em até 24h ou venceu há pouco, uma vez só', () => {
    expect(dueForReminder([mk({})], now)).toHaveLength(1);
    expect(dueForReminder([mk({ dueAt: new Date('2026-05-09T12:00:00Z') })], now)).toHaveLength(1);
    expect(dueForReminder([mk({ dueAt: new Date('2026-05-20T12:00:00Z') })], now)).toHaveLength(0);
    expect(dueForReminder([mk({ dueAt: new Date('2026-05-01T12:00:00Z') })], now)).toHaveLength(0);
    expect(dueForReminder([mk({ alreadyReminded: true })], now)).toHaveLength(0);
    expect(dueForReminder([mk({ status: 'submitted' }), mk({ status: 'reviewed' })], now)).toHaveLength(0);
  });
  it('envia o e-mail e devolve os ids', async () => {
    const email = new ConsoleEmail();
    const sent = await sendReminders([mk({ id: 'x1' }), mk({ id: 'x2', status: 'submitted' })], email, 'https://app.example', now);
    expect(sent).toEqual(['x1']);
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]?.to).toBe('s@x.com');
  });
});
