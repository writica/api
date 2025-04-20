// Using import.meta.url to get the current file's path for ES Modules
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import moduleAlias from 'module-alias';
import dotenv from 'dotenv';
import { Scraper } from 'agent-twitter-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Setup module aliases
moduleAlias.addAliases({
  '$lib': join(__dirname, 'lib')
});

// Load environment variables from .env file
dotenv.config();

const extractTwitterData = (data) => {
  // Initialize values
  const conversationId = data.conversationId;
  const totalView = data.views || 0;
  const username = data.username;
  const userId = data.userId;
  
  // Calculate total likes (adding parent tweet likes and all thread likes)
  let totalLikes = data.likes || 0;
  if (data.thread && data.thread.length > 0) {
    data.thread.forEach(tweet => {
      totalLikes += tweet.likes || 0;
    });
  }
  
  // Calculate total bookmarks
  let totalBookmarks = data.bookmarks || 0;
  if (data.thread && data.thread.length > 0) {
    data.thread.forEach(tweet => {
      totalBookmarks += tweet.bookmarks || 0;
    });
  }
  
  // Collect context (parent tweet text and all thread tweet texts)
  const context = [data.text];
  if (data.thread && data.thread.length > 0) {
    data.thread.forEach(tweet => {
      // Only add text content, not promotional links
      if (tweet.text && !tweet.text.includes('🔖:')) {
        context.push(tweet.text);
      }
    });
  }
  
  return {
    conversation_id: conversationId,
    total_view: totalView,
    total_likes: totalLikes,
    total_views: totalView, // Assuming this is the same as total_view
    total_bookmarks: totalBookmarks,
    username: username,
    user_id: userId,
    context: context
  };
};


try {
  const scraper = new Scraper();
  await scraper.login(
    process.env.TWITTER_USERNAME,
    process.env.TWITTER_PASSWORD,
  );
  const tweet = await scraper.getTweet('1912565933190836295');
  console.log('Tweet fetched successfully!');
  const twitterData = extractTwitterData(tweet);
  console.log('Extracted Twitter data:');
  console.log(twitterData);

}
catch (e) {
  console.log(e);
  console.log('Login failed!');
};