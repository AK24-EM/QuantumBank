const express = require('express');
const { MongoClient } = require('mongodb');
const { createClient } = require('redis');
const { loadSecrets } = require('./secrets-loader');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// Global connection clients
let mongoClient = null;
let redisClient = null;

async function bootstrap() {
  // Load secrets from AWS Secrets Manager in production, or local .env in dev
  await loadSecrets();

  console.log(`Starting QuantumBank service: ${process.env.SERVICE_NAME || 'api-gateway'}`);

  // Initialize MongoDB connection
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (mongoUri) {
    try {
      mongoClient = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
      await mongoClient.connect();
      console.log('Successfully connected to MongoDB.');
    } catch (err) {
      console.error('Failed to connect to MongoDB on startup:', err.message);
    }
  } else {
    console.log('No MongoDB connection string configured.');
  }

  // Initialize Redis connection
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      redisClient = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000
        }
      });
      redisClient.on('error', (err) => console.error('Redis client error:', err.message));
      await redisClient.connect();
      console.log('Successfully connected to Redis.');
    } catch (err) {
      console.error('Failed to connect to Redis on startup:', err.message);
    }
  } else {
    console.log('No Redis URL configured.');
  }

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: process.env.SERVICE_NAME || 'api-gateway',
      aws_region: process.env.AWS_REGION || 'unknown',
      checks: {
        mongodb: 'not_configured',
        redis: 'not_configured'
      }
    };

    let isHealthy = true;

    if (mongoClient) {
      try {
        await mongoClient.db().admin().ping();
        health.checks.mongodb = 'connected';
      } catch (err) {
        health.checks.mongodb = `error: ${err.message}`;
        health.status = 'degraded';
        // Non-blocking in dev/sandbox, but could be critical
      }
    }

    if (redisClient) {
      try {
        await redisClient.ping();
        health.checks.redis = 'connected';
      } catch (err) {
        health.checks.redis = `error: ${err.message}`;
        health.status = 'degraded';
      }
    }

    if (isHealthy) {
      res.status(200).json(health);
    } else {
      res.status(500).json(health);
    }
  });

  // Sample API routing
  app.get('/api', (req, res) => {
    res.json({
      message: "Welcome to QuantumBank Core API",
      service: process.env.SERVICE_NAME || 'api-gateway',
      version: 'v1.0.0'
    });
  });

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

bootstrap().catch(err => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
