const AWS = require('aws-sdk');
const crypto = require('crypto');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const secretsManager = new AWS.SecretsManager();

exports.handler = async (event) => {
    console.log('🚀 Webhook event received!');
    console.log('Event headers:', JSON.stringify(event.headers, null, 2));
    console.log('Event body (first 500 chars):', event.body?.substring(0, 500));
    console.log('Full event:', JSON.stringify(event, null, 2));

    try {
        // Parse the incoming webhook payload
        const payload = JSON.parse(event.body || '{}');
        const headers = event.headers || {};

        console.log('📦 Parsed payload keys:', Object.keys(payload));
        // GitHub headers are case-sensitive
        const githubEvent = headers['X-GitHub-Event'];
        const githubSignature = headers['X-Hub-Signature-256'];
        
        console.log('🔍 GitHub event type:', githubEvent);
        console.log('🔐 Signature present:', !!githubSignature);

        // Verify GitHub webhook signature (optional but recommended)
        if (githubSignature && !await verifyWebhookSignature(event.body, githubSignature)) {
            console.log('❌ Signature verification failed');
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Invalid signature' })
            };
        } else if (githubSignature) {
            console.log('✅ Signature verified successfully');
        } else {
            console.log('⚠️ No signature provided - skipping verification');
        }

        // Handle push events
        if (githubEvent === 'push') {
            console.log('🔄 Processing push event...');
            await handlePushEvent(payload);
            console.log('✅ Push event processed successfully');
        } else {
            console.log(`ℹ️ Ignoring non-push event: ${githubEvent}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Webhook processed successfully' })
        };

    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        console.error('Error stack:', error.stack);
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
    console.log('Repository data:', JSON.stringify(repository, null, 2));
    console.log('All commits data:', JSON.stringify(commits, null, 2));
    console.log('Environment variables:', {
        COMMITS_TABLE: process.env.COMMITS_TABLE,
        GITHUB_APP_CREDENTIALS_SECRET: process.env.GITHUB_APP_CREDENTIALS_SECRET
    });

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
                username: commit.author.username || commit.committer.username || extractUsernameFromEmail(commit.author.email) || 'unknown'
            },
            url: commit.url,
            added: commit.added || [],
            removed: commit.removed || [],
            modified: commit.modified || []
        };

        console.log(`[COMMIT ${i + 1}/${commits.length}] About to write commit data:`, JSON.stringify(commitData, null, 2));
        console.log(`[COMMIT ${i + 1}/${commits.length}] DynamoDB put parameters:`, {
            TableName: process.env.COMMITS_TABLE,
            ItemKeys: Object.keys(commitData)
        });
        
        try {
            const putResult = await dynamodb.put({
                TableName: process.env.COMMITS_TABLE,
                Item: commitData
            }).promise();
            
            console.log(`[COMMIT ${i + 1}/${commits.length}] ✅ Successfully stored commit: ${commit.id.substring(0, 7)} - ${commit.message.substring(0, 50)}...`);
            console.log(`[COMMIT ${i + 1}/${commits.length}] DynamoDB put result:`, JSON.stringify(putResult, null, 2));
        } catch (error) {
            console.error(`[COMMIT ${i + 1}/${commits.length}] ❌ Error storing commit ${commit.id}:`, error);
            console.error(`[COMMIT ${i + 1}/${commits.length}] Full error details:`, JSON.stringify(error, null, 2));
            console.error(`[COMMIT ${i + 1}/${commits.length}] Error stack:`, error.stack);
        }
    }
}

function extractUsernameFromEmail(email) {
    if (!email) return null;
    // Handle GitHub noreply emails like "username@users.noreply.github.com"
    if (email.includes('@users.noreply.github.com')) {
        return email.split('@')[0];
    }
    // For other emails, use the part before @
    return email.split('@')[0];
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