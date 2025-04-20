import z from 'zod';
import dotenv from 'dotenv';
import { Scraper } from 'agent-twitter-client';
import logger from '../logger.js';
var scraper = null;

dotenv.config();

export async function initScraper() {
    console.log('Starting scraper initialization...');
    console.log('Environment variables check:', {
        username: !!process.env.TWITTER_USERNAME,
        password: !!process.env.TWITTER_PASSWORD,
        email: !!process.env.TWITTER_EMAIL,
        apiKey: !!process.env.TWITTER_API_KEY,
        apiSecretKey: !!process.env.TWITTER_API_SECRET_KEY,
        accessToken: !!process.env.TWITTER_ACCESS_TOKEN,
        accessTokenSecret: !!process.env.TWITTER_ACCESS_TOKEN_SECRET
    });

    if (scraper) {
        console.log('Returning existing scraper instance');
        return scraper;
    }

    if (!process.env.TWITTER_USERNAME || !process.env.TWITTER_PASSWORD) {
        throw new UserError('Missing required environment variables: TWITTER_USERNAME and TWITTER_PASSWORD must be set');
    }

    console.log('Creating new scraper instance...');
    scraper = new Scraper();
    try {
        console.log('Attempting login...');
        console.log('Login details:', {
            username: process.env.TWITTER_USERNAME,
            passwordLength: process.env.TWITTER_PASSWORD?.length,
            hasEmail: !!process.env.TWITTER_EMAIL,
            has2FA: !!process.env.TWITTER_2FA_SECRET
        });
        try {
            console.log('Using scraper.login method with timeout...');
            // Add timeout to prevent hanging during login
            const loginPromise = scraper.login(
                process.env.TWITTER_USERNAME,
                process.env.TWITTER_PASSWORD,
                process.env.TWITTER_EMAIL,
                process.env.TWITTER_2FA_SECRET
            );

            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Login timed out after 30 seconds')), 30000);
            });

            // Race the login against the timeout
            await Promise.race([loginPromise, timeoutPromise]);
            console.log('Basic authentication succeeded');
        } catch (basicAuthError) {
            console.error('Basic authentication failed:', basicAuthError);

            // If basic auth fails and we have v2 credentials, try that
            if (process.env.TWITTER_API_KEY &&
                process.env.TWITTER_API_SECRET_KEY &&
                process.env.TWITTER_ACCESS_TOKEN &&
                process.env.TWITTER_ACCESS_TOKEN_SECRET) {

                //console.log('Falling back to v2 API credentials');

                // Login with v2 API credentials
                await scraper.login(
                    process.env.TWITTER_USERNAME ?? 'gendhelaboh',
                    process.env.TWITTER_PASSWORD ?? 'Rahasia1!@',
                    process.env.TWITTER_EMAIL || undefined,
                    process.env.TWITTER_API_KEY,
                    process.env.TWITTER_API_SECRET_KEY,
                    process.env.TWITTER_ACCESS_TOKEN,
                    process.env.TWITTER_ACCESS_TOKEN_SECRET
                );
            } else {
                // If we don't have v2 credentials, rethrow the error
                throw new UserError(`Authentication failed: ${basicAuthError.message}`);
            }
        }

        console.log('Login successful');
        return scraper;
    } catch (authError) {
        console.error('Authentication failed:', authError);
        throw new UserError(`Authentication failed: ${authError.message}`);
    }
}

if (!scraper) {
    await initScraper();
};

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

export const twitterTools = {
    getTweet: {
        name: "getTweet",
        description: "Get a tweet thread by its ID, and return a score",
        parameters: z.object({
            tweetId: z.string().describe("The ID of the first tweet in the thread, example: 1910622968289374299"),
        }),
        execute: async (args, { log }) => {
            try {
                const { tweetId } = args;
                const data = await scraper.getTweet(tweetId);
                logger.success('Tweet fetched successfully!');
                const twitterData = extractTwitterData(data);
                logger.info('Extracted Twitter data:', twitterData);
                return twitterData;
            } catch (error) {
                logger.error("Error fetching tweet thread:", error);
                throw new Error("Failed to fetch tweet thread");
            }
        },
    },
}

export default {
    initScraper,
    twitterTools,
    extractTwitterData,
    scraper
}