import z from 'zod';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { Scraper } from 'agent-twitter-client';
import logger from '../logger.js';
import { UserError } from '../errors.js';
var scraper = null;

dotenv.config();

// Cookie management functions
async function saveCookiesToFile(username, cookies) {
    try {
        const cookiesDir = path.join(process.cwd(), 'cookies');
        // Create cookies directory if it doesn't exist
        await fs.mkdir(cookiesDir, { recursive: true });
        
        const cookiePath = path.join(process.cwd(), 'cookies', `${username}.cookies.json`);
        
        // Don't modify the cookie structure, save it exactly as received
        await fs.writeFile(cookiePath, JSON.stringify(cookies, null, 2), 'utf8');
        logger.success(`Cookies saved for user ${username}`);
        return true;
    } catch (error) {
        logger.error(`Failed to save cookies: ${error.message}`);
        return false;
    }
}

async function loadCookiesFromFile(username) {
    try {
        const cookiePath = path.join(process.cwd(), 'cookies', `${username}.cookies.json`);
        console.log(`Looking for cookies file at: ${cookiePath}`);
        const fileExists = await fs.access(cookiePath).then(() => true).catch(() => false);
        
        if (fileExists) {
            console.log(`Cookies file found for ${username}`);
            const cookiesData = await fs.readFile(cookiePath, 'utf8');
            // Parse cookies but don't transform them
            const cookies = JSON.parse(cookiesData);
            console.log(`Loaded ${cookies.length} cookies`);
            logger.success(`Cookies loaded for user ${username}`);
            return cookies;
        } else {
            console.log(`No cookies file found for ${username}`);
        }
        return null;
    } catch (error) {
        console.error(`Cookie loading error details:`, error);
        logger.error(`Failed to load cookies: ${error.message}`);
        return null;
    }
}

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
    
    // Check for saved cookies
    const username = process.env.TWITTER_USERNAME;
    const cookies = await loadCookiesFromFile(username);    if (cookies) {
        try {
            console.log('Found saved cookies, attempting to use them...');
            console.log(`Cookie type: ${typeof cookies}, isArray: ${Array.isArray(cookies)}`);
            
            // Inspect cookie structure
            if (Array.isArray(cookies) && cookies.length > 0) {
                console.log(`Sample cookie keys: ${Object.keys(cookies[0]).join(', ')}`);
            }
              // The setCookies method in agent-twitter-client expects cookies in a specific format
            console.log('Attempting to handle cookies in a compatible format...');
            
            // Based on documentation, we'll try a different approach
            // Instead of directly using the stored cookie objects,
            // Let's try creating a basic cookie jar and setting it directly
            
            try {
                // Import the Cookie class from tough-cookie if available in the library
                const { Cookie } = await import('tough-cookie');
                
                // Create Cookie objects from our saved cookies
                const cookieObjects = cookies.map(cookie => {
                    try {
                        return new Cookie({
                            key: cookie.key,
                            value: cookie.value,
                            domain: cookie.domain || 'twitter.com',
                            path: cookie.path || '/',
                            expires: cookie.expires ? new Date(cookie.expires) : undefined,
                            httpOnly: !!cookie.httpOnly,
                            secure: !!cookie.secure
                        });
                    } catch (err) {
                        console.log(`Error creating cookie for ${cookie.key}:`, err.message);
                        return null;
                    }
                }).filter(c => c !== null);
                
                console.log(`Created ${cookieObjects.length} Cookie objects`);
                console.log('Setting cookies one by one...');
                
                // Try to set cookies via the scraper's jar
                const jar = scraper._jar; // Access the scraper's cookie jar if available
                if (jar) {
                    for (const cookie of cookieObjects) {
                        await jar.setCookie(cookie, 'https://twitter.com/');
                    }
                    console.log('Set cookies via jar directly');
                } else {
                    console.log('No cookie jar found, trying alternate method');
                    // If we can't access the jar directly, try using document.cookie
                    const cookieStrings = cookieObjects.map(c => c.toString());
                    await scraper.setCookies(cookieStrings);
                }
            } catch (cookieErr) {
                console.log('Error setting cookies with tough-cookie:', cookieErr);
                console.log('Falling back to simple cookie strings...');
                
                // Fallback: Try simple cookie strings
                const cookieStrings = cookies.map(cookie => `${cookie.key}=${cookie.value}`);
                await scraper.setCookies(cookieStrings);
            }
            
            console.log('setCookies completed successfully');
            
            // Verify if the cookies are valid
            console.log('Checking if logged in with cookies...');
            const isLoggedIn = await scraper.isLoggedIn();
            if (isLoggedIn) {
                console.log('Successfully logged in using saved cookies');
                return scraper;
            } else {
                console.log('Saved cookies are invalid, falling back to password login');
            }
        } catch (cookieError) {
            console.error('Failed to log in with cookies:', cookieError);
            console.log('Error details:', cookieError.stack);
            console.log('Falling back to password login');
        }
    }
    
    // If we get here, we need to log in with credentials
    try {
        console.log('Attempting login with credentials...');
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
            
            // Save cookies after successful login
            const newCookies = await scraper.getCookies();
            if (newCookies) {
                await saveCookiesToFile(username, newCookies);
            }
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
                    process.env.TWITTER_USERNAME,
                    process.env.TWITTER_PASSWORD,
                    process.env.TWITTER_EMAIL || undefined,
                    process.env.TWITTER_API_KEY,
                    process.env.TWITTER_API_SECRET_KEY,
                    process.env.TWITTER_ACCESS_TOKEN,
                    process.env.TWITTER_ACCESS_TOKEN_SECRET
                );
                
                // Save cookies after successful login with v2 credentials
                const newCookies = await scraper.getCookies();
                if (newCookies) {
                    await saveCookiesToFile(username, newCookies);
                }
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
        execute: async (args) => {
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