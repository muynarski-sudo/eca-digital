import nodemailer from 'nodemailer';

export interface EmailProvider {
  send(to: string, subject: string, text: string): Promise<void>;
}
/** WhatsApp fica só como interface preparada: nenhum provider real implementado. */
export interface WhatsAppProvider {
  send(toPhone: string, text: string): Promise<void>;
}

export class SmtpEmail implements EmailProvider {
  constructor(private readonly url: string, private readonly from: string) {}
  async send(to: string, subject: string, text: string) {
    await nodemailer.createTransport(this.url).sendMail({ from: this.from, to, subject, text });
  }
}
/** Sem SMTP configurado, só registra no console (desenvolvimento). */
export class ConsoleEmail implements EmailProvider {
  sent: Array<{ to: string; subject: string }> = [];
  async send(to: string, subject: string) {
    this.sent.push({ to, subject });
    console.warn(`[e-mail simulado] para ${to}: ${subject}`);
  }
}
export class NullWhatsApp implements WhatsAppProvider {
  async send() {
    /* desligado */
  }
}

export function emailFromEnv(): EmailProvider {
  const url = process.env.SMTP_URL;
  const from = process.env.EMAIL_FROM;
  return url && from ? new SmtpEmail(url, from) : new ConsoleEmail();
}
