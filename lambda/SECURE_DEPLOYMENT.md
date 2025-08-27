# Secure GitHub App Deployment

## Overview

This document explains the secure deployment process for GitHub App credentials with AWS Lambda.

## Security Improvements

### Previous Issues (❌ Insecure)
- Private keys were passed as CloudFormation parameters
- Credentials appeared in CloudFormation console, logs, and API calls
- Shell escaping issues with multi-line PEM files
- Violated AWS security best practices

### New Approach (✅ Secure)
- Credentials stored directly in AWS Secrets Manager
- CloudFormation never sees the private key
- No complex parameter escaping needed
- Follows AWS security best practices

## Deployment Process

### 1. First Time Setup

```bash
./ops/deploy-lambda.sh
```

The script will:
1. Check if secret exists in Secrets Manager
2. Prompt for GitHub App credentials:
   - App ID (numeric)
   - Installation ID (numeric)
   - Path to private key .pem file
3. Create secret in AWS Secrets Manager
4. Deploy CloudFormation stack
5. Update Lambda functions with actual code

### 2. Updating Credentials

When running the script on an existing deployment:
```bash
./ops/deploy-lambda.sh
# Prompts: "Update GitHub App credentials? (y/N)"
```

Choose:
- `N` (default) - Keep existing credentials
- `Y` - Enter new credentials

### 3. Secret Name Convention

The secret is automatically named: `${STACK_NAME}-github-app-credentials`

For example, if your stack is `blancpage-lambda`, the secret will be `blancpage-lambda-github-app-credentials`

## Architecture

```
┌─────────────────┐
│ Deployment      │
│ Script          │
└────────┬────────┘
         │ Creates/Updates
         ▼
┌─────────────────┐
│ Secrets Manager │
│ (Credentials)   │
└────────┬────────┘
         │ Referenced by
         ▼
┌─────────────────┐
│ CloudFormation  │
│ (Infrastructure)│
└────────┬────────┘
         │ Grants Access
         ▼
┌─────────────────┐
│ Lambda Functions│
│ (Read Secret)   │
└─────────────────┘
```

## Required Tools

- **AWS CLI**: For Secrets Manager and CloudFormation operations
- **jq** (optional): For safe JSON creation (fallback available if not installed)

## IAM Permissions Required

The deployment user needs:
- `secretsmanager:CreateSecret`
- `secretsmanager:UpdateSecret`
- `secretsmanager:DescribeSecret`
- CloudFormation deployment permissions

Lambda functions are granted:
- `secretsmanager:GetSecretValue` for their specific secret only

## Cost

- **Secrets Manager**: ~$0.40/month per secret
- No additional costs compared to parameter-based approach

## Troubleshooting

### "Secret already exists" error
The secret name is already in use. Either:
- Use the existing secret (choose "N" when prompted)
- Update the existing secret (choose "Y" when prompted)

### "File not found" error
Ensure the private key file path is correct. The script accepts:
- Absolute paths: `/Users/name/Downloads/key.pem`
- Tilde paths: `~/Downloads/key.pem` (automatically expanded)

### Lambda function "Bad credentials" error
Check in Secrets Manager console that the secret contains:
- Valid `appId` (numeric)
- Valid `installationId` (numeric)  
- Complete `privateKey` (including BEGIN/END lines)

## Security Benefits

1. **No Credential Exposure**: Private keys never appear in CloudFormation templates, parameters, or logs
2. **Encryption at Rest**: Secrets Manager encrypts credentials using AWS KMS
3. **Audit Trail**: All secret access is logged in CloudTrail
4. **Easy Rotation**: Update credentials without redeploying infrastructure
5. **Least Privilege**: Lambda functions only access their specific secret

## Migration from Old Deployment

If you have an existing deployment with parameters:
1. Delete the old stack: `aws cloudformation delete-stack --stack-name <name>`
2. Run the new deployment script
3. Enter your GitHub App credentials when prompted

The new deployment is completely separate and won't interfere with the old parameter-based approach.