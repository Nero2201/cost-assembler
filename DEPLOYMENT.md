# Cost Assembler - Deployment Guide

## 🚀 Deployment auf Ubuntu 24.04 VPS

### Voraussetzungen
- Ubuntu 24.04 Server mit SSH-Zugang
- 1GB RAM, 1 Core, 20GB Speicher ✅
- Domain oder Subdomain (optional)

---

## 📋 Schritt-für-Schritt Anleitung

### Option A: Automatisches Deployment (Empfohlen)

1. **Deployment-Script ausführbar machen:**
   ```bash
   chmod +x deploy.sh
   ```

2. **Deployment starten:**
   ```bash
   ./deploy.sh
   ```
   
3. **Fragen beantworten:**
   - Server IP: `123.456.789.0`
   - SSH User: `root` oder `ubuntu`
   - App Name: `cost-assembler`
   - Domain: `splitter.deine-domain.de`

4. **DNS konfigurieren:**
   - Bei deinem Domain-Anbieter:
   - A-Record erstellen: `splitter` → `Server-IP`

5. **SSL einrichten:**
   ```bash
   ssh root@SERVER_IP
   sudo certbot --nginx -d splitter.deine-domain.de
   ```

**Fertig!** App läuft auf: `https://splitter.deine-domain.de`

---

### Option B: Manuelles Deployment

#### 1. Auf VPS einloggen
```bash
ssh root@DEINE_SERVER_IP
```

#### 2. Node.js installieren
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

#### 3. PM2 installieren
```bash
sudo npm install -g pm2
```

#### 4. Nginx installieren
```bash
sudo apt install -y nginx
sudo apt install -y certbot python3-certbot-nginx
```

#### 5. App-Code übertragen
```bash
# Auf deinem Mac (im Projekt-Ordner):
tar -czf app.tar.gz --exclude='node_modules' --exclude='*.db' .
scp app.tar.gz root@SERVER_IP:/tmp/

# Auf dem Server:
mkdir -p /var/www/cost-assembler
cd /var/www/cost-assembler
tar -xzf /tmp/app.tar.gz
```

#### 6. Dependencies installieren
```bash
npm install --production
```

#### 7. .env Datei erstellen
```bash
cp .env.example .env
nano .env
```

Ändere die Secrets:
```env
SESSION_SECRET=dein-sehr-langer-zufälliger-string
ENCRYPTION_KEY=noch-ein-sehr-langer-zufälliger-string
```

Zufällige Strings generieren:
```bash
openssl rand -base64 32
```

#### 8. App mit PM2 starten
```bash
pm2 start server.js --name cost-assembler
pm2 save
pm2 startup
```

#### 9. Nginx konfigurieren
```bash
sudo nano /etc/nginx/sites-available/cost-assembler
```

Inhalt:
```nginx
server {
    listen 80;
    server_name splitter.deine-domain.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktivieren:
```bash
sudo ln -s /etc/nginx/sites-available/cost-assembler /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 10. Firewall konfigurieren
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

#### 11. SSL-Zertifikat einrichten
```bash
sudo certbot --nginx -d splitter.deine-domain.de
```

---

## 🔧 Nützliche Befehle

### PM2 (App Management)
```bash
pm2 status              # Status anzeigen
pm2 logs cost-assembler # Logs anzeigen
pm2 restart cost-assembler # App neustarten
pm2 stop cost-assembler    # App stoppen
pm2 delete cost-assembler  # App entfernen
```

### Nginx
```bash
sudo systemctl status nginx  # Status
sudo systemctl reload nginx  # Neu laden
sudo nginx -t               # Config testen
```

### App aktualisieren
```bash
# Lokal:
tar -czf app.tar.gz --exclude='node_modules' --exclude='*.db' .
scp app.tar.gz root@SERVER_IP:/tmp/

# Auf Server:
cd /var/www/cost-assembler
tar -xzf /tmp/app.tar.gz
npm install --production
pm2 restart cost-assembler
```

---

## 📊 Ressourcen-Übersicht

Dein VPS (1GB RAM, 1 Core, 20GB):
- Node.js: ~50-100MB RAM
- Nginx: ~10-20MB RAM
- SQLite: ~10MB RAM
- App: ~30-50MB RAM

**Total: ~100-180MB RAM** ✅ Passt perfekt!

---

## 🆘 Troubleshooting

### App startet nicht
```bash
pm2 logs cost-assembler --lines 50
```

### Port schon belegt
```bash
sudo lsof -i :3000
# Prozess beenden:
sudo kill -9 PID
```

### Nginx Fehler
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### SSL-Probleme
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

---

## 🔐 Sicherheit

- ✅ Passwörter mit bcrypt gehasht
- ✅ Daten mit AES verschlüsselt
- ✅ Session-Management
- ✅ HTTPS mit Let's Encrypt
- ✅ Firewall aktiv

---

## 📝 Backup

```bash
# Datenbank sichern
cd /var/www/cost-assembler
cp splitter.db splitter.db.backup

# Auf Mac herunterladen
scp root@SERVER_IP:/var/www/cost-assembler/splitter.db ./backup/
```

---

## 🎉 Fertig!

Deine App läuft jetzt auf:
- **HTTP:** http://deine-domain.de (wird zu HTTPS umgeleitet)
- **HTTPS:** https://deine-domain.de

**Performance:** Läuft butterweich auf deinem 1GB VPS! 🚀
