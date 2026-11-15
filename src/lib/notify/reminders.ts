import type { EmailProvider } from './providers';

export interface PendingAssignment {
  id: string;
  title: string;
  dueAt: Date;
  studentId: string;
  studentEmail: string;
  studentName: string | null;
  status: string;
  alreadyReminded: boolean;
}

/** Lembrar quem tem tarefa não entregue que vence nas próximas 24 horas (ou já venceu há menos de 2 dias), uma vez só. */
export function dueForReminder(list: PendingAssignment[], now: Date): PendingAssignment[] {
  const DAY = 86_400_000;
  return list.filter((a) => {
    if (a.alreadyReminded || a.status === 'submitted' || a.status === 'reviewed') return false;
    const diff = a.dueAt.getTime() - now.getTime();
    return diff <= DAY && diff >= -2 * DAY;
  });
}

export function reminderEmail(a: PendingAssignment, siteUrl: string): { subject: string; text: string } {
  const first = (a.studentName ?? '').split(' ')[0] || 'Bonjour';
  return {
    subject: `Lembrete: tarefa "${a.title}" vence ${a.dueAt.getTime() < Date.now() ? 'hoje ou já venceu' : 'em breve'}`,
    text: `Bonjour, ${first}!\n\nSua tarefa "${a.title}" tem prazo em ${a.dueAt.toLocaleDateString('pt-BR')}.\nAcesse ${siteUrl}/inicio e faça agora, leva poucos minutos.\n\nÀ bientôt!\n\nVocê recebe este e-mail por ter uma tarefa atribuída pela sua professora.`,
  };
}

export async function sendReminders(list: PendingAssignment[], email: EmailProvider, siteUrl: string, now = new Date()): Promise<string[]> {
  const sent: string[] = [];
  for (const a of dueForReminder(list, now)) {
    const m = reminderEmail(a, siteUrl);
    await email.send(a.studentEmail, m.subject, m.text);
    sent.push(a.id);
  }
  return sent;
}
