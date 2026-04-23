import '../config';
import { aiContentGeneratorService } from './content-generation.service';

async function run() {
  const result = await aiContentGeneratorService.generateHighEngagementPost({
    topic: 'How to build consistent posting habits without burning out',
    platform: 'linkedin',
    style: 'storytelling',
    additionalContext: 'Audience: solo founders and indie hackers. Keep it practical and non-hustle-culture.',
  });

  const humanized = await aiContentGeneratorService.rewriteHumanize(result.text, { preserveHashtags: true });

  console.log('\n--- Generated ---\n');
  console.log(result.text);
  console.log('\nHashtags:', result.hashtags.join(' '));

  console.log('\n--- Humanized ---\n');
  console.log(humanized);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
