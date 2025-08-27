#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CONFIG_FILE="$SCRIPT_DIR/config.js"

AWS_PROFILE=$(grep "awsProfile:" "$CONFIG_FILE" | sed -E "s/.*'([^']+)'.*/\1/")
BUCKET_NAME=$(grep "bucketName:" "$CONFIG_FILE" | sed -E "s/.*'([^']+)'.*/\1/")
DISTRIBUTION_ID=$(grep "cloudFrontDistributionId:" "$CONFIG_FILE" | sed -E "s/.*'([^']+)'.*/\1/")

SOURCE_DIR="$SCRIPT_DIR/.."

echo "Deploying to S3..."
echo "Bucket: $BUCKET_NAME"
echo "Profile: $AWS_PROFILE"

aws s3 sync "$SOURCE_DIR" "s3://$BUCKET_NAME" \
    --profile "$AWS_PROFILE" \
    --delete \
    --exclude ".git/*" \
    --exclude ".gitignore" \
    --exclude "*.md" \
    --exclude "node_modules/*" \
    --exclude "lambda/node_modules/*" \
    --exclude "lambda/lambda-deployment.zip" \
    --exclude "keys/*" \
    --exclude "ops/*"

echo "S3 sync complete!"

if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "your-distribution-id-here" ]; then
    echo "Creating CloudFront invalidation..."
    echo "Distribution ID: $DISTRIBUTION_ID"
    
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --profile "$AWS_PROFILE" \
        --distribution-id "$DISTRIBUTION_ID" \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)
    
    echo "CloudFront invalidation created: $INVALIDATION_ID"
    echo "It may take a few minutes for the changes to propagate."
else
    echo "Skipping CloudFront invalidation (distribution ID not configured)"
fi

echo "Deploy complete!"