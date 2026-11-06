import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
@Injectable()
export class EmailService {
  private readonly transport;
  private readonly from: string;
  private readonly restaurantEmail: string;
  constructor(config: ConfigService) {
    const port = Number(config.get('SMTP_PORT', 1025));
    this.transport = nodemailer.createTransport({
      host: config.get('SMTP_HOST', 'localhost'),
      port,
      secure: config.get('SMTP_SECURE', 'false') === 'true' || port === 465,
      auth: config.get('SMTP_USER') ? { user: config.getOrThrow<string>('SMTP_USER'), pass: config.getOrThrow<string>('SMTP_PASSWORD') } : undefined,
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
    });
    this.from = config.get('MAIL_FROM', 'The Choice <reservation@thechoice.local>');
    this.restaurantEmail = config.get('RESTAURANT_EMAIL', 'contact@thechoicerestaurant.fr');
  }
  send(to: string, subject: string, content: string, text?: string, replyTo?: string) {
    return this.transport.sendMail({
      from: this.from,
      to,
      subject,
      html: content,
      text,
      replyTo,
    });
  }
  notifyRestaurant(subject: string, html: string, text: string, replyTo?: string) {
    return this.send(this.restaurantEmail, subject, html, text, replyTo);
  }
  async status() {
    try { await this.transport.verify(); return { configured: true, reachable: true, from: this.from, recipient: this.restaurantEmail }; }
    catch { return { configured: Boolean(this.from && this.restaurantEmail), reachable: false, from: this.from, recipient: this.restaurantEmail }; }
  }
}
