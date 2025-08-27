#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CONFIG_FILE="$SCRIPT_DIR/config.js"
LAMBDA_DIR="$SCRIPT_DIR/../lambda"

AWS_PROFILE=$(grep "awsProfile:" "$CONFIG_FILE" | sed -E "s/.*'([^']+)'.*/\1/")
STACK_NAME=$(grep "stackName:" "$CONFIG_FILE" | sed -E "s/.*'([^']+)'.*/\1/")
REGION=$(grep "region:" "$CONFIG_FILE" | sed -E "s/.*'([^']+)'.*/\1/")

if [ -z "$STACK_NAME" ]; then
    echo "Error: stackName not found in config.js"
    exit 1
fi

echo "Deploying Lambda infrastructure..."
echo "Stack: $STACK_NAME"
echo "Region: $REGION"
echo "Profile: $AWS_PROFILE"
echo ""

# Create deployment package
echo "📦 Creating Lambda deployment package..."
cd "$LAMBDA_DIR"

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    npm install --production
fi

# Create deployment zip (include aws-sdk v2 since Node.js 18 only has v3 built-in)
zip -r lambda-deployment.zip . -x "*.yaml" "*.yml" "*.md" "ARCHITECTURE.md" "SECURE_DEPLOYMENT.md"

echo "✅ Lambda package created: lambda-deployment.zip"
echo ""

# Deploy/Update CloudFormation stack
echo "🚀 Deploying CloudFormation stack..."

# Check if stack exists
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --profile "$AWS_PROFILE" --region "$REGION" >/dev/null 2>&1; then
    echo "Stack exists, updating..."
    OPERATION="update-stack"
else
    echo "Stack does not exist, creating..."
    OPERATION="create-stack"
fi

# Set up the secret name based on stack name
SECRET_NAME="${STACK_NAME}-github-app-credentials"

# Handle GitHub App credentials
echo ""
echo "📋 GitHub App Setup"
echo ""

# Check if secret already exists
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --profile "$AWS_PROFILE" --region "$REGION" >/dev/null 2>&1; then
    echo "✅ Secret '$SECRET_NAME' already exists"
    read -p "Update GitHub App credentials? (y/N): " UPDATE_CREDS
    
    if [[ "$UPDATE_CREDS" =~ ^[Yy]$ ]]; then
        NEEDS_CREDENTIALS=true
    else
        echo "Using existing GitHub App credentials"
        NEEDS_CREDENTIALS=false
    fi
else
    echo "⚠️  Secret '$SECRET_NAME' does not exist - will create new one"
    NEEDS_CREDENTIALS=true
fi

