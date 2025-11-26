#!/bin/bash
# Generate secure secrets for AJOB4AGENT

echo "🔐 Generating Secure Secrets for AJOB4AGENT"
echo "============================================"
echo ""

# Generate secrets
JWT_SECRET=$(openssl rand -hex 32)
API_KEY=$(openssl rand -hex 16)
SESSION_SECRET=$(openssl rand -hex 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
WEBHOOK_SECRET=$(openssl rand -hex 20)

echo "# ===== COPY THESE TO GITHUB SECRETS ====="
echo ""
echo "JWT_SECRET=$JWT_SECRET"
echo "API_KEY=$API_KEY"
echo "SESSION_SECRET=$SESSION_SECRET"
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
echo "WEBHOOK_SECRET=$WEBHOOK_SECRET"
echo ""
echo "# ===== END SECRETS ====="
echo ""
echo "📋 Add these to: Settings → Secrets → Actions"
