import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { mailTemplates } from './email-templates';
import { PrismaService } from './prisma.service';

@Injectable()
export class ReservationReminderService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    if (this.config.get('REMINDERS_ENABLED', 'true') !== 'true') return;
    void this.run();
    this.timer = setInterval(() => void this.run(), 15 * 60 * 1000);
    this.timer.unref();
  }
  onModuleDestroy(): void { if (this.timer) clearInterval(this.timer); }

  async run(now = new Date()): Promise<number> {
    const from = new Date(now.getTime() + 20 * 60 * 60 * 1000);
    const to = new Date(now.getTime() + 28 * 60 * 60 * 1000);
    const startDate = new Date(from.toISOString().slice(0, 10));
    const endDate = new Date(to.toISOString().slice(0, 10));
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const candidates = await this.prisma.reservation.findMany({
      where: { status: 'CONFIRMED', reminderSentAt: null, date: { gte: startDate, lt: endDate } },
    });
    let sent = 0;
    for (const item of candidates) {
      const serviceAt = new Date(item.date);
      const [hours, minutes] = item.time.split(':').map(Number);
      serviceAt.setHours(hours, minutes, 0, 0);
      if (serviceAt < from || serviceAt > to) continue;
      const claimed = await this.prisma.reservation.updateMany({
        where: { id: item.id, reminderSentAt: null }, data: { reminderSentAt: now },
      });
      if (!claimed.count) continue;
      const template = mailTemplates.reservationReminder({
        name: item.name,
        date: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(item.date),
        time: item.time,
        guests: item.guests,
      });
      try {
        await this.email.send(item.email, template.subject, template.html, template.text);
        sent += 1;
      } catch {
        await this.prisma.reservation.update({ where: { id: item.id }, data: { reminderSentAt: null } });
      }
    }
    return sent;
  }
}
