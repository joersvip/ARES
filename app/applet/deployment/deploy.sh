#!/bin/bash
# Deployment script for Ubuntu, Debian, and Kali Linux
# Supports Localhost and Domain configurations with HTTPS

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root using sudo or su."
  exit 1
fi

echo "========================================"
echo " Starting Automated Deployment Process "
echo "========================================"

# 1. Update system & install dependencies
echo "[1/7] Updating package lists and installing dependencies..."
apt-get update -y
apt-get install -y apt-transport-https ca-certificates curl software-properties-common nginx certbot python3-certbot-nginx cron tar gzip

# 2. Install Docker & Docker Compose if not present
echo "[2/7] Checking Docker and Docker Compose..."
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo "Docker is already installed."
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    apt-get install -y docker-compose-plugin || apt-get install -y docker-compose
fi

systemctl enable docker
systemctl start docker

# 3. Prompt for Domain Configuration
echo ""
echo "[3/7] Domain & Network Configuration"
read -p "Enter your domain name (e.g., example.com) or 'localhost' for local deployment: " DOMAIN
if [ "$DOMAIN" != "localhost" ]; then
    read -p "Enter your email for Let's Encrypt SSL alerts: " EMAIL
fi

# 4. Copy Nginx Configuration
echo "[4/7] Configuring Nginx Reverse Proxy..."
cp nginx.conf /etc/nginx/sites-available/$DOMAIN.conf
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/$DOMAIN.conf
ln -sf /etc/nginx/sites-available/$DOMAIN.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

# 5. SSL / HTTPS Setup via Certbot (Skip if localhost)
echo "[5/7] SSL & HTTPS Configuration..."
if [ "$DOMAIN" != "localhost" ]; then
    echo "Requesting SSL Certificate for $DOMAIN..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL
else
    echo "Localhost detected. Skipping SSL/HTTPS configuration."
fi

# 6. Start Application via Docker Compose
echo "[6/7] Starting Docker containers..."
# Navigate to the directory containing docker-compose.yml
cd ..
docker-compose up -d --build

# 7. Setup Backup Cron Job (Daily at 2 AM)
echo "[7/7] Configuring Automated Backups..."
cd deployment
chmod +x backup.sh
BACKUP_SCRIPT="$(pwd)/backup.sh"

# Add to crontab if not already present
(crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT"; echo "0 2 * * * $BACKUP_SCRIPT") | crontab -

echo "========================================"
echo " Deployment complete! "
if [ "$DOMAIN" != "localhost" ]; then
    echo " Application is available at: https://$DOMAIN"
else
    echo " Application is available at: http://$DOMAIN"
fi
echo " Automated backups are scheduled daily at 2:00 AM."
echo "========================================"
