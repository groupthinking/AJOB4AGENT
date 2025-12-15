#!/bin/bash

# SMTP Secrets Setup Script for AJOB4AGENT
# This script helps you set up GitHub Actions secrets for email functionality

echo "🚀 AJOB4AGENT SMTP Secrets Setup"
echo "================================="
echo ""

# Check if GitHub CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI."
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is ready"
echo ""

# SMTP Configuration Template
echo "📧 SMTP Configuration Required:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "You'll need to create these 6 secrets in GitHub:"
echo ""

echo "1. SMTP_HOST"
echo "   Value: smtp.gmail.com"
echo "   → Gmail's SMTP server"
echo ""

echo "2. SMTP_USERNAME"
echo "   Value: YOUR_EMAIL@gmail.com"
echo "   → Your Gmail email address"
echo ""

echo "3. SMTP_PASSWORD"
echo "   Value: <YOUR_APP_PASSWORD>"
echo "   → Your Gmail app password (16 characters, generated from Google Account settings)"
echo ""

echo "4. SMTP_FROM"
echo "   Value: YOUR_EMAIL@gmail.com"
echo "   → Who the email appears to be from (same as username)"
echo ""

echo "5. SMTP_TO"
echo "   Value: [Recipient email address]"
echo "   → Where to send daily job reports"
echo ""

echo "6. SMTP_PORT (Optional)"
echo "   Value: 587"
echo "   → Gmail SMTP port (defaults to 587 if not set)"
echo ""

echo "🔧 To create these secrets manually:"
echo "1. Go to: https://github.com/groupthinking/AJOB4AGENT/settings/secrets/actions"
echo "2. Click 'New repository secret'"
echo "3. Enter each name and value listed above"
echo ""

echo "⚡ Or run these commands (replace YOUR_EMAIL@gmail.com, YOUR_APP_PASSWORD, and RECIPIENT_EMAIL):"
echo ""
echo "# Required secrets:"
echo "gh secret set SMTP_HOST --body 'smtp.gmail.com'"
echo "gh secret set SMTP_USERNAME --body 'YOUR_EMAIL@gmail.com'"
echo "gh secret set SMTP_PASSWORD --body 'YOUR_APP_PASSWORD'"
echo "gh secret set SMTP_FROM --body 'YOUR_EMAIL@gmail.com'"
echo "gh secret set SMTP_TO --body 'RECIPIENT_EMAIL@gmail.com'"
echo ""
echo "# Optional (will default to 587):"
echo "gh secret set SMTP_PORT --body '587'"
echo ""

echo "🎯 After setting up secrets, test with:"
echo "gh workflow run email-smoke.yml"
echo ""

echo "📅 The daily job reports will run automatically at:"
echo "   • 8:00 AM Central Time (weekdays)"
echo "   • 5:45 PM Central Time (weekdays)"
echo ""

echo "✨ Setup complete! Your automated job search system is ready."
