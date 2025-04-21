import { z } from "zod";
import logger from "../logger.js";
import TurndownService from "turndown";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

function extractContentFromHtml(
    html,
    url
) {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.content) {
        return "<e>Page failed to be simplified from HTML</e>";
    }

    // Extract images from the article content only
    const articleDom = new JSDOM(article.content);
    const imgElements = Array.from(
        articleDom.window.document.querySelectorAll("img")
    );

    const images = imgElements.map((img) => {
        const src = img.src;
        const alt = img.alt || "";
        return { src, alt };
    });

    const turndownService = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
    });
    const markdown = turndownService.turndown(article.content);

    return { markdown, images, title: article.title };
}

async function fetchUrl(
    url,
    userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
    forceRaw = false,
    options = {
        startIndex: 0,
        maxLength: 20000,
        enableFetchImages: false,
    }
) {
    const response = await fetch(url, {
        headers: { "User-Agent": userAgent },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${url} - status code ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    const isHtml =
        text.toLowerCase().includes("<html") || contentType.includes("text/html");

    if (isHtml && !forceRaw) {
        const result = extractContentFromHtml(text, url);
        if (typeof result === "string") {
            return {
                content: result,
                images: [],
                remainingContent: 0,
                remainingImages: 0,
            };
        }

        const { markdown, images, title } = result;
        const processedImages = [];

        if (
            options.enableFetchImages &&
            options.imageMaxCount > 0 &&
            images.length > 0
        ) {
            try {
                const startIdx = options.imageStartIndex;
                let fetchedImages = await fetchImages(images.slice(startIdx));
                fetchedImages = fetchedImages.slice(0, options.imageMaxCount);

                if (fetchedImages.length > 0) {
                    const imageBuffers = fetchedImages.map((img) => img.data);

                    const mergedImage = await mergeImagesVertically(
                        imageBuffers,
                        options.imageMaxWidth,
                        options.imageMaxHeight,
                        options.imageQuality
                    );

                    const optimizedImage = await sharp(mergedImage)
                        .resize({
                            width: Math.min(options.imageMaxWidth, 1200),
                            height: Math.min(options.imageMaxHeight, 1600),
                            fit: "inside",
                            withoutEnlargement: true,
                        })
                        .jpeg({
                            quality: Math.min(options.imageQuality, 85),
                            mozjpeg: true,
                            chromaSubsampling: "4:2:0",
                        })
                        .toBuffer();

                    const base64Image = optimizedImage.toString("base64");

                    processedImages.push({
                        data: base64Image,
                        mimeType: "image/jpeg",
                    });
                }
            } catch (err) {
                console.error("Error processing images:", err);
            }
        }

        return {
            content: markdown,
            images: processedImages,
            remainingContent: text.length - (options.startIndex + options.maxLength),
            remainingImages: Math.max(
                0,
                images.length - (options.imageStartIndex + options.imageMaxCount)
            ),
            title,
        };
    }

    return {
        content: `Content type ${contentType} cannot be simplified to markdown, but here is the raw content:\n${text}`,
        images: [],
        remainingContent: 0,
        remainingImages: 0,
        title: undefined,
    };
}

export const mediumTools = {
    fetchMedium: {
        name: "fetch_medium",
        description: "Get Medium article content based on url",
        parameters: z.object({
            mediumURL: z.string().describe("The URL of the Medium article, example: https://medium.com/@agustin.sanchez_41829/the-tools-will-change-your-craft-doesnt-have-to-3d971ae3cb67"),
        }),
        execute: async (args) => {
            try {
                const { mediumURL } = args;
                const data = await fetchUrl(mediumURL);
                logger.success('Fetched Medium article:', data);
                return data;
            } catch (error) {
                logger.error("Error fetching tweet thread:", error);
                throw new Error("Failed to fetch tweet thread");
            }
        },
    },
}

export default {
    fetchUrl,
    mediumTools,
}
