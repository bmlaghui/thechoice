import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from './generated/prisma/client';

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 16 || password.includes('change_me')) {
    throw new Error('ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 16 characters are required');
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    if (await prisma.user.count()) {
      console.log('Administrator bootstrap skipped: users already exist.');
      return;
    }
    await prisma.user.create({ data: { email, passwordHash: await argon2.hash(password), role: Role.SUPER_ADMIN } });
    console.log('Initial administrator created. No demonstration data was inserted.');
  } finally {
    await prisma.$disconnect();
  }
}
void main().catch(() => { console.error('Administrator bootstrap failed; check configuration and database access.'); process.exitCode = 1; });
