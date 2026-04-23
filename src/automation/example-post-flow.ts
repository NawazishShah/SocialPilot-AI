import '../config';
import { SocialMediaPoster } from './social-media-poster';

async function run() {
  const poster = new SocialMediaPoster({
    accountId: 'account_123',
    platform: 'twitter',
    credentials: {
      email: process.env.TWITTER_EMAIL || '',
      username: process.env.TWITTER_USERNAME || '',
      password: process.env.TWITTER_PASSWORD || '',
    },
    options: {
      sessionDir: './sessions',
    },
  });

  const result = await poster.createPost({
    text: 'Shipping a small feature every day beats waiting for the perfect launch.\n\nWhat\'s one tiny improvement you can ship today?',
  });

  console.log('Post result:', result);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
