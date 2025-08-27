const https = require('https');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');

const secretsManager = new AWS.SecretsManager();
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'https://blancpagesolutions.com',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        const { username, endpoint } = event.queryStringParameters || {};
        
        if (!username) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Username is required' })
            };
        }

        // Get GitHub App installation token
        const token = await getGitHubInstallationToken();
        if (!token) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'GitHub token not configured' })
            };
        }

        let apiUrl;
        let requestData;

        if (endpoint === 'contributions') {
            // GraphQL query for contributions calendar
            apiUrl = 'https://api.github.com/graphql';
            requestData = JSON.stringify({
                query: `
                    query($username: String!) {
                        user(login: $username) {
                            contributionsCollection {
                                contributionCalendar {
                                    totalContributions
                                    weeks {
                                        contributionDays {
                                            date
                                            contributionCount
                                            color
                                        }
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: { username }
            });
        } else if (endpoint === 'events' || endpoint === 'commits') {
            // Get optional includeRepos parameter
            const includeRepos = event.queryStringParameters?.includeRepos 
                ? event.queryStringParameters.includeRepos.split(',') 
                : null;
            
            // Serve recent commits from DynamoDB
            const commits = await getRecentCommits(username, includeRepos);
            return {
                statusCode: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=60' // 1 minute cache for real-time updates
                },
                body: JSON.stringify(commits)
            };
        } else {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid endpoint. Use "contributions", "events", or "commits"' })
            };
        }

        const githubResponse = await makeRequest(apiUrl, {
            method: endpoint === 'contributions' ? 'POST' : 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'BlancPageSolutions-Website',
                'Content-Type': 'application/json'
            }
        }, requestData);

        return {
            statusCode: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300' // 5 minute cache
            },
            body: githubResponse
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

function makeRequest(url, options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(body);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(data);
        }
        
        req.end();
    });
}

async function getGitHubInstallationToken() {
    try {
        // Get GitHub App credentials from Secrets Manager
        const secretResponse = await secretsManager.getSecretValue({
            SecretId: process.env.GITHUB_APP_CREDENTIALS_SECRET
        }).promise();
        
        const credentials = JSON.parse(secretResponse.SecretString);
        const { appId, privateKey, installationId } = credentials;
        
        // Private key is now stored with proper newlines, no conversion needed
        
        // Generate JWT for GitHub App authentication
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iat: now - 60, // Issued 60 seconds in the past to account for clock skew
            exp: now + 600, // Expires in 10 minutes (max allowed)
            iss: appId
        };
        
        const appToken = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
        
        // Get installation access token
        const installationTokenResponse = await makeRequest(
            `https://api.github.com/app/installations/${installationId}/access_tokens`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${appToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'BlancPageSolutions-Lambda'
                }
            }
        );
        
        const tokenData = JSON.parse(installationTokenResponse);
        return tokenData.token;
        
    } catch (error) {
        console.error('Error getting GitHub installation token:', error);
        return null;
    }
}

async function getRecentCommits(username, includeRepos = null) {
    try {
        // For now, scan with filter - in production you'd add a GSI
        // This is acceptable for personal portfolio with limited data
        const scanParams = {
            TableName: process.env.COMMITS_TABLE,
            FilterExpression: '#author.#username = :username',
            ExpressionAttributeNames: {
                '#author': 'author',
                '#username': 'username'
            },
            ExpressionAttributeValues: {
                ':username': username
            },
            Limit: 100 // Scan more items to find recent commits for this user
        };

        console.log('Scanning DynamoDB with params:', JSON.stringify(scanParams, null, 2));
        const result = await dynamodb.scan(scanParams).promise();
        console.log('DynamoDB scan result:', JSON.stringify({count: result.Count, scannedCount: result.ScannedCount}, null, 2));
        
        // Filter by included repositories if specified
        let filteredCommits = result.Items;
        console.log('Before repo filtering - commits count:', filteredCommits.length);
        console.log('includeRepos parameter:', includeRepos);
        
        if (includeRepos && includeRepos.length > 0) {
            filteredCommits = result.Items.filter(commit => {
                // Extract repo name from full path (e.g., "dmleblanc/BlancPageSolutions.com" -> "BlancPageSolutions.com")
                const repoName = commit.repo.includes('/') ? commit.repo.split('/').pop() : commit.repo;
                console.log('Checking repo:', commit.repo, '-> extracted:', repoName, 'against includeRepos:', includeRepos);
                return includeRepos.includes(repoName) || includeRepos.includes(commit.repo);
            });
        }
        
        console.log('After repo filtering - commits count:', filteredCommits.length);
        
        // Sort by timestamp descending and take the most recent 10
        const sortedCommits = filteredCommits
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);

        // Transform to match GitHub API format
        return sortedCommits.map(commit => ({
            id: commit.sha,
            type: 'PushEvent',
            public: true,
            created_at: new Date(commit.timestamp).toISOString(),
            repo: {
                name: commit.repo
            },
            payload: {
                commits: [{
                    sha: commit.sha,
                    message: commit.message,
                    author: {
                        name: commit.author.name,
                        email: commit.author.email
                    },
                    url: commit.url
                }]
            }
        }));

    } catch (error) {
        console.error('Error getting recent commits from DynamoDB:', error);
        return [];
    }
}