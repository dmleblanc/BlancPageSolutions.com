# GitHub App Setup Instructions

This implementation uses a GitHub App for secure, auto-expiring token authentication instead of personal access tokens.

## 1. Create a GitHub App

1. Go to [GitHub Apps](https://github.com/settings/apps)
2. Click "New GitHub App"
3. Fill in the details:
   - **GitHub App name**: `BlancPage Solutions API`
   - **Homepage URL**: `https://blancpagesolutions.com`
   - **Description**: `API access for BlancPage Solutions website`
   - **Webhook**: Uncheck "Active" (we don't need webhooks)

## 2. Set Permissions

Under **Repository permissions**, set:
- **Contents**: Read (to access commit data)
- **Metadata**: Read (required for basic repo info)
- **Pull requests**: Read (optional, for PR data)

Under **Subscribe to events** (for real-time webhook updates):
- ✅ **Push** (to receive commit notifications)
- ✅ **Repository** (optional, for repo changes)

**Webhook URL**: After deployment, you'll get a webhook URL to configure

## 3. Install the App

1. After creating the app, click "Install App" in the left sidebar
2. Choose "Only select repositories" 
3. Select the repositories you want to track
4. Click "Install"

## 4. Get Required Information

### App ID
- On your GitHub App's settings page
- Listed at the top as "App ID: 123456"

### Installation ID
- After installing, the URL will be: `https://github.com/settings/installations/123456`
- The number at the end is your Installation ID

### Private Key
1. On your GitHub App's settings page
2. Scroll down to "Private keys"
3. Click "Generate a private key"
4. Download the `.pem` file
5. Open the file and copy the entire contents (including `-----BEGIN/END-----` lines)

## 5. Deploy with GitHub App

Run the deployment script:
```bash
./ops/deploy-lambda.sh
```

When prompted, provide:
- **GitHub App ID**: From step 4
- **GitHub Installation ID**: From step 4  
- **GitHub Private Key**: Paste the entire PEM file contents

## 6. Benefits of GitHub App Authentication

✅ **Auto-expiring tokens**: Tokens expire after 1 hour automatically
✅ **Fine-grained permissions**: Only the permissions you explicitly grant
✅ **Better rate limits**: 5,000 requests/hour per installation
✅ **No personal access token management**: No need to rotate tokens manually
✅ **Audit trail**: All API calls are logged under the app, not your personal account

## 7. Rate Limits

- **With GitHub App**: 5,000 requests/hour per installation
- **With Personal Token**: 5,000 requests/hour per user
- **Unauthenticated**: 60 requests/hour per IP

## 8. Configure Real-Time Webhooks

After deployment, you'll receive a webhook URL. To enable real-time commit updates:

1. Go to your GitHub App settings page
2. Scroll to the **Webhook** section
3. Check **"Active"** to enable webhooks
4. Set **Payload URL** to the webhook URL from deployment output
5. Set **Content type** to `application/json`
6. Under **Subscribe to events**, ensure **Push** is selected
7. Save the settings

Your website will now receive real-time updates whenever you push commits to any repository where the app is installed.

## 9. Troubleshooting

### "Bad credentials" error
- Check that your App ID and Installation ID are correct
- Verify the private key was pasted completely (including BEGIN/END lines)
- Ensure the app is installed on the repositories you're trying to access

### "Not found" error  
- Verify the Installation ID matches your installation
- Check that the app has the required permissions (Contents: Read, Metadata: Read)
- Ensure the repositories are included in the installation

### JWT errors
- Check that the private key format is correct (PEM format)
- Verify the App ID is numeric (not the app name)
- Ensure system clock is synchronized (JWT timestamps are sensitive)

### Webhook not receiving events
- Verify the webhook URL is correct and accessible
- Check that "Push" events are subscribed in your GitHub App settings
- Ensure the webhook is marked as "Active"
- Check Lambda logs for any webhook processing errors

For more information, see the [GitHub Apps documentation](https://docs.github.com/en/developers/apps/getting-started-with-apps/about-apps).