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
    system: `Act as a professional content analyst for crypto and web3 campaigns. Analyze the following text and assign three scores (0-100) based on:  

**1. Virality Score**  
- Criteria:  
  - Emotional appeal (positive/negative intensity).  
  - Use of trending keywords or hashtags (e.g., "AI," "DeFi," "NFT").  
  - Hook quality (first sentence grabs attention).  
  - Shareability (clear call-to-action, meme potential, controversy).  
- Example Viral Content: "🚨 BREAKING: This new AI-powered DeFi protocol could 10x your portfolio. Here’s why you’ll regret ignoring it 👇"  

**2. Quality Score**  
- Criteria:  
  - Readability (grammar, structure, clarity).  
  - Originality (unique insights, not generic).  
  - Depth (data-driven claims, examples, actionable advice).  
  - Audience value (educational, entertaining, or inspiring).  
- Example High-Quality Content: "A step-by-step guide to auditing smart contracts, with code snippets and Common Vulnerabilities Exposed (CVEs)."  

**3. Campaign Fit**  
- Criteria:  
  - Alignment with campaign keywords: [campaign_keywords] (e.g., "Layer 2 scaling," "NFT utility").  
  - Audience targeting: [target_audience] (e.g., "developers," "crypto newbies").  
  - Tone/style: [desired_tone] (e.g., "professional," "humorous," "urgent").  
  - Call-to-action alignment: [CTA_goal] (e.g., "drive sign-ups," "educate about security").  
- Example Good Campaign Fit: Campaign = "Educate gamers about NFT utility." Content = "How gaming NFTs unlock exclusive in-game perks, with case studies from Axie Infinity."  

---  

**Text to Analyze**:  
"[Insert user’s article/tweet here]"  

---  

**Output Format**:  
{  
  "virality_score": [0-100],  
  "virality_reason": "[1-sentence explanation]",  
  "quality_score": [0-100],  
  "quality_reason": "[1-sentence explanation]",  
  "campaign_fit_score": [0-100],  
  "campaign_fit_reason": "[1-sentence explanation]",
  "total_score": [(virality_score + quality_score + campaign_fit_score) / 3]
}  

**Notes**:  
- Penalize clickbait or misleading claims in the Quality Score.  
- Highlight mismatches between content and campaign keywords in Campaign Fit.`,
});

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
 *         description: The URL of the content to analyze (e.g., a tweet URL).
 *       - in: query
 *         name: campaignText
 *         schema:
 *           type: string
 *         required: true
 *         description: Text describing the campaign goals, keywords, and target audience.
 *     responses:
 *       200:
 *         description: Score calculated successfully.
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
 *                         virality_score:
 *                           type: integer
 *                           example: 85
 *                         virality_reason:
 *                           type: string
 *                           example: "Strong emotional hook and trending keywords."
 *                         quality_score:
 *                           type: integer
 *                           example: 70
 *                         quality_reason:
 *                           type: string
 *                           example: "Well-structured but lacks deep data."
 *                         campaign_fit_score:
 *                           type: integer
 *                           example: 90
 *                         campaign_fit_reason:
 *                           type: string
 *                           example: "Perfectly aligns with campaign keywords and tone."
 *                         total_score:
 *                           type: number
 *                           format: float
 *                           example: 81.67
 *                 timestamp:
 *                   type: string
 *                   format: date-time
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

        console.log(agent.model);
        const result = await generateText({
            model: agent.model,
            system: agent.system,
            tools: { ...twitterTools },
            prompt: `Get the score of the content URL ${contentUrl}. The score is a number between 0 and 100.
            The Campaign is:
            ${campaignText}`,
            maxSteps: agent.maxSteps,
            temperature: agent.temperature,
        });

        return res.status(200).json({
            success: true,
            message: 'Score calculated successfully',
            data: {
                result: JSON.parse(result.text),
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
