#!/bin/bash

# Cost Assembler Deployment Script für Ubuntu 24.04 VPS
# Dieses Script deployt die App auf deinem Server

echo "🚀 Cost Assembler Deployment Script"
echo "===================================="
echo ""

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Server-IP oder Domain eingeben
read -p "Server IP oder Domain (z.B. 123.456.789.0): " SERVER_IP
read -p "SSH User (meistens 'root' oder 'ubuntu'): " SSH_USER
read -p "App Name (z.B. cost-assembler): " APP_NAME
read -p "Domain für die App (z.B. splitter.deine-domain.de): " DOMAIN

echo ""
echo "${YELLOW}Verbinde mit Server...${NC}"

# SSH Verbindung testen
if ssh -o ConnectTimeout=5 $SSH_USER@$SERVER_IP "echo 'Verbindung erfolgreich'" &> /dev/null; then
    echo "${GREEN}✓ SSH Verbindung erfolgreich${NC}"
else
    echo "${RED}✗ SSH Verbindung fehlgeschlagen${NC}"
    echo "Bitte prüfe deine Server-IP und SSH-Zugangsdaten"
    exit 1
fi

echo ""
echo "${YELLOW}Installation auf Server...${NC}"

# Commands auf dem Server ausführen
ssh $SSH_USER@$SERVER_IP bash << 'ENDSSH'

# Update System
echo "📦 System Update..."
sudo apt update
sudo apt upgrade -y

# Node.js installieren (Version 20 LTS)
echo "📦 Node.js installieren..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 installieren (Process Manager)
echo "📦 PM2 installieren..."
sudo npm install -g pm2

# Nginx installieren
echo "📦 Nginx installieren..."
sudo apt install -y nginx

# Certbot für SSL installieren
echo "📦 Certbot installieren..."
sudo apt install -y certbot python3-certbot-nginx

# Git installieren
echo "📦 Git installieren..."
sudo apt install -y git

echo "✅ Basis-Installation abgeschlossen"

ENDSSH

echo ""
echo "${GREEN}✓ Server-Setup abgeschlossen${NC}"
echo ""
echo "${YELLOW}Nächste Schritte:${NC}"
echo "1. App-Code auf Server übertragen"
echo "2. Dependencies installieren"
echo "3. PM2 konfigurieren"
echo "4. Nginx konfigurieren"
echo "5. SSL-Zertifikat einrichten"
echo ""
echo "Möchtest du fortfahren? (y/n)"
read -p "> " CONTINUE

if [ "$CONTINUE" != "y" ]; then
    echo "Deployment abgebrochen"
    exit 0
fi

echo ""
echo "${YELLOW}Code auf Server übertragen...${NC}"

# Lokalen Code zippen (ohne node_modules und DB)
tar -czf app.tar.gz --exclude='node_modules' --exclude='*.db' --exclude='.git' .

# Auf Server hochladen
scp app.tar.gz $SSH_USER@$SERVER_IP:/tmp/

# Auf Server entpacken und einrichten
ssh $SSH_USER@$SERVER_IP bash << ENDSSH2

# App-Verzeichnis erstellen
sudo mkdir -p /var/www/$APP_NAME
cd /var/www/$APP_NAME

# Code entpacken
sudo tar -xzf /tmp/app.tar.gz -C /var/www/$APP_NAME
sudo chown -R $SSH_USER:$SSH_USER /var/www/$APP_NAME

# Dependencies installieren
echo "📦 Dependencies installieren..."
npm install --production

# .env Datei erstellen
if [ ! -f .env ]; then
    cp .env.example .env
    
    # Zufällige Secrets generieren
    SESSION_SECRET=\$(openssl rand -base64 32)
    ENCRYPTION_KEY=\$(openssl rand -base64 32)
    
    # In .env eintragen
    sed -i "s/dein-sehr-sicherer-geheimer-schluessel-hier-aendern/\$SESSION_SECRET/" .env
    sed -i "s/dein-verschluesselungs-key-hier-aendern/\$ENCRYPTION_KEY/" .env
    
    echo "✅ .env Datei erstellt mit zufälligen Secrets"
fi

# PM2 starten
echo "🚀 App mit PM2 starten..."
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start server.js --name $APP_NAME
pm2 save
pm2 startup | tail -n 1 | bash

echo "✅ App läuft auf Port 3000"

# Nginx konfigurieren
echo "⚙️  Nginx konfigurieren..."
sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null << 'NGINX_CONFIG'
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX_CONFIG

# Nginx aktivieren
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Nginx konfiguriert"

# Firewall
echo "🔥 Firewall konfigurieren..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable

echo "✅ Firewall aktiviert"

ENDSSH2

# Cleanup
rm app.tar.gz

echo ""
echo "${GREEN}=====================================${NC}"
echo "${GREEN}✅ DEPLOYMENT ERFOLGREICH!${NC}"
echo "${GREEN}=====================================${NC}"
echo ""
echo "📝 Zusammenfassung:"
echo "   Server: $SERVER_IP"
echo "   App läuft auf: http://$DOMAIN"
echo "   PM2 Status: pm2 status"
echo "   PM2 Logs: pm2 logs $APP_NAME"
echo ""
echo "${YELLOW}Nächster Schritt - SSL einrichten:${NC}"
echo "1. Verbinde per SSH: ssh $SSH_USER@$SERVER_IP"
echo "2. Führe aus: sudo certbot --nginx -d $DOMAIN"
echo "3. Folge den Anweisungen"
echo ""
echo "${YELLOW}DNS-Einstellungen:${NC}"
echo "Erstelle einen A-Record bei deinem Domain-Anbieter:"
echo "   Name: splitter (oder dein Subdomain-Name)"
echo "   Type: A"
echo "   Value: $SERVER_IP"
echo "   TTL: 3600"
echo ""
echo "🎉 Viel Erfolg!"
