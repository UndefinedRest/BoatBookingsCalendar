#!/bin/bash
# LMRC Booking Viewer - Raspberry Pi Local Network Deployment
# Run this script on your Raspberry Pi to deploy the application

set -e  # Exit on any error

echo "=========================================="
echo "LMRC Booking Viewer - Pi Deployment"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "✓ Node.js found: $(node --version)"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm not found. Please install Node.js first."
    exit 1
else
    echo "✓ npm found: $(npm --version)"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Build the application
echo ""
echo "Building application..."
npm run build

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your RevSport credentials:"
    echo "   nano .env"
    echo ""
    echo "   Update these lines:"
    echo "   REVSPORT_USERNAME=your_username"
    echo "   REVSPORT_PASSWORD=your_password"
    echo ""
    read -p "Press Enter after you've edited .env..."
else
    echo "✓ .env file already exists"
fi

# Install PM2 if not already installed
if ! command -v pm2 &> /dev/null; then
    echo ""
    echo "Installing PM2 process manager..."
    sudo npm install -g pm2
else
    echo "✓ PM2 found: $(pm2 --version)"
fi

# Stop existing instance if running
pm2 delete lmrc-booking-viewer 2>/dev/null || true

# Start the application
echo ""
echo "Starting application with PM2..."
pm2 start dist/server/index.js --name lmrc-booking-viewer

# Save PM2 process list
pm2 save

# Configure PM2 to start on boot
echo ""
echo "Configuring auto-start on boot..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo ""
echo "=========================================="
echo "✓ Deployment Complete!"
echo "=========================================="
echo ""
echo "Application Status:"
pm2 status
echo ""
echo "Access the booking calendar at:"
echo ""
echo "  http://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo "Access the TV display at:"
echo "  http://$(hostname -I | awk '{print $1}'):3001/tv"
echo ""
echo "Useful commands:"
echo "  pm2 logs lmrc-booking-viewer  # View logs"
echo "  pm2 restart lmrc-booking-viewer  # Restart app"
echo "  pm2 stop lmrc-booking-viewer  # Stop app"
echo "  pm2 monit  # Monitor CPU/memory"
echo ""
echo "To update the application in future:"
echo "  git pull"
echo "  npm run build"
echo "  pm2 restart lmrc-booking-viewer"
echo ""
