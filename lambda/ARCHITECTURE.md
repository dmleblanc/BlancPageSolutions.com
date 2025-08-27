# GitHub Integration Architecture

## Overview

The BlancPage Solutions website integrates with GitHub to display real-time commit activity and contribution calendar data. The architecture uses AWS serverless components to provide secure, scalable GitHub data access without exposing API tokens to the client-side application.

## Architecture Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub App    │───▶│  GitHub Webhook  │───▶│   DynamoDB     │
│  (Push Events)  │    │    (Lambda)      │    │ (Commit Store) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐             │
│  Frontend JS    │◄───│  GitHub Proxy    │◄────────────┘
│ (BlancPage.com) │    │    (Lambda)      │
└─────────────────┘    └──────────────────┘
                                │
                       ┌──────────────────┐
                       │   GitHub API     │
                       │ (Contributions)  │
                       └──────────────────┘
```

## Component Details

### 1. GitHub App Authentication
- **Purpose**: Secure, auto-expiring token management
- **Location**: GitHub Settings → Developer settings → GitHub Apps
- **Credentials**: App ID, Installation ID, Private Key (RSA)
- **Permissions**: 
  - Contents: Read (access commit data)
  - Metadata: Read (basic repo info)
- **Events**: Push (for webhooks)

### 2. AWS Secrets Manager
- **Purpose**: Secure storage of GitHub App credentials
- **Secret Name**: `${StackName}-github-app-credentials`
- **Contents**:
  ```json
  {
    "appId": "123456",
    "privateKey": "-----BEGIN RSA PRIVATE KEY-----\n...",
    "installationId": "789012"
  }
  ```

### 3. GitHub Webhook Lambda (`github-webhook.js`)
- **Trigger**: GitHub push events via API Gateway POST `/webhook`
- **Purpose**: Receive and process real-time commit notifications
- **Function**:
  1. Receives GitHub webhook payload
  2. Validates webhook signature (optional)
  3. Extracts commit data from push events
  4. Stores commits in DynamoDB with 30-day TTL
- **Environment Variables**:
  - `GITHUB_APP_CREDENTIALS_SECRET`: Secrets Manager ARN
  - `COMMITS_TABLE`: DynamoDB table name

### 4. DynamoDB Commits Table
- **Purpose**: Store recent commits for fast retrieval
- **Table Name**: `${StackName}-recent-commits`
- **Schema**:
  - **Partition Key**: `repo` (String) - Repository full name
  - **Sort Key**: `timestamp` (Number) - Unix timestamp
  - **TTL**: 30 days automatic cleanup
- **Sample Record**:
  ```json
  {
    "repo": "username/repository",
    "timestamp": 1703123456789,
    "ttl": 1705715456,
    "sha": "abc123def456",
    "message": "Fix authentication bug",
    "author": {
      "name": "David LeBlanc",
      "email": "dave@example.com",
      "username": "davidleblanc"
    },
    "url": "https://github.com/username/repository/commit/abc123def456",
    "added": ["file1.js"],
    "removed": [],
    "modified": ["file2.js"]
  }
  ```

### 5. GitHub Proxy Lambda (`github-proxy.js`)
- **Trigger**: Frontend requests via API Gateway GET `/github`
- **Purpose**: Serve GitHub data to frontend with CORS support
- **Endpoints**:
  - `?endpoint=contributions&username=X`: GitHub GraphQL contributions calendar
  - `?endpoint=commits&username=X`: Recent commits from DynamoDB
  - `?endpoint=events&username=X`: Recent commits from DynamoDB (alias)
- **Function**:
  1. Generates GitHub App JWT token
  2. Gets installation access token (1-hour expiry)
  3. For contributions: Calls GitHub GraphQL API
  4. For commits: Queries DynamoDB table
  5. Returns data with CORS headers
- **Environment Variables**:
  - `GITHUB_APP_CREDENTIALS_SECRET`: Secrets Manager ARN
  - `CORS_ORIGIN`: Allowed origin (https://blancpagesolutions.com)
  - `COMMITS_TABLE`: DynamoDB table name

### 6. API Gateway
- **Purpose**: HTTP endpoints for Lambda functions
- **Endpoints**:
  - `GET /github`: GitHub data proxy (public)
  - `POST /webhook`: GitHub webhook receiver (GitHub only)
  - `OPTIONS /github`: CORS preflight support
- **Configuration**:
  - CORS enabled for frontend domain
  - Lambda proxy integration
  - No authentication (GitHub webhook signature verification in Lambda)

### 7. Frontend JavaScript (`script.js`)
- **Purpose**: Display GitHub data on website
- **Functions**:
  - `loadRecentCommits()`: Fetches commits from proxy API
  - `loadContributions()`: Fetches contribution calendar
  - `startCommitsAutoRefresh()`: Auto-refresh every 30 seconds
- **API Calls**:
  ```javascript
  // Real-time commits from DynamoDB
  fetch(`${apiEndpoint}?username=${username}&endpoint=commits`)
  
  // Contribution calendar from GitHub API
  fetch(`${apiEndpoint}?username=${username}&endpoint=contributions`)
  ```

## Data Flow

### Real-time Commit Flow
1. **Push Event**: Developer pushes code to GitHub
2. **Webhook**: GitHub sends POST to `/webhook` endpoint
3. **Processing**: Webhook Lambda validates and stores commit data
4. **Storage**: Commit saved to DynamoDB with TTL
5. **Display**: Frontend auto-refreshes and shows new commit (30s max delay)

### Contribution Calendar Flow
1. **Page Load**: Frontend requests contribution data
2. **Authentication**: Proxy Lambda generates GitHub App token
3. **API Call**: Lambda calls GitHub GraphQL API
4. **Response**: Contribution calendar data returned to frontend
5. **Rendering**: JavaScript renders GitHub-style contribution grid

## Security Features

### 1. GitHub App Benefits
- ✅ Auto-expiring tokens (1 hour)
- ✅ Fine-grained permissions
- ✅ Better rate limits (5,000/hour per installation)
- ✅ Audit trail separate from personal account
- ✅ No long-lived tokens in code

### 2. AWS Security
- 🔒 Credentials in Secrets Manager (encrypted at rest)
- 🔒 IAM roles with minimal permissions
- 🔒 CORS restrictions to specific domain
- 🔒 Optional webhook signature verification

### 3. Data Protection
- 🗑️ Automatic data cleanup (30-day TTL)
- 🚫 No sensitive data in commit storage
- 📍 Regional data storage (AWS region)

## Monitoring & Operations

### CloudWatch Logs
- `/aws/lambda/${StackName}-github-proxy`: API requests and errors
- `/aws/lambda/${StackName}-github-webhook`: Webhook processing

### Key Metrics
- Lambda invocation count and duration
- DynamoDB read/write capacity usage
- API Gateway request count and latency

### Cost Breakdown (Estimated Monthly)
- **Lambda**: ~$0.20 (assuming 1000 invocations)
- **DynamoDB**: ~$0.25 (pay-per-request, 30-day data)
- **API Gateway**: ~$3.50 (per million requests)
- **Secrets Manager**: ~$0.40 (per secret)
- **Total**: ~$4.35/month for moderate usage

## Deployment

### Infrastructure as Code
- **CloudFormation**: `infrastructure.yaml` (complete stack)
- **Deployment Script**: `deploy-lambda.sh` (automated deployment)

### Deployment Steps
```bash
# Deploy infrastructure and Lambda functions
./ops/deploy-lambda.sh

