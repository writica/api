/**
 * Score controller for the Write-to-Earn API
 * Handles calculation and retrieval of user scores based on their content
 */
import logger from '../lib/logger.js';
import dotenv from 'dotenv';
import { initAgent } from '../lib/agent.js';
import { generateId, generateText } from "ai";
import { twitterTools } from '../lib/tools/twitter.js';

dotenv.config();

const agent = await initAgent({
    name: 'score',
    system: `You are a helpful assistant. You will be given a content URL and you will return the score of the content based on the content URL. The score is a number between 0 and 100. The content URL is a link to a tweet or a thread.`,
});

console.log(agent);

/**
 * Get score for a user based on their username or content URL
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getScore = async (req, res) => {
    console.log(req.query);
    try {
        const { contentUrl } = req.query;

        if (!contentUrl) {
            return res.status(400).json({
                success: false,
                message: 'ContentUrl parameter is required',
                data: null,
                timestamp: new Date()
            });
        }

        console.log(agent.model);
        const result =  await generateText({
            model: agent.model,
            system:  agent.system,
            tools: {...twitterTools},
            prompt: `Get the score of the content URL ${contentUrl}. The score is a number between 0 and 100.`,
        });

        return res.status(200).json({
            success: true,
            message: 'Score calculated successfully',
            data: {
                result: result,
            },
            timestamp: new Date()
        });

    } catch (error) {
        logger.error('Error calculating score', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to calculate score',
            error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
            timestamp: new Date()
        });
    }
};


export default {
    getScore,
};
