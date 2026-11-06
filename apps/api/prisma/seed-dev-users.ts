import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedDevUsers } from './dev-users';
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
seedDevUsers(prisma, process.env.ADMIN_PASSWORD ?? 'ChoiceDev2026!')
  .then(() =>
    console.log(
      'Local test accounts ready. Existing accounts and passwords preserved.',
    ),
  )
  .catch(() => {
    console.error('Could not initialize development accounts.');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
