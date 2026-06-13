const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

// Initialize AWS Secrets Manager client for ap-south-1 (primary region)
const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || "ap-south-1",
});

/**
 * Programmatically retrieves secrets from AWS Secrets Manager
 * and loads them into process.env at application startup.
 */
async function loadSecrets() {
  // If running in development (outside ECS/AWS), load from local .env
  if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
    console.log("Loaded development environment variables from local .env file");
    return;
  }

  // Name/ARN of the secret configured in AWS Secrets Manager
  const secretName = "quantumbank/production/app-secrets";

  try {
    console.log(`Fetching secrets from AWS Secrets Manager: ${secretName}...`);
    
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
        VersionStage: "AWSCURRENT", // Always retrieve the active version
      })
    );

    if (response.SecretString) {
      const secrets = JSON.parse(response.SecretString);
      
      // Inject all retrieved secrets into process.env
      Object.keys(secrets).forEach((key) => {
        process.env[key] = secrets[key];
      });
      
      console.log("Successfully loaded production secrets from AWS Secrets Manager.");
    } else {
      throw new Error("Secret retrieved but contains no secret string data");
    }
  } catch (error) {
    console.error("CRITICAL: Failed to load secrets from AWS Secrets Manager:", error.message);
    process.exit(1); // Stop app if production credentials are unavailable
  }
}

module.exports = { loadSecrets };
