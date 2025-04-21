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
 *         name: campaignDescription
 *         schema:
 *           type: string
 *         required: true
 *         description: Text describing the campaign goals, keywords, and target audience.
 *       - in: query
 *         name: campaign_keywords
 *         schema:
 *           type: string
 *         required: false
 *         description: Specific keywords related to the campaign for content matching.
 *       - in: query
 *         name: target_audience
 *         schema:
 *           type: string
 *         required: false
 *         description: Description of the target audience for the campaign.
 *       - in: query
 *         name: CTA_goal
 *         schema:
 *           type: string
 *         required: false
 *         description: The Call-to-Action (CTA) goal for the campaign content.
 *     responses:
 *       200:
 *         description: Score calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Score calculated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     result:
 *                       type: object
 *                       properties:
 *                         AIContent:
 *                           type: object
 *                           properties:
 *                             score:
 *                               type: number
 *                               description: AI detection score (0-100, where 100 = human)
 *                               example: 85
 *                             explanation:
 *                               type: string
 *                               description: Brief explanation of the AI detection result
 *                               example: The content shows natural language patterns and personal voice typical of human writing.
 *                         score:
 *                           type: object
 *                           description: The campaign fit and content quality score
 *                           example: {"score": 75, "explanation": "Good match with campaign goals and moderate engagement metrics"}
 *                         contentUrl:
 *                           type: string
 *                           description: The analyzed content URL
 *                           example: https://twitter.com/user/status/123456789
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-04-21T10:00:00.000Z"
 *       400:
 *         description: Bad request - Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: ContentUrl or campaignDescription parameter is required
 *                 data:
 *                   type: null
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-04-21T10:00:00.000Z"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to calculate score
 *                 error:
 *                   type: string
 *                   example: An unexpected error occurred
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-04-21T10:00:00.000Z"
 */
export const getScore = async (req, res) => {
    console.log(req.query);
    try {
        const { contentUrl, campaignDescription, campaign_keywords, target_audience, CTA_goal  } = req.query;

        if (!contentUrl || !campaignDescription) {
            return res.status(400).json({
                success: false,
                message: 'ContentUrl or campaignDescription parameter is required',
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
        console.log(checkAIContent.text);
        const checkAIResult = JSON.parse(checkAIContent.text);
        console.log(checkAIResult);

        const result = await generateText({
            model: scoreAgent.model,
            system: scoreAgent.system,
            tools: { ...twitterTools, ...mediumTools },
            prompt: `Get the score of the content URL ${contentUrl}. The score is a number between 0 and 100.

campaign_description: ${campaignDescription}
campaign_keywords : ${campaign_keywords}
target_audience: ${target_audience}
CTA_goal: ${CTA_goal}
            `,
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
