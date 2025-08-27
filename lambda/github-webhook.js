const AWS = require('aws-sdk');
const crypto = require('crypto');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const secretsManager = new AWS.SecretsManager();

exports.handler = async (event) => {
    console.log('Webhook event received:', JSON.stringify(event, null, 2));

    try {
        // Parse the incoming webhook payload
        const payload = JSON.parse(event.body || '{}');
        const headers = event.headers || {};

        // Verify GitHub webhook signature (optional but recommended)
        const githubSignature = headers['x-hub-signature-256'];
        if (githubSignature && !await verifyWebhookSignature(event.body, githubSignature)) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Invalid signature' })
            };
        }

        // Handle push events
        if (headers['x-github-event'] === 'push') {
            await handlePushEvent(payload);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Webhook processed successfully' })
        };

    } catch (error) {
        console.error('Webhook processing error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

async function handlePushEvent(payload) {
    const { repository, commits } = payload;
    const repoName = repository.full_name;
    
    console.log(`Processing ${commits.length} commits for ${repoName}`);

    // Store each commit in DynamoDB
    for (let i = 0; i < commits.length; i++) {
        const commit = commits[i];
        const commitData = {
            repo: repoName,
            timestamp: Date.now() + i, // Add index to prevent timestamp collisions
            ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days TTL
            sha: commit.id,
            message: commit.message,
            author: {
                name: commit.author.name,
                email: commit.author.email,
                username: commit.author.username || commit.committer.username
            },
            url: commit.url,
            added: commit.added || [],
            removed: commit.removed || [],
            modified: commit.modified || []
        };

        try {
            await dynamodb.put({
                TableName: process.env.COMMITS_TABLE,
                Item: commitData
            }).promise();
            
            console.log(`Stored commit: ${commit.id.substring(0, 7)} - ${commit.message.substring(0, 50)}...`);
        } catch (error) {
            console.error(`Error storing commit ${commit.id}:`, error);
        }
    }
}

async function verifyWebhookSignature(payload, signature) {
    try {
        // Get GitHub App credentials to get webhook secret
        const secretResponse = await secretsManager.getSecretValue({
            SecretId: process.env.GITHUB_APP_CREDENTIALS_SECRET
        }).promise();
        
        const credentials = JSON.parse(secretResponse.SecretString);
        const webhookSecret = credentials.webhookSecret;
        
        if (!webhookSecret) {
            console.warn('No webhook secret configured, skipping signature verification');
            return true; // Allow if no secret configured
        }

        const expectedSignature = 'sha256=' + crypto
            .createHmac('sha256', webhookSecret)
            .update(payload, 'utf8')
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature, 'utf8'),
            Buffer.from(expectedSignature, 'utf8')
        );
    } catch (error) {
        console.error('Error verifying webhook signature:', error);
        return false;
    }
}