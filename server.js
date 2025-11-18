const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const CryptoJS = require('crypto-js');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Datenbank initialisieren
const db = new sqlite3.Database('splitter.db', (err) => {
    if (err) {
        console.error('Fehler beim Öffnen der Datenbank:', err);
    } else {
        console.log('✅ Datenbank verbunden');
    }
});

// Verschlüsselungsschlüssel (In Produktion: Umgebungsvariable verwenden!)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'IhrSuperGeheimesSchluesselwort2025!';

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));
app.use(session({
    secret: 'IhrSuperGeheimesSessionSecret2025!',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // In Produktion mit HTTPS auf true setzen
        maxAge: 24 * 60 * 60 * 1000 // 24 Stunden
    }
}));

// Datenbank-Schema erstellen
function initializeDatabase() {
    // Users Tabelle
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                role TEXT DEFAULT 'user',
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Migration: Füge sort_order Spalte hinzu falls sie nicht existiert
        db.all("PRAGMA table_info(users)", [], (err, columns) => {
            if (err) {
                console.error('Fehler beim Prüfen der Tabelle:', err);
                return;
            }
            
            const hasSortOrder = columns.some(col => col.name === 'sort_order');
            
            if (!hasSortOrder) {
                console.log('🔄 Migration: Füge sort_order Spalte hinzu...');
                db.run('ALTER TABLE users ADD COLUMN sort_order INTEGER DEFAULT 0', (err) => {
                    if (err) {
                        console.error('Fehler bei Migration:', err);
                    } else {
                        console.log('✅ sort_order Spalte hinzugefügt');
                    }
                });
            }
        });

        // Gemeinsame Daten Tabelle (verschlüsselt gespeichert) - EINE für alle User
        db.run(`
            CREATE TABLE IF NOT EXISTS shared_data (
                id INTEGER PRIMARY KEY,
                data_encrypted TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Initiale gemeinsame Daten erstellen falls nicht vorhanden
        db.get('SELECT id FROM shared_data WHERE id = 1', [], (err, row) => {
            if (!row) {
                const emptyData = encryptData({ personen: [], ausgaben: [] });
                db.run('INSERT INTO shared_data (id, data_encrypted) VALUES (1, ?)', [emptyData]);
            }
        });

        // Vordefinierte Benutzer anlegen (Ben als Admin, andere als User)
        const predefinedUsers = [
            { username: 'Ben', role: 'admin' },
            { username: 'Julius', role: 'user' },
            { username: 'Moritz', role: 'user' },
            { username: 'Patrick', role: 'user' }
        ];
        
        const insertStmt = db.prepare('INSERT OR IGNORE INTO users (username, role) VALUES (?, ?)');
        
        predefinedUsers.forEach(user => {
            insertStmt.run(user.username, user.role);
        });
        
        insertStmt.finalize();

        console.log('✅ Datenbank initialisiert');
    });
}

initializeDatabase();

// Hilfsfunktionen für Ver-/Entschlüsselung
function encryptData(data) {
    return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
}

function decryptData(encryptedData) {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (error) {
        console.error('Entschlüsselungsfehler:', error);
        return null;
    }
}

// API Endpunkte

// Alle verfügbaren Benutzer abrufen
app.get('/api/users', (req, res) => {
    db.all('SELECT id, username, role FROM users ORDER BY sort_order, id', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        res.json(rows);
    });
});

// Prüfen ob Benutzer ein Passwort hat
app.post('/api/check-user', (req, res) => {
    const { username } = req.body;
    
    db.get('SELECT id, username, password_hash, role FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        }
        
        res.json({
            userId: user.id,
            username: user.username,
            role: user.role,
            hasPassword: !!user.password_hash
        });
    });
});

// Neues Passwort setzen
app.post('/api/set-password', async (req, res) => {
    const { username, password } = req.body;
    
    if (!password || password.length < 4) {
        return res.status(400).json({ error: 'Passwort muss mindestens 4 Zeichen lang sein' });
    }
    
    try {
        db.get('SELECT id, password_hash FROM users WHERE username = ?', [username], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Datenbankfehler' });
            }
            
            if (!user) {
                return res.status(404).json({ error: 'Benutzer nicht gefunden' });
            }
            
            if (user.password_hash) {
                return res.status(400).json({ error: 'Benutzer hat bereits ein Passwort' });
            }
            
            const passwordHash = await bcrypt.hash(password, 10);
            
            db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Datenbankfehler' });
                }
                
                req.session.userId = user.id;
                req.session.username = username;
                
                res.json({ success: true, message: 'Passwort erfolgreich gesetzt' });
            });
        });
    } catch (error) {
        console.error('Fehler beim Setzen des Passworts:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        db.get('SELECT id, username, password_hash, role FROM users WHERE username = ?', [username], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Datenbankfehler' });
            }
            
            if (!user || !user.password_hash) {
                return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
            }
            
            const passwordMatch = await bcrypt.compare(password, user.password_hash);
            
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
            }
            
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.role;
            
            res.json({ 
                success: true, 
                username: user.username,
                role: user.role 
            });
        });
    } catch (error) {
        console.error('Login-Fehler:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Passwort ändern
app.post('/api/change-password', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Alle Felder erforderlich' });
    }
    
    if (newPassword.length < 4) {
        return res.status(400).json({ error: 'Neues Passwort muss mindestens 4 Zeichen lang sein' });
    }
    
    try {
        // User abrufen
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT id, password_hash FROM users WHERE id = ?', [req.session.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!user) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        }
        
        // Aktuelles Passwort prüfen
        const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
        
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
        }
        
        // Neues Passwort hashen
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Passwort aktualisieren
        await new Promise((resolve, reject) => {
            db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, user.id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        res.json({ success: true, message: 'Passwort erfolgreich geändert' });
    } catch (error) {
        console.error('Fehler beim Ändern des Passworts:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Benutzername ändern
app.post('/api/change-username', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    
    const { newUsername, password } = req.body;
    
    if (!newUsername || !password) {
        return res.status(400).json({ error: 'Alle Felder erforderlich' });
    }
    
    try {
        // Prüfe ob Benutzername bereits existiert
        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM users WHERE username = ? AND id != ?', [newUsername, req.session.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (existingUser) {
            return res.status(400).json({ error: 'Benutzername bereits vergeben' });
        }
        
        // Aktuellen User abrufen
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT id, username, password_hash FROM users WHERE id = ?', [req.session.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!user) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        }
        
        // Passwort verifizieren
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Passwort ist falsch' });
        }
        
        // Benutzername aktualisieren
        await new Promise((resolve, reject) => {
            db.run('UPDATE users SET username = ? WHERE id = ?', [newUsername, user.id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Session aktualisieren
        req.session.username = newUsername;
        
        // Session speichern und dann response senden
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        console.log('Session aktualisiert:', { userId: req.session.userId, username: req.session.username });
        
        res.json({ success: true, message: 'Benutzername erfolgreich geändert' });
    } catch (error) {
        console.error('Fehler beim Ändern des Benutzernamens:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Session prüfen
app.get('/api/session', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            loggedIn: true, 
            username: req.session.username,
            role: req.session.role || 'user'
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// Daten speichern (verschlüsselt) - GEMEINSAM für alle User
app.post('/api/save-data', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    
    try {
        const { personen, ausgaben } = req.body;
        const dataToEncrypt = { personen, ausgaben };
        const encryptedData = encryptData(dataToEncrypt);
        
        // Update die gemeinsamen Daten (ID = 1)
        db.run(
            'UPDATE shared_data SET data_encrypted = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
            [encryptedData],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Speichern fehlgeschlagen' });
                }
                res.json({ success: true });
            }
        );
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        res.status(500).json({ error: 'Speichern fehlgeschlagen' });
    }
});

// Daten laden (entschlüsselt) - GEMEINSAM für alle User
app.get('/api/load-data', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    
    try {
        db.get('SELECT data_encrypted FROM shared_data WHERE id = 1', [], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Datenbankfehler' });
            }
            
            if (!result) {
                return res.json({ personen: [], ausgaben: [] });
            }
            
            const decryptedData = decryptData(result.data_encrypted);
            
            if (!decryptedData) {
                return res.status(500).json({ error: 'Entschlüsselung fehlgeschlagen' });
            }
            
            res.json(decryptedData);
        });
    } catch (error) {
        console.error('Fehler beim Laden:', error);
        res.status(500).json({ error: 'Laden fehlgeschlagen' });
    }
});

// Admin-Endpunkte

// Alle Benutzer mit Details abrufen (nur für Admins)
app.get('/api/admin/users', (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    
    db.all('SELECT id, username, role, created_at, sort_order, password_hash IS NOT NULL as has_password FROM users ORDER BY sort_order, id', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        res.json(rows);
    });
});

// Neuen Benutzer erstellen (nur für Admins)
app.post('/api/admin/create-user', (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    
    const { username, role } = req.body;
    
    if (!username || username.trim().length === 0) {
        return res.status(400).json({ error: 'Benutzername erforderlich' });
    }
    
    if (role && role !== 'user' && role !== 'admin') {
        return res.status(400).json({ error: 'Ungültige Rolle' });
    }
    
    db.run(
        'INSERT INTO users (username, role) VALUES (?, ?)',
        [username.trim(), role || 'user'],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Benutzername existiert bereits' });
                }
                return res.status(500).json({ error: 'Datenbankfehler' });
            }
            res.json({ success: true, userId: this.lastID });
        }
    );
});

// Benutzer löschen (nur für Admins)
app.delete('/api/admin/delete-user/:userId', (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    
    const userId = parseInt(req.params.userId);
    
    // Verhindere dass Admin sich selbst löscht
    if (userId === req.session.userId) {
        return res.status(400).json({ error: 'Sie können sich nicht selbst löschen' });
    }
    
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        
        // Lösche auch die zugehörigen Daten
        db.run('DELETE FROM user_data WHERE user_id = ?', [userId], (err) => {
            if (err) {
                console.error('Fehler beim Löschen der Benutzerdaten:', err);
            }
        });
        
        res.json({ success: true });
    });
});

// Benutzerrolle ändern (nur für Admins)
app.put('/api/admin/change-role/:userId', (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    
    const userId = parseInt(req.params.userId);
    const { role } = req.body;
    
    if (!role || (role !== 'user' && role !== 'admin')) {
        return res.status(400).json({ error: 'Ungültige Rolle' });
    }
    
    // Verhindere dass der letzte Admin seine Rechte verliert
    if (userId === req.session.userId && role === 'user') {
        db.get('SELECT COUNT(*) as count FROM users WHERE role = "admin"', [], (err, result) => {
            if (err || result.count <= 1) {
                return res.status(400).json({ error: 'Es muss mindestens ein Admin existieren' });
            }
            
            updateRole();
        });
    } else {
        updateRole();
    }
    
    function updateRole() {
        db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Datenbankfehler' });
            }
            
            // Update Session falls eigene Rolle geändert wurde
            if (userId === req.session.userId) {
                req.session.role = role;
            }
            
            res.json({ success: true });
        });
    }
});

// Passwort zurücksetzen (nur für Admins)
app.post('/api/admin/reset-password/:userId', (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    
    const userId = parseInt(req.params.userId);
    
    db.run('UPDATE users SET password_hash = NULL WHERE id = ?', [userId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Datenbankfehler' });
        }
        
        res.json({ success: true, message: 'Passwort wurde zurückgesetzt' });
    });
});

// Benutzername ändern (nur für Admins)
app.put('/api/admin/change-username/:userId', async (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    
    const userId = parseInt(req.params.userId);
    const { newUsername } = req.body;
    
    if (!newUsername || !newUsername.trim()) {
        return res.status(400).json({ error: 'Benutzername erforderlich' });
    }
    
    try {
        // Prüfe ob Benutzername bereits existiert
        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM users WHERE username = ? AND id != ?', [newUsername, userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (existingUser) {
            return res.status(400).json({ error: 'Benutzername bereits vergeben' });
        }
        
        // Username aktualisieren
        await new Promise((resolve, reject) => {
            db.run('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Wenn eigener Username geändert wurde, Session aktualisieren
        if (userId === req.session.userId) {
            req.session.username = newUsername;
            await new Promise((resolve, reject) => {
                req.session.save((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
        
        res.json({ success: true, message: 'Benutzername erfolgreich geändert' });
    } catch (error) {
        console.error('Fehler beim Ändern des Benutzernamens:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Benutzerreihenfolge speichern (nur für Admins)
app.post('/api/admin/reorder-users', async (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds)) {
        return res.status(400).json({ error: 'Ungültige Daten' });
    }
    
    try {
        // Speichere die Reihenfolge in der Datenbank
        for (let i = 0; i < userIds.length; i++) {
            await new Promise((resolve, reject) => {
                db.run('UPDATE users SET sort_order = ? WHERE id = ?', [i, userIds[i]], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Fehler beim Speichern der Reihenfolge:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Hauptseite
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

// Server starten
app.listen(PORT, () => {
    console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
    console.log(`📊 Datenbank: splitter.db`);
    console.log(`🔐 Verschlüsselung: AES aktiviert`);
});
