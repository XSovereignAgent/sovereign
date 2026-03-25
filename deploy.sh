#!/bin/bash
# ============================================
# Sovereign Terminal: VPS Deployment Script
# Automates the setup of Sovereign + OpenClaw
# ============================================

echo "🚀 Starting Sovereign VPS Deployment..."

# 1. Update and install Node.js 20
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install PM2 for process management
echo "⚙️ Installing PM2..."
sudo npm install -g pm2

# 3. Install OpenClaw/OnchainOS CLI
echo "🤖 Installing OpenClaw CLI..."
npm install -g @okx/onchainos-cli

# 4. Install Project Dependencies
echo "📂 Installing project dependencies..."
npm install

# 5. Build the project
echo "🔨 Building Sovereign Terminal..."
npm run build

# 6. Start with PM2
echo "🪐 Launching Sovereign Terminal..."
pm2 start npm --name "sovereign" -- start

echo "✅ Deployment Complete!"
echo "📍 Access your terminal at http://your-vps-ip:3000"
echo "⚠️ Don't forget to configure your .env file!"
