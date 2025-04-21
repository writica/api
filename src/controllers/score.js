/**
 * Score controller for the Write-to-Earn API
 * Handles calculation and retrieval of user scores based on their content
 */
import logger from '../lib/logger.js';
import dotenv from 'dotenv';
import { generateId, generateText } from "ai";
import { twitterTools } from '../lib/tools/twitter.js';
import { mediumTools } from '../lib/tools/medium.js';
import scoreAgent from '../agents/scoreAgent.js';
import aiCheckerAgent from '../agents/aiCheckerAgent.js';

dotenv.config();



/**
 * @swagger
 * /getscore:
 *   get:
 *     summary: Calculate content score based on URL and campaign text
 *     description: Retrieves a score for provided content based on virality, quality, and campaign fit.
 *     tags: [Score]
 *     parameters:
 *       - in: query
 *         name: contentUrl
 *         schema:
 *           type: string
 *         required: true
 *         description: The URL of the content to analyze (tweet URL or Medium URL).
 *       - in: query
 *         name: campaignText
 *         schema:
 *           type: string
 *         required: true
 *         description: Text describing the campaign goals, keywords, and target audience.
 *     responses:
 */
export const getScore = async (req, res) => {
    console.log(req.query);
    try {
        const { contentUrl, campaignText } = req.query;

        if (!contentUrl || !campaignText) {
            return res.status(400).json({
                success: false,
                message: 'ContentUrl or CampaignText parameter is required',
                data: null,
                timestamp: new Date()
            });
        }

        const checkAIContent = await generateText({
            model: aiCheckerAgent.model,
            system: aiCheckerAgent.system,
            tools: { ...twitterTools, ...mediumTools },
            prompt: `Analyze the content at ${contentUrl} to determine if it is AI-generated or human-written. Return a JSON object with a "score" (0-100, where 100 = human) and a 1-sentence "explanation".`,
            maxSteps: 10,
        });
        const checkAIResult = JSON.parse(checkAIContent.text);

        const result = await generateText({
            model: scoreAgent.model,
            system: scoreAgent.system,
            tools: { ...twitterTools, ...mediumTools },
            prompt: `Get the score of the content URL ${contentUrl}. The score is a number between 0 and 100.
            The Campaign is:
            ${campaignText}`,
            maxSteps: scoreAgent.maxSteps,
            temperature: 1,
        });
        const scoreResult = JSON.parse(result.text);

        return res.status(200).json({
            success: true,
            message: 'Score calculated successfully',
            data: {
                result: {
                    AIContent: checkAIResult,
                    score: scoreResult,
                    contentUrl: contentUrl,
                },
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
