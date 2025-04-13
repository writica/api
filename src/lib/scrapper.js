#!/usr/bin/env node
import { FastMCP, UserError } from "fastmcp";
import { Scraper } from 'agent-twitter-client';
import dotenv from 'dotenv';
import { z } from "zod";

// Initialize and authenticate the scraper
export async function initScraper() {
  if (scraper) return scraper;

//   Check for required environment variables
  if (!process.env.TWITTER_USERNAME || !process.env.TWITTER_PASSWORD ) {
    throw new UserError('Missing required environment variables: TWITTER_USERNAME and TWITTER_PASSWORD must be set');
  }

  scraper = new Scraper();
  
  try {
    
    try {
      await scraper.login(
        process.env.TWITTER_USERNAME , 
        process.env.TWITTER_PASSWORD ,
        process.env.TWITTER_EMAIL,
        process.env.TWITTER_2FA_SECRET
      );
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
          process.env.TWITTER_USERNAME?? 'gendhelaboh',
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

export async function getThread(threadId){

}

// Add getTweetThread tool
server.addTool({
  name: "getTweet",
  description: "Get a tweet thread by its ID (retrieves the main tweet and all its self-replies)",
  parameters: z.object({
    tweetId: z.string().describe("The ID of the first tweet in the thread, example: 1910622968289374299"),
  }),
  execute: async (args, { log }) => {
    try {
      log.info("Initializing Twitter scraper...");
      const twitterScraper = await initScraper();
      
      log.info("Fetching tweet thread...", { tweetId: args.tweetId });
      
      // First, get the original tweet
      const originalTweet = await twitterScraper.getTweet(args.tweetId);
      if (!originalTweet) {
        throw new UserError("Tweet not found");
      }
      
      // Initialize thread with the original tweet
      let allThreadTweets = [originalTweet];
      
      // Get the user's screen name to fetch their timeline
      const userId = originalTweet.userId;
      const screenName = originalTweet.username;
      
      log.info(`Fetching recent tweets and replies from user: ${screenName}`);
      
      try {
        // Get the user's recent tweets and replies
        const userTweets = [];
        
        // Use an async iterator to paginate through results
        for await (const tweet of twitterScraper.getTweetsAndReplies(screenName, 50)) {
          userTweets.push(tweet);
          
          // Stop if we have a reasonable number of tweets to check
          if (userTweets.length >= 100) {
            break;
          }
        }
        
        log.info(`Found ${userTweets.length} tweets/replies from user ${screenName}`);
        
        // Try to determine which tweets are part of the same thread
        const conversationId = originalTweet.conversationId || originalTweet.id;
        
        // Filter tweets that belong to the same conversation
        const threadTweets = userTweets.filter(tweet => 
          tweet.id !== originalTweet.id && // Skip the original tweet we already have
          (tweet.conversationId === conversationId || // Match by conversation ID if available
           tweet.inReplyToStatusId === originalTweet.id || // Direct replies to the original tweet
           allThreadTweets.some(t => tweet.inReplyToStatusId === t.id)) // Replies to any tweet in the thread
        );
        
        // Add all thread tweets to our collection
        allThreadTweets.push(...threadTweets);
        
        // Sort the thread chronologically
        allThreadTweets.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      } catch (timelineError) {
        log.warn(`Failed to get user timeline: ${timelineError.message}`);
        // Continue with just the original tweet
      }
      
      // Format the thread for return
      const formattedThread = allThreadTweets.map((tweet, index) => {
        return `Tweet ${index + 1}/${allThreadTweets.length} (ID: ${tweet.id}):\n${tweet.text}\n`;
      }).join("\n---\n\n");
      
      log.info("Tweet thread fetched successfully, found " + allThreadTweets.length + " tweets");
      return formattedThread;
    } catch (error) {
      log.error("Failed to get tweet thread", { error: error.message });
      throw new UserError(`Failed to get tweet thread: ${error.message}`);
    }
  },
});

// Add sendTweet tool
server.addTool({
  name: "sendTweet",
  description: "Send a new tweet",
  parameters: z.object({
    text: z.string().describe("The text content of the tweet to send"),
  }),
  execute: async (args, { log }) => {
    try {
      log.info("Initializing Twitter scraper...");
      const twitterScraper = await initScraper();
      
      log.info("Sending tweet...");
      const result = await twitterScraper.sendTweet(args.text);
      log.info("result:",await result.json());
      log.info("Tweet sent successfully");
      const resultJson = await result.json();
      return resultJson;
    } catch (error) {
      log.error("Failed to send tweet", { error: error.message });
      throw new UserError(`Failed to send tweet: ${error.message}`);
    }
  },
});

// Start the server
server.start({
  transportType: "stdio", // Use stdio for direct process communication
});

// log.info("Twitter MCP server started with stdio transport.");