if [ "$NEEDS_CREDENTIALS" = true ]; then
    echo ""
    echo "📝 Enter GitHub App credentials:"
    echo ""
    read -p "GitHub App ID: " GITHUB_APP_ID
    read -p "GitHub Installation ID: " GITHUB_INSTALLATION_ID
    echo ""
    echo "📄 Private key file:"
    read -p "Enter path to your private key file (e.g., ~/Downloads/my-app.private-key.pem): " PEM_FILE_PATH
    
    # Expand the path
    PEM_FILE_PATH="${PEM_FILE_PATH/#\~/$HOME}"
    
    if [ ! -f "$PEM_FILE_PATH" ]; then
        echo "Error: File not found: $PEM_FILE_PATH"
        exit 1
    fi
    
    # Read the private key content
    GITHUB_PRIVATE_KEY=$(cat "$PEM_FILE_PATH")
    
    if [ -z "$GITHUB_APP_ID" ] || [ -z "$GITHUB_INSTALLATION_ID" ] || [ -z "$GITHUB_PRIVATE_KEY" ]; then
        echo "Error: All GitHub App credentials are required"
        exit 1
    fi
    
    # Create JSON payload for secret
    # Check if jq is available
    if command -v jq &> /dev/null; then
        SECRET_JSON=$(jq -n \
            --arg appId "$GITHUB_APP_ID" \
            --arg installationId "$GITHUB_INSTALLATION_ID" \
            --arg privateKey "$GITHUB_PRIVATE_KEY" \
            '{appId: $appId, installationId: $installationId, privateKey: $privateKey}')
    else
        # Fallback: Create JSON manually (careful with escaping)
        # This is less safe but works without jq
        echo "⚠️  jq not found, using fallback JSON creation"
        # Escape the private key for JSON
        ESCAPED_PRIVATE_KEY=$(echo "$GITHUB_PRIVATE_KEY" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
        SECRET_JSON="{\"appId\":\"$GITHUB_APP_ID\",\"installationId\":\"$GITHUB_INSTALLATION_ID\",\"privateKey\":\"$ESCAPED_PRIVATE_KEY\"}"
    fi
    
    echo ""
    echo "🔐 Storing credentials in AWS Secrets Manager..."
    
    # Try to create the secret, or update if it exists
    if aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --description "GitHub App credentials for $STACK_NAME" \
        --secret-string "$SECRET_JSON" \
        --profile "$AWS_PROFILE" \
        --region "$REGION" >/dev/null 2>&1; then
        echo "✅ Secret created successfully"
    else
        # Secret exists, update it
        aws secretsmanager update-secret \
            --secret-id "$SECRET_NAME" \
            --secret-string "$SECRET_JSON" \
            --profile "$AWS_PROFILE" \
            --region "$REGION" >/dev/null
        echo "✅ Secret updated successfully"
    fi
fi

# No parameters needed - CloudFormation will use the secret name
PARAMETERS=""

# Deploy CloudFormation stack
aws cloudformation $OPERATION \
    --stack-name "$STACK_NAME" \
    --template-body file://infrastructure.yaml \
    --capabilities CAPABILITY_IAM \
    --profile "$AWS_PROFILE" \
    --region "$REGION" \
    ${PARAMETERS:+--parameters $PARAMETERS}

DEPLOY_EXIT_CODE=$?
if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "⏳ Waiting for stack operation to complete..."
    
    if [ "$OPERATION" = "create-stack" ]; then
        aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" --profile "$AWS_PROFILE" --region "$REGION"
    else
        aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME" --profile "$AWS_PROFILE" --region "$REGION"
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ CloudFormation stack deployed successfully!"
        
        # Get API Gateway URL from stack outputs
        API_URL=$(aws cloudformation describe-stacks \
            --stack-name "$STACK_NAME" \
            --profile "$AWS_PROFILE" \
            --region "$REGION" \
            --query 'Stacks[0].Outputs[?OutputKey==`APIGatewayURL`].OutputValue' \
            --output text)
        
        if [ -n "$API_URL" ]; then
            echo ""
            echo "🌐 API Gateway URL: $API_URL"
            echo ""
            echo "📝 Update your ops/config.js with this API URL:"
            echo "   apiGatewayUrl: '$API_URL'"
        fi
        
        # Get Webhook URL from stack outputs
        WEBHOOK_URL=$(aws cloudformation describe-stacks \
            --stack-name "$STACK_NAME" \
            --profile "$AWS_PROFILE" \
            --region "$REGION" \
            --query 'Stacks[0].Outputs[?OutputKey==`WebhookURL`].OutputValue' \
            --output text)
        
        if [ -n "$WEBHOOK_URL" ]; then
            echo ""
            echo "🔗 GitHub Webhook URL: $WEBHOOK_URL"
            echo ""
            echo "📝 Configure this webhook URL in your GitHub App settings:"
            echo "   1. Go to your GitHub App settings"
            echo "   2. Enable webhook with URL: $WEBHOOK_URL"
            echo "   3. Subscribe to 'Push' events for real-time updates"
        fi
    else
        echo "❌ CloudFormation stack operation failed"
        exit 1
    fi
elif [ "$OPERATION" = "update-stack" ] && [ $DEPLOY_EXIT_CODE -eq 255 ]; then
    # Exit code 255 often means "no changes" - continue with Lambda updates
    echo "ℹ️  No changes detected in CloudFormation stack - continuing with Lambda updates"
else
    echo "❌ CloudFormation stack deployment failed"
    exit 1
fi

# Upload Lambda deployment package to S3 and update Lambda functions
DEPLOYMENT_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`DeploymentBucket`].OutputValue' \
    --output text)

if [ -n "$DEPLOYMENT_BUCKET" ]; then
    echo ""
    echo "📤 Uploading Lambda package to S3..."
    aws s3 cp lambda-deployment.zip "s3://$DEPLOYMENT_BUCKET/lambda-deployment.zip" \
        --profile "$AWS_PROFILE" \
        --region "$REGION"
    
    echo "✅ Lambda package uploaded successfully!"
    
    echo ""
    echo "🔄 Updating Lambda function code..."
    
    # Update both Lambda functions with the uploaded code
    if aws lambda update-function-code \
        --function-name "$STACK_NAME-github-proxy" \
        --s3-bucket "$DEPLOYMENT_BUCKET" \
        --s3-key lambda-deployment.zip \
        --profile "$AWS_PROFILE" \
        --region "$REGION" >/dev/null; then
        echo "✅ Updated github-proxy Lambda function"
    else
        echo "⚠️  Failed to update github-proxy Lambda function"
    fi
    
    if aws lambda update-function-code \
        --function-name "$STACK_NAME-github-webhook" \
        --s3-bucket "$DEPLOYMENT_BUCKET" \
        --s3-key lambda-deployment.zip \
        --profile "$AWS_PROFILE" \
        --region "$REGION" >/dev/null; then
        echo "✅ Updated github-webhook Lambda function"
    else
        echo "⚠️  Failed to update github-webhook Lambda function"
    fi
else
    echo "⚠️  Could not determine deployment bucket name"
fi

# Cleanup
rm -f lambda-deployment.zip

echo ""
echo "🎉 Lambda infrastructure deployment complete!"