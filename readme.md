# Writica API

This project provides an API to analyze content from Twitter threads or Medium articles. Given a link, the AI will fetch and analyze the content, returning insights or scores based on the analysis.

## Features

- Analyze Twitter threads by providing a link.
- Analyze Medium articles by providing a link.
- AI-powered content analysis and scoring.

## Project Structure

```
src/
  agents/         # AI agents for content analysis and scoring
  controllers/    # API controllers
  lib/            # Utility libraries, configuration, logging, and tools for Twitter/Medium
  routes/         # API route definitions
  index.js        # Main entry point
cookies/          # Cookie storage for authentication
```

## Getting Started

1. **Copy environment variables template:**
   ```
   cp .env-example .env
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Run the API server:**
   ```
   npm start
   ```
   Or, for development with auto-reload:
   ```
   npm run dev
   ```

3. **API Usage:**
   - Send a POST request with a Twitter or Medium link to the appropriate endpoint (see routes in `src/routes/index.js`).

## API Documentation (Swagger)

- Swagger UI: [http://localhost:3000/api-docs/#/Score/get_getscore](http://localhost:3000/api-docs/#/Score/get_getscore)