# Configure GitHub App webhook with provided URL
# Enable "Push" events in GitHub App settings
```

### Required GitHub App Configuration
1. Create GitHub App with repository permissions
2. Install app on target repositories
3. Generate private key
4. Configure webhook URL (from deployment output)
5. Enable "Push" event subscription

## Troubleshooting

### Common Issues
- **No commits showing**: Check DynamoDB table has data, verify webhook is receiving events
- **Contributions not loading**: Verify GitHub App has Contents permission and is installed
- **CORS errors**: Check API Gateway CORS configuration and frontend domain
- **Rate limits**: GitHub Apps have 5,000 req/hour limit per installation

### Debug Commands
```bash
# Check DynamoDB table contents
aws dynamodb scan --table-name ${StackName}-recent-commits

# View Lambda logs
aws logs tail /aws/lambda/${StackName}-github-proxy --follow

# Test webhook endpoint
curl -X POST ${WebhookURL} -H "Content-Type: application/json" -d '{"test": true}'
```

## Future Enhancements

### Potential Improvements
1. **Global Secondary Index**: Add GSI on `author.username` for better DynamoDB performance
2. **Caching**: Add ElastiCache for frequently accessed data
3. **Multi-user**: Support multiple GitHub users/organizations
4. **Enhanced Analytics**: Track commit patterns, language usage, etc.
5. **Backup**: Automated DynamoDB backups for data retention beyond 30 days

### Scalability Considerations
- Current architecture handles ~1000 commits/day easily
- DynamoDB auto-scales with demand
- Lambda scales automatically to 1000 concurrent executions
- For high-traffic sites, consider CloudFront caching