import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo account
  const account = await prisma.account.upsert({
    where: { platform_username: { platform: 'twitter', username: 'demo_user' } },
    update: {},
    create: {
      platform: 'twitter',
      username: 'demo_user',
      displayName: 'Demo User',
      credentials: 'encrypted-placeholder',
      status: 'active',
      metadata: { niche: 'technology', brandVoice: 'professional' },
    },
  });

  console.log(`  ✓ Account created: ${account.displayName} (@${account.username})`);

  // Create a sample schedule
  const schedule = await prisma.schedule.create({
    data: {
      accountId: account.id,
      cronExpression: '0 9 * * *',
      timezone: 'America/New_York',
      contentConfig: {
        topic: 'AI and technology trends',
        tone: 'professional',
        contentType: 'text',
      },
      status: 'paused',
      nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  console.log(`  ✓ Schedule created: ${schedule.cronExpression} (${schedule.timezone})`);

  // Create sample content
  const content = await prisma.content.create({
    data: {
      accountId: account.id,
      platform: 'twitter',
      contentType: 'text',
      body: '🚀 The future of AI is not about replacing humans — it\'s about augmenting human potential. Every tool we build should amplify creativity, not diminish it.',
      hashtags: ['AI', 'FutureOfWork', 'Technology'],
      aiModel: 'gpt-4o',
      tokensUsed: 85,
      status: 'draft',
    },
  });

  console.log(`  ✓ Content created: "${content.body.substring(0, 50)}..."`);

  console.log('\n✅ Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
