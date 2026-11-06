import argon2 from 'argon2';
import type { PrismaClient } from '../src/generated/prisma/client';
import { Role } from '../src/generated/prisma/enums';

export async function seedDevUsers(
  prisma: PrismaClient,
  password: string,
): Promise<void> {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Development accounts are forbidden in production');
  const passwordHash = await argon2.hash(password);
  for (const account of [
    { email: 'admin@thechoice.local', role: Role.SUPER_ADMIN },
    { email: 'contenu@thechoice.local', role: Role.ADMIN },
    { email: 'reservations@thechoice.local', role: Role.EDITOR },
  ]) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {},
      create: { ...account, passwordHash },
    });
  }
}
