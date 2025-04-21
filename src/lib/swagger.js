// filepath: e:\javascript\write-to-earn-api\src\lib\swagger.js
import swaggerJsdoc from 'swagger-jsdoc';

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Write-to-Earn API',
      version: '1.0.0',
      description: 'API documentation for Write-to-Earn platform',
      contact: {
        name: 'API Support',
        // You can add your email or support URL here
        // email: 'support@example.com',
        // url: 'https://example.com/support'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      }
    ]
  },
  // Path to the API docs
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
