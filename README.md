# 💰 Ausgaben Splitter

Eine Tricount-ähnliche Webapp zum Teilen und Verwalten von Gruppenausgaben mit sicherem Login-System und verschlüsselter Datenspeicherung.

## ✨ Features

- 🔐 **Sicheres Login-System** mit vordefinierten Benutzern
- 🆕 **Ersteinrichtung** - Passwort beim ersten Login erstellen
- 👥 **Personenverwaltung** - Personen zur Gruppe hinzufügen/entfernen
- 💸 **Ausgaben tracken** - Mit Checkbox-Auswahl für Kostenaufteilung
- 📊 **Übersicht** - Automatische Berechnung wer wem wie viel schuldet
- 🎨 **Farbcodierung** - Grün für Guthaben, Rot für Schulden
- 🔒 **AES-Verschlüsselung** - Alle Daten werden verschlüsselt gespeichert
- 💾 **Server-Speicherung** - Daten persistent in SQLite-Datenbank

## 🚀 Installation

### Voraussetzungen
- Node.js (Version 16 oder höher)
- npm (kommt mit Node.js)

### Setup

1. **Dependencies installieren:**
   ```bash
   npm install
   ```

2. **Server starten:**
   ```bash
   npm start
   ```
   
   Oder für Entwicklung mit Auto-Reload:
   ```bash
   npm run dev
   ```

3. **App öffnen:**
   - Öffnen Sie Ihren Browser und gehen Sie zu: `http://localhost:3000`

## 👤 Vordefinierte Benutzer

Die folgenden Benutzer sind bereits im System angelegt:
- Ben
- Anna
- Max
- Lisa
- Tom

**Beim ersten Login** muss jeder Benutzer ein Passwort erstellen (mindestens 4 Zeichen).

## 🔧 Verwendung

### 1. Anmelden
- Wählen Sie Ihren Benutzernamen aus
- Erstellen Sie beim ersten Mal ein Passwort
- Bei weiteren Logins geben Sie Ihr Passwort ein

### 2. Personen hinzufügen
- Wechseln Sie zum Tab "Personen"
- Fügen Sie alle Teilnehmer der Gruppe hinzu

### 3. Ausgaben erfassen
- Wechseln Sie zum Tab "Ausgaben"
- Geben Sie Beschreibung und Betrag ein
- Wählen Sie aus, wer bezahlt hat
- Markieren Sie mit Checkboxen, für wen die Ausgabe ist
- Klicken Sie auf "Ausgabe hinzufügen"

### 4. Übersicht ansehen
- Wechseln Sie zum Tab "Übersicht"
- Sehen Sie den aktuellen Stand jeder Person
- Optimierte Ausgleichszahlungen werden angezeigt
- Detaillierte Bilanz zeigt wer wie viel bezahlt/schuldet

## 🔐 Sicherheit

- **Passwort-Hashing:** Bcrypt mit Salt (10 Runden)
- **AES-Verschlüsselung:** Alle Benutzerdaten werden verschlüsselt gespeichert
- **Session-Management:** Sichere Cookie-basierte Sessions
- **SQL-Injection-Schutz:** Prepared Statements

### Wichtig für Produktion:
⚠️ Ändern Sie unbedingt die Verschlüsselungsschlüssel in `server.js`:
- `ENCRYPTION_KEY` - Als Umgebungsvariable setzen
- Session Secret - Als Umgebungsvariable setzen
- `cookie.secure` auf `true` setzen (erfordert HTTPS)

## 📁 Projektstruktur

```
splitter/
├── server.js           # Express Backend-Server
├── package.json        # Node.js Dependencies
├── splitter.db         # SQLite Datenbank (wird automatisch erstellt)
├── login.html          # Login-Seite
├── index.html          # Hauptanwendung
├── styles.css          # CSS Styling
├── script.js           # Frontend JavaScript
└── README.md           # Diese Datei
```

## 🛠️ Technologie-Stack

**Backend:**
- Node.js + Express
- SQLite3 (better-sqlite3)
- Bcrypt (Passwort-Hashing)
- CryptoJS (AES-Verschlüsselung)
- Express-Session (Session-Management)

**Frontend:**
- Vanilla JavaScript
- HTML5 + CSS3
- Responsive Design

## 📝 API Endpunkte

- `GET /api/users` - Alle Benutzer abrufen
- `POST /api/check-user` - Prüfen ob Benutzer Passwort hat
- `POST /api/set-password` - Neues Passwort erstellen
- `POST /api/login` - Anmelden
- `POST /api/logout` - Abmelden
- `GET /api/session` - Session-Status prüfen
- `POST /api/save-data` - Daten speichern (verschlüsselt)
- `GET /api/load-data` - Daten laden (entschlüsselt)

## 🐛 Troubleshooting

**Server startet nicht:**
- Prüfen Sie ob Port 3000 bereits belegt ist
- Führen Sie `npm install` erneut aus

**Login funktioniert nicht:**
- Löschen Sie die Browser-Cookies
- Starten Sie den Server neu

**Daten verschwunden:**
- Die Datenbank liegt in `splitter.db`
- Jeder Benutzer hat seine eigenen isolierten Daten

## 👨‍💻 Entwicklung

Entwickelt mit ❤️ für einfaches Teilen von Gruppenausgaben.
