import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import logger from '../src/utils/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('🚀 Seeding demo database...');

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const demoUsers = [
    {
      email: 'admin@crimegraph.demo',
      fullName: 'System Administrator (Demo)',
      role: UserRole.ADMIN,
    },
    {
      email: 'investigator@crimegraph.demo',
      fullName: 'Lead Investigator (Demo)',
      role: UserRole.INVESTIGATOR,
    },
  ];

  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        role: user.role,
        status: UserStatus.ACTIVE,
      },
      create: {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });
    logger.info(`👤 Upserted demo user: ${user.email} (${user.role})`);
  }

  logger.info('✅ Seeding completed.');
}

main()
  .catch((err) => {
    logger.error('❌ Seeding failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
