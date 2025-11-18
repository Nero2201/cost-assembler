// Datenstruktur
let personen = [];
let ausgaben = [];
let currentUser = null;
let currentUserRole = null;
let allSystemUsers = []; // Alle Login-User

// Icon-Mapping für Ausgaben basierend auf Schlüsselwörtern
function getIconForBeschreibung(beschreibung) {
    const text = beschreibung.toLowerCase();
    
    // Hotel & Unterkunft
    if (text.match(/hotel|unterkunft|übernachtung|hostel|airbnb|motel|pension/)) {
        return 'hotel';
    }
    
    // Essen & Trinken
    if (text.match(/pizza|burger|restaurant|essen|frühstück|mittagessen|abendessen|lunch|dinner|café|coffee|kaffee|bäcker|bäckerei|mcdonald|burger king|subway|döner|kebab|sushi|pasta|curry|snack|imbiss/)) {
        return 'restaurant';
    }
    
    if (text.match(/hotdog|hot dog|wurst|bratwurst/)) {
        return 'lunch_dining';
    }
    
    if (text.match(/bar|bier|wein|cocktail|drink|getränk|pub|club|disco/)) {
        return 'local_bar';
    }
    
    if (text.match(/supermarkt|einkauf|grocery|lebensmittel|laden|markt|shopping/)) {
        return 'shopping_cart';
    }
    
    // Transport
    if (text.match(/ticket|bahn|zug|train|bus|ubahn|u-bahn|straßenbahn|tram|öpnv|nahverkehr/)) {
        return 'confirmation_number';
    }
    
    if (text.match(/flug|flight|flugzeug|airport|flugtick/)) {
        return 'flight';
    }
    
    if (text.match(/taxi|uber|fahrt|transport/)) {
        return 'local_taxi';
    }
    
    if (text.match(/tanken|benzin|diesel|sprit|tankstelle/)) {
        return 'local_gas_station';
    }
    
    if (text.match(/parken|parkplatz|parking|parkhaus/)) {
        return 'local_parking';
    }
    
    // Aktivitäten & Entertainment
    if (text.match(/kino|film|movie|cinema/)) {
        return 'movie';
    }
    
    if (text.match(/museum|ausstellung|galerie|kunst/)) {
        return 'museum';
    }
    
    if (text.match(/theater|oper|konzert|show|musical/)) {
        return 'theater_comedy';
    }
    
    if (text.match(/eintritt|eintrittskarte|admission|entry/)) {
        return 'confirmation_number';
    }
    
    if (text.match(/sport|fitness|gym|schwimmbad|pool|wellness|spa/)) {
        return 'fitness_center';
    }
    
    if (text.match(/strand|beach|meer|see/)) {
        return 'beach_access';
    }
    
    // Sonstiges
    if (text.match(/apotheke|medikament|arzt|kranken|gesundheit/)) {
        return 'local_pharmacy';
    }
    
    if (text.match(/geschenk|souvenir|andenken/)) {
        return 'card_giftcard';
    }
    
    if (text.match(/foto|camera|kamera/)) {
        return 'photo_camera';
    }
    
    // Default Icon
    return 'receipt';
}

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle .material-icons');
    if (icon) {
        icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    }
}

// Custom Modal Funktionen
let confirmCallback = null;

function showModal(title, message, buttons = null) {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalFooter = document.getElementById('modalFooter');
    const modalForm = document.getElementById('modalForm');
    
    modalTitle.innerHTML = title;
    
    // Zeige oder verstecke die Message je nachdem ob sie leer ist
    if (message) {
        modalMessage.textContent = message;
        modalMessage.style.display = 'block';
    } else {
        modalMessage.textContent = '';
        modalMessage.style.display = 'none';
    }
    
    modalForm.innerHTML = '';
    
    if (buttons) {
        modalFooter.innerHTML = buttons;
    } else {
        modalFooter.innerHTML = '<button onclick="closeModal()">OK</button>';
    }
    
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('customModal');
    modal.classList.remove('active');
    confirmCallback = null;
}

function showConfirm(title, message, onConfirm) {
    confirmCallback = onConfirm;
    const buttons = `
        <button class="btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button class="btn-danger" onclick="executeConfirm()">Bestätigen</button>
    `;
    showModal(title, message, buttons);
}

function executeConfirm() {
    if (confirmCallback) {
        confirmCallback();
    }
    closeModal();
}

function showSuccess(message) {
    showModal('<span class="material-icons" style="vertical-align: middle; color: #28a745;">check_circle</span> Erfolg', message);
}

function showError(message) {
    showModal('<span class="material-icons" style="vertical-align: middle; color: #dc3545;">error</span> Fehler', message);
}

function showInfo(message) {
    showModal('ℹ️ Hinweis', message);
}

// Server-basierte Daten-Funktionen (ersetzt localStorage)
async function saveDaten() {
    try {
        const response = await fetch('/api/save-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personen, ausgaben })
        });
        
        if (!response.ok) {
            console.error('Fehler beim Speichern der Daten');
        }
    } catch (error) {
        console.error('Speicherfehler:', error);
    }
}

async function loadDaten() {
    try {
        const response = await fetch('/api/load-data');
        
        if (response.ok) {
            const data = await response.json();
            personen = data.personen || [];
            // Stelle sicher, dass bezahltVon immer als Integer behandelt wird
            ausgaben = (data.ausgaben || []).map(a => ({
                ...a,
                bezahltVon: typeof a.bezahltVon === 'string' ? parseInt(a.bezahltVon) : a.bezahltVon,
                ausgabeFuer: a.ausgabeFuer.map(id => typeof id === 'string' ? parseInt(id) : id)
            }));
        } else if (response.status === 401) {
            // Nicht angemelgt - zur Login-Seite
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Ladefehler:', error);
    }
}

// Session prüfen und Benutzer anzeigen
async function checkSession() {
    try {
        const response = await fetch('/api/session');
        const data = await response.json();
        
        if (!data.loggedIn) {
            window.location.href = '/login.html';
            return false;
        }
        
        currentUser = data.username;
        currentUserRole = data.role;
        
        // Zeige Admin-Tab nur für Admins
        if (currentUserRole === 'admin') {
            document.getElementById('adminTabBtn').style.display = 'block';
        }
        
        document.getElementById('currentUser').innerHTML = `<span class="material-icons" style="vertical-align: middle; font-size: 20px;">person</span> ${currentUser}${currentUserRole === 'admin' ? ' (Admin)' : ''}`;
        
        return true;
    } catch (error) {
        console.error('Session-Fehler:', error);
        return false;
    }
}

// Alle System-User laden
async function loadAllSystemUsers() {
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            allSystemUsers = await response.json();
            await syncSystemUsersToPersonen();
        }
    } catch (error) {
        console.error('Fehler beim Laden der System-User:', error);
    }
}

// System-User automatisch als Personen hinzufügen
async function syncSystemUsersToPersonen() {
    let changed = false;
    
    // Erstelle eine Map der aktuellen Personen nach Name (lowercase)
    const existingPersonsMap = new Map();
    personen.forEach(p => {
        existingPersonsMap.set(p.name.toLowerCase(), p);
    });
    
    // Füge alle System-User hinzu, die noch nicht existieren
    allSystemUsers.forEach(user => {
        const existingPerson = existingPersonsMap.get(user.username.toLowerCase());
        
        if (!existingPerson) {
            // User existiert noch nicht - hinzufügen
            personen.push({
                id: Date.now() + Math.floor(Math.random() * 10000),
                name: user.username,
                isSystemUser: true
            });
            changed = true;
        } else if (!existingPerson.isSystemUser) {
            // Person existiert, ist aber nicht als System-User markiert
            existingPerson.isSystemUser = true;
            changed = true;
        }
    });
    
    // Entferne System-User die nicht mehr existieren
    const systemUsernames = allSystemUsers.map(u => u.username.toLowerCase());
    const filteredPersonen = personen.filter(p => {
        if (p.isSystemUser) {
            const exists = systemUsernames.includes(p.name.toLowerCase());
            if (!exists) changed = true;
            return exists;
        }
        return true;
    });
    
    if (filteredPersonen.length !== personen.length) {
        personen = filteredPersonen;
        changed = true;
    }
    
    if (changed) {
        await saveDaten();
        updateUI();
    }
}

// Profil bearbeiten
function openProfileModal() {
    const buttons = `
        <button class="btn-secondary" onclick="closeModal()">Schließen</button>
    `;
    
    showModal('<span class="material-icons" style="vertical-align: middle;">account_circle</span> Mein Profil', '', buttons);
    
    const modalForm = document.getElementById('modalForm');
    modalForm.innerHTML = `
        <div class="profile-tabs">
            <button class="profile-tab-btn active" onclick="switchProfileTab('name')" id="nameTab">
                <span class="material-icons" style="vertical-align: middle; font-size: 18px;">edit</span> Name ändern
            </button>
            <button class="profile-tab-btn" onclick="switchProfileTab('password')" id="passwordTab">
                <span class="material-icons" style="vertical-align: middle; font-size: 18px;">lock</span> Passwort ändern
            </button>
        </div>
        
        <div id="nameTabContent" class="profile-tab-content">
            <div style="margin-bottom: 15px;">
                <label class="profile-label">Neuer Benutzername:</label>
                <input type="text" id="profileNewUsername" placeholder="Neuer Benutzername" class="profile-input">
                <small class="profile-hint">
                    <span class="material-icons" style="vertical-align: middle; font-size: 14px;">info</span>
                    Aktuell: <strong id="currentNameDisplay"></strong>
                </small>
            </div>
            <div style="margin-bottom: 15px;">
                <label class="profile-label">Passwort zur Bestätigung:</label>
                <input type="password" id="confirmPasswordForName" placeholder="Ihr Passwort" class="profile-input">
            </div>
            <button onclick="changeName()" class="btn-primary" style="width: 100%;">
                <span class="material-icons" style="vertical-align: middle;">edit</span> Name ändern
            </button>
        </div>
        
        <div id="passwordTabContent" class="profile-tab-content" style="display: none;">
            <div style="margin-bottom: 15px;">
                <label class="profile-label">Aktuelles Passwort:</label>
                <input type="password" id="currentPassword" placeholder="Ihr aktuelles Passwort" class="profile-input">
            </div>
            <div style="margin-bottom: 15px;">
                <label class="profile-label">Neues Passwort:</label>
                <input type="password" id="newPassword" placeholder="Mindestens 4 Zeichen" class="profile-input">
            </div>
            <div style="margin-bottom: 15px;">
                <label class="profile-label">Passwort bestätigen:</label>
                <input type="password" id="confirmNewPassword" placeholder="Neues Passwort wiederholen" class="profile-input">
            </div>
            <button onclick="changePassword()" class="btn-primary" style="width: 100%;">
                <span class="material-icons" style="vertical-align: middle;">lock</span> Passwort ändern
            </button>
        </div>
    `;
    
    // Zeige den aktuellen Benutzernamen als Info
    setTimeout(() => {
        const currentNameDisplay = document.getElementById('currentNameDisplay');
        if (currentNameDisplay && currentUser) {
            currentNameDisplay.textContent = currentUser;
            console.log('Aktueller Username angezeigt:', currentUser);
        }
    }, 10);
}

function switchProfileTab(tab) {
    const passwordTab = document.getElementById('passwordTab');
    const nameTab = document.getElementById('nameTab');
    const passwordContent = document.getElementById('passwordTabContent');
    const nameContent = document.getElementById('nameTabContent');
    
    if (tab === 'password') {
        passwordTab.classList.add('active');
        nameTab.classList.remove('active');
        passwordContent.style.display = 'block';
        nameContent.style.display = 'none';
    } else {
        nameTab.classList.add('active');
        passwordTab.classList.remove('active');
        nameContent.style.display = 'block';
        passwordContent.style.display = 'none';
    }
}

async function changeName() {
    const newUsername = document.getElementById('profileNewUsername').value.trim();
    const password = document.getElementById('confirmPasswordForName').value.trim();
    
    if (!newUsername) {
        showError('Bitte einen Benutzernamen eingeben!');
        return;
    }
    
    if (newUsername === currentUser) {
        showError('Der neue Name ist identisch mit dem aktuellen Namen!');
        return;
    }
    
    if (!password) {
        showError('Bitte Passwort zur Bestätigung eingeben!');
        return;
    }
    
    try {
        const response = await fetch('/api/change-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                newUsername, 
                password 
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Update den globalen currentUser
            currentUser = newUsername;
            
            closeModal();
            
            // Update die UI
            await checkSession();
            await loadAllSystemUsers();
            
            showSuccess('Benutzername erfolgreich geändert!');
        } else {
            showError(data.error || 'Fehler beim Ändern des Benutzernamens');
        }
    } catch (error) {
        console.error('Fehler:', error);
        showError('Serverfehler');
    }
}

async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmNewPassword').value.trim();
    
    if (!currentPassword) {
        showError('Bitte aktuelles Passwort eingeben!');
        return;
    }
    
    if (!newPassword || newPassword.length < 4) {
        showError('Neues Passwort muss mindestens 4 Zeichen lang sein!');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showError('Die neuen Passwörter stimmen nicht überein!');
        return;
    }
    
    try {
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                currentPassword, 
                newPassword 
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal();
            showSuccess('Passwort erfolgreich geändert!');
        } else {
            showError(data.error || 'Fehler beim Ändern des Passworts');
        }
    } catch (error) {
        console.error('Fehler:', error);
        showError('Serverfehler');
    }
}

// Logout
async function logout() {
    showConfirm(
        '<span class="material-icons" style="vertical-align: middle;">logout</span> Abmelden',
        'Möchten Sie sich wirklich abmelden?',
        async function() {
            try {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/login.html';
            } catch (error) {
                console.error('Logout-Fehler:', error);
                showError('Fehler beim Abmelden');
            }
        }
    );
}

// Tab Navigation
document.addEventListener('DOMContentLoaded', async function() {
    // Theme initialisieren
    initTheme();
    
    // Prüfe Session zuerst
    const loggedIn = await checkSession();
    if (!loggedIn) return;
    
    // Lade Daten vom Server und System-User
    await loadDaten();
    await loadAllSystemUsers(); // Stelle sicher, dass System-User geladen sind
    updateUI();
    
    // Setup Euro-Formatierung
    setupBetragFormatierung();
    
    // Starte auf dem Ausgaben-Tab
    switchTab('ausgaben');
    
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
});

// Euro-Formatierung für Betrags-Eingabe
function setupBetragFormatierung() {
    const betragInput = document.getElementById('ausgabeBetrag');
    if (!betragInput) return;
    
    let isFormatted = false;
    
    // Beim Fokus: Entferne Formatierung
    betragInput.addEventListener('focus', function() {
        if (isFormatted) {
            // Entferne " €" und ersetze Komma durch Punkt für Bearbeitung
            this.value = this.value.replace(' €', '').replace(',', '.');
            isFormatted = false;
        }
    });
    
    // Beim Verlassen: Formatiere als Euro
    betragInput.addEventListener('blur', function() {
        let value = this.value.trim();
        if (value === '') return;
        
        // Ersetze Komma durch Punkt
        value = value.replace(',', '.');
        
        // Parse zu Zahl
        const num = parseFloat(value);
        
        if (!isNaN(num) && num >= 0) {
            // Formatiere mit 2 Nachkommastellen und Komma
            this.value = num.toFixed(2).replace('.', ',') + ' €';
            isFormatted = true;
        }
    });
}

function switchTab(tabName) {
    // Alle Tabs und Buttons zurücksetzen
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Gewählten Tab aktivieren
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // UI aktualisieren wenn Übersicht geöffnet wird
    if (tabName === 'uebersicht') {
        updateUebersicht();
    }
    
    // Admin-Panel laden wenn Admin-Tab geöffnet wird
    if (tabName === 'admin' && currentUserRole === 'admin') {
        loadAdminPanel();
    }
}

// Personen Verwaltung - Nicht mehr nötig, da alle User automatisch synchronisiert werden
// Personen werden nur noch aus der System-User-Liste geladen

// Ausgaben Verwaltung
function updateAusgabenForm() {
    const bezahltVonSelect = document.getElementById('bezahltVon');
    const checkboxContainer = document.getElementById('ausgabeFuerCheckboxes');
    
    // Finde die ID des aktuell eingeloggten Users
    const currentPerson = personen.find(p => p.name === currentUser);
    
    // Dropdown für "Bezahlt von" - aktueller User vorausgewählt
    bezahltVonSelect.innerHTML = '<option value="">Bitte Person auswählen</option>' +
        personen.map(p => {
            const selected = currentPerson && p.id === currentPerson.id ? 'selected' : '';
            return `<option value="${p.id}" ${selected}>${p.name}</option>`;
        }).join('');
    
    // Checkboxen für "Ausgabe für"
    if (personen.length === 0) {
        checkboxContainer.innerHTML = '<div class="empty-state"><p>Bitte zuerst Personen hinzufügen</p></div>';
    } else {
        checkboxContainer.innerHTML = personen.map(p => `
            <div class="checkbox-item">
                <input type="checkbox" id="person_${p.id}" value="${p.id}" checked>
                <label for="person_${p.id}">${p.name}</label>
            </div>
        `).join('');
    }
}

function addAusgabe() {
    const beschreibung = document.getElementById('ausgabeBeschreibung').value.trim();
    const betragRaw = document.getElementById('ausgabeBetrag').value.trim();
    
    // Parse Betrag: Entferne " €" und ersetze Komma durch Punkt
    const betragCleaned = betragRaw.replace(' €', '').replace(',', '.');
    const betrag = parseFloat(betragCleaned);
    
    const bezahltVon = document.getElementById('bezahltVon').value;
    
    if (!beschreibung) {
        showError('Bitte eine Beschreibung eingeben!');
        return;
    }
    
    if (!betrag || betrag <= 0) {
        showError('Bitte einen gültigen Betrag eingeben!');
        return;
    }
    
    if (!bezahltVon) {
        showError('Bitte auswählen, wer bezahlt hat!');
        return;
    }
    
    // Ausgewählte Personen sammeln
    const ausgabeFuer = [];
    personen.forEach(p => {
        const checkbox = document.getElementById(`person_${p.id}`);
        if (checkbox && checkbox.checked) {
            ausgabeFuer.push(p.id);
        }
    });
    
    if (ausgabeFuer.length === 0) {
        showError('Bitte mindestens eine Person auswählen, für die die Ausgabe ist!');
        return;
    }
    
    const neueAusgabe = {
        id: Date.now(),
        beschreibung: beschreibung,
        betrag: betrag,
        bezahltVon: parseInt(bezahltVon),
        ausgabeFuer: ausgabeFuer,
        datum: new Date().toISOString(),
        icon: getIconForBeschreibung(beschreibung)
    };
    
    ausgaben.push(neueAusgabe);
    
    // Formular zurücksetzen aber Checkboxen bleiben aktiviert und bezahltVon bleibt auf aktuellem User
    document.getElementById('ausgabeBeschreibung').value = '';
    document.getElementById('ausgabeBetrag').value = '';
    // bezahltVon bleibt auf dem aktuellen User
    // Checkboxen werden durch updateUI() neu gerendert und sind wieder alle aktiviert
    
    saveDaten();
    updateUI();
    showSuccess('Ausgabe erfolgreich hinzugefügt!');
}

function removeAusgabe(id) {
    showConfirm(
        'Ausgabe löschen',
        'Möchten Sie diese Ausgabe wirklich entfernen?',
        function() {
            ausgaben = ausgaben.filter(a => a.id !== id);
            saveDaten();
            updateUI();
            showSuccess('Ausgabe erfolgreich gelöscht!');
        }
    );
}

function renderAusgaben() {
    const liste = document.getElementById('ausgabenListe');
    
    if (ausgaben.length === 0) {
        liste.innerHTML = '<div class="empty-state"><p>Noch keine Ausgaben hinzugefügt</p><p><span class="material-icons" style="font-size: 48px; color: #6c757d;">receipt_long</span></p></div>';
        updateStats();
        return;
    }
    
    // Sortiere nach Datum (neueste zuerst)
    const sortedAusgaben = [...ausgaben].sort((a, b) => 
        new Date(b.datum) - new Date(a.datum)
    );
    
    liste.innerHTML = sortedAusgaben.map(ausgabe => {
        const bezahler = personen.find(p => p.id === ausgabe.bezahltVon);
        const fuerPersonen = ausgabe.ausgabeFuer
            .map(id => personen.find(p => p.id === id)?.name)
            .filter(Boolean)
            .join(', ');
        const betragProPerson = ausgabe.betrag / ausgabe.ausgabeFuer.length;
        
        const isAdmin = currentUserRole === 'admin';
        
        // Falls kein Icon gespeichert ist (alte Ausgaben), eins generieren
        const icon = ausgabe.icon || getIconForBeschreibung(ausgabe.beschreibung);
        
        return `
            <div class="ausgabe-item">
                <div class="beschreibung">
                    <span class="material-icons" style="vertical-align: middle; font-size: 20px; margin-right: 8px;">${icon}</span>${ausgabe.beschreibung}
                </div>
                <div class="betrag">${ausgabe.betrag.toFixed(2)} €</div>
                <div class="details">
                    <div><span class="material-icons" style="vertical-align: middle; font-size: 18px;">credit_card</span> Bezahlt von: <strong>${bezahler?.name || 'Unbekannt'}</strong></div>
                    <div><span class="material-icons" style="vertical-align: middle; font-size: 18px;">group</span> Für: ${fuerPersonen}</div>
                    <div><span class="material-icons" style="vertical-align: middle; font-size: 18px;">pie_chart</span> Pro Person: ${betragProPerson.toFixed(2)} €</div>
                    <div><span class="material-icons" style="vertical-align: middle; font-size: 18px;">calendar_today</span> ${new Date(ausgabe.datum).toLocaleDateString('de-DE')}</div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    ${isAdmin ? `
                        <button onclick="editAusgabe(${ausgabe.id})" style="background: #ffc107; color: #000;">
                            <span class="material-icons" style="vertical-align: middle; font-size: 18px;">edit</span> Bearbeiten
                        </button>
                        <button onclick="removeAusgabe(${ausgabe.id})" style="background: #dc3545;">
                            <span class="material-icons" style="vertical-align: middle; font-size: 18px;">delete</span> Löschen
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    updateStats();
}

// Ausgabe bearbeiten (nur für Admins)
function editAusgabe(id) {
    const ausgabe = ausgaben.find(a => a.id === id);
    if (!ausgabe) return;
    
    const bezahler = personen.find(p => p.id === ausgabe.bezahltVon);
    const fuerPersonenList = ausgabe.ausgabeFuer
        .map(id => personen.find(p => p.id === id)?.name)
        .filter(Boolean)
        .join(', ');
    
    // Zuerst das Modal öffnen
    const buttons = `
        <button class="btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button class="btn-success" onclick="saveEditedAusgabe(${id})">Speichern</button>
    `;
    
    showModal('<span class="material-icons" style="vertical-align: middle;">edit</span> Ausgabe bearbeiten', '', buttons);
    
    // Dann das Formular befüllen
    const modalForm = document.getElementById('modalForm');
    modalForm.innerHTML = `
        <div style="margin-bottom: 15px;">
            <label class="profile-label">Beschreibung:</label>
            <input type="text" id="editBeschreibung" value="${ausgabe.beschreibung}" 
                class="profile-input">
        </div>
        <div style="margin-bottom: 15px;">
            <label class="profile-label">Betrag (€):</label>
            <input type="text" id="editBetrag" value="${ausgabe.betrag.toFixed(2).replace('.', ',')}" 
                class="profile-input">
        </div>
        <div style="margin-bottom: 15px;">
            <label class="profile-label">Bezahlt von:</label>
            <select id="editBezahltVon" class="profile-input">
                ${personen.map(p => `<option value="${p.id}" ${p.id === ausgabe.bezahltVon ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
        </div>
        <div style="margin-bottom: 15px;">
            <label class="profile-label">Ausgabe für:</label>
            ${personen.map(p => `
                <div style="margin-bottom: 8px;">
                    <input type="checkbox" id="editPerson_${p.id}" value="${p.id}" 
                        ${ausgabe.ausgabeFuer.includes(p.id) ? 'checked' : ''}
                        style="margin-right: 8px;">
                    <label for="editPerson_${p.id}">${p.name}</label>
                </div>
            `).join('')}
        </div>
    `;
    
    // Setup Formatierung für Betrags-Feld im Edit-Modal
    setTimeout(() => {
        const editBetragInput = document.getElementById('editBetrag');
        if (editBetragInput) {
            let isFormatted = false;
            
            editBetragInput.addEventListener('focus', function() {
                // Entferne Formatierung beim Fokus
                this.value = this.value.replace(' €', '').replace(',', '.');
                isFormatted = false;
            });
            
            editBetragInput.addEventListener('blur', function() {
                let value = this.value.trim();
                if (value === '') return;
                
                value = value.replace(',', '.');
                const num = parseFloat(value);
                
                if (!isNaN(num) && num >= 0) {
                    this.value = num.toFixed(2).replace('.', ',') + ' €';
                    isFormatted = true;
                }
            });
        }
    }, 100);
}

function saveEditedAusgabe(id) {
    const ausgabe = ausgaben.find(a => a.id === id);
    if (!ausgabe) return;
    
    const beschreibung = document.getElementById('editBeschreibung').value.trim();
    const betragRaw = document.getElementById('editBetrag').value.trim();
    const betrag = parseFloat(betragRaw.replace(' €', '').replace(',', '.'));
    const bezahltVon = document.getElementById('editBezahltVon').value;
    
    if (!beschreibung) {
        showError('Bitte eine Beschreibung eingeben!');
        return;
    }
    
    if (!betrag || betrag <= 0) {
        showError('Bitte einen gültigen Betrag eingeben!');
        return;
    }
    
    if (!bezahltVon) {
        showError('Bitte auswählen, wer bezahlt hat!');
        return;
    }
    
    const ausgabeFuer = [];
    personen.forEach(p => {
        const checkbox = document.getElementById(`editPerson_${p.id}`);
        if (checkbox && checkbox.checked) {
            ausgabeFuer.push(p.id);
        }
    });
    
    if (ausgabeFuer.length === 0) {
        showError('Bitte mindestens eine Person auswählen!');
        return;
    }
    
    ausgabe.beschreibung = beschreibung;
    ausgabe.betrag = betrag;
    ausgabe.bezahltVon = parseInt(bezahltVon);
    ausgabe.ausgabeFuer = ausgabeFuer;
    ausgabe.icon = getIconForBeschreibung(beschreibung);
    
    saveDaten();
    updateUI();
    closeModal();
    showSuccess('Ausgabe erfolgreich aktualisiert!');
}

// Statistiken aktualisieren
function updateStats() {
    // Gesamtausgaben berechnen
    const totalSpent = ausgaben.reduce((sum, a) => sum + a.betrag, 0);
    
    // Pro Person berechnen (basierend auf allen Personen)
    const personCount = personen.length || 1;
    const perPerson = totalSpent / personCount;
    
    // Anzahl Ausgaben
    const totalCount = ausgaben.length;
    
    // Update UI
    document.getElementById('totalSpent').textContent = totalSpent.toFixed(2) + ' €';
    document.getElementById('perPerson').textContent = perPerson.toFixed(2) + ' €';
    document.getElementById('totalCount').textContent = totalCount;
}

// Berechnungen
function berechneStand() {
    const stand = {};
    
    // Initialisiere alle Personen mit 0
    personen.forEach(p => {
        stand[p.id] = {
            name: p.name,
            bezahlt: 0,      // Was die Person insgesamt bezahlt hat
            schuldet: 0,     // Was die Person schuldet
            bilanz: 0        // Differenz (positiv = bekommt Geld, negativ = schuldet Geld)
        };
    });
    
    // Berechne für jede Ausgabe
    ausgaben.forEach(ausgabe => {
        const betragProPerson = ausgabe.betrag / ausgabe.ausgabeFuer.length;
        
        // Die Person, die bezahlt hat, bekommt den Gesamtbetrag gutgeschrieben
        if (stand[ausgabe.bezahltVon]) {
            stand[ausgabe.bezahltVon].bezahlt += ausgabe.betrag;
        }
        
        // Jede Person, für die die Ausgabe war, schuldet ihren Anteil
        ausgabe.ausgabeFuer.forEach(personId => {
            if (stand[personId]) {
                stand[personId].schuldet += betragProPerson;
            }
        });
    });
    
    // Berechne Bilanz (bezahlt - schuldet)
    Object.keys(stand).forEach(id => {
        stand[id].bilanz = stand[id].bezahlt - stand[id].schuldet;
    });
    
    return stand;
}

function berechneAusgleichszahlungen() {
    const stand = berechneStand();
    const zahlungen = [];
    
    // Erstelle Arrays für Gläubiger und Schuldner
    const glaeubiger = [];
    const schuldner = [];
    
    Object.values(stand).forEach(person => {
        if (person.bilanz > 0.01) {
            glaeubiger.push({...person});
        } else if (person.bilanz < -0.01) {
            schuldner.push({...person});
        }
    });
    
    // Berechne optimierte Ausgleichszahlungen
    while (glaeubiger.length > 0 && schuldner.length > 0) {
        const glaeub = glaeubiger[0];
        const schuld = schuldner[0];
        
        const betrag = Math.min(glaeub.bilanz, -schuld.bilanz);
        
        zahlungen.push({
            von: schuld.name,
            an: glaeub.name,
            betrag: betrag
        });
        
        glaeub.bilanz -= betrag;
        schuld.bilanz += betrag;
        
        if (glaeub.bilanz < 0.01) glaeubiger.shift();
        if (schuld.bilanz > -0.01) schuldner.shift();
    }
    
    return zahlungen;
}

// Übersicht rendern
function updateUebersicht() {
    const stand = berechneStand();
    const zahlungen = berechneAusgleichszahlungen();
    
    // Gesamtübersicht
    const gesamtuebersicht = document.getElementById('gesamtuebersicht');
    if (Object.keys(stand).length === 0) {
        gesamtuebersicht.innerHTML = '<div class="empty-state"><p>Noch keine Daten vorhanden</p></div>';
    } else {
        gesamtuebersicht.innerHTML = Object.values(stand)
            .sort((a, b) => b.bilanz - a.bilanz)
            .map(person => {
                let klasse = 'neutral';
                let prefix = '';
                if (person.bilanz > 0.01) {
                    klasse = 'positiv';
                    prefix = '+';
                } else if (person.bilanz < -0.01) {
                    klasse = 'negativ';
                }
                
                return `
                    <div class="bilanz-item ${klasse}">
                        <span class="name"><span class="material-icons" style="vertical-align: middle; font-size: 20px;">person</span> ${person.name}</span>
                        <span class="betrag">${prefix}${person.bilanz.toFixed(2)} €</span>
                    </div>
                `;
            }).join('');
    }
    
    // Ausgleichszahlungen
    const ausgleichszahlungenDiv = document.getElementById('ausgleichszahlungen');
    if (zahlungen.length === 0) {
        ausgleichszahlungenDiv.innerHTML = '<div class="empty-state"><p>Alle Ausgaben sind ausgeglichen! <span class="material-icons" style="vertical-align: middle; color: #28a745;">check_circle</span></p></div>';
    } else {
        ausgleichszahlungenDiv.innerHTML = zahlungen.map(zahlung => `
            <div class="zahlung-item">
                <strong>${zahlung.von}</strong> zahlt 
                <span class="betrag">${zahlung.betrag.toFixed(2)} €</span> 
                an <strong>${zahlung.an}</strong>
            </div>
        `).join('');
    }
    
    // Detail Bilanz
    const detailBilanz = document.getElementById('detailBilanz');
    if (Object.keys(stand).length === 0) {
        detailBilanz.innerHTML = '<div class="empty-state"><p>Noch keine Daten vorhanden</p></div>';
    } else {
        detailBilanz.innerHTML = Object.values(stand).map(person => `
            <div class="person-bilanz">
                <h3><span class="material-icons" style="vertical-align: middle;">person</span> ${person.name}</h3>
                <div class="stat">
                    <span>Bezahlt:</span>
                    <span>${person.bezahlt.toFixed(2)} €</span>
                </div>
                <div class="stat">
                    <span>Schuldet:</span>
                    <span>${person.schuldet.toFixed(2)} €</span>
                </div>
                <div class="stat">
                    <span>Stand:</span>
                    <span style="color: ${person.bilanz >= 0 ? '#28a745' : '#dc3545'}">
                        ${person.bilanz >= 0 ? '+' : ''}${person.bilanz.toFixed(2)} €
                    </span>
                </div>
            </div>
        `).join('');
    }
}

// Haupt-UI Update Funktion
function updateUI() {
    updateAusgabenForm();
    renderAusgaben();
}

// Enter-Taste Support
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('ausgabeBetrag').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addAusgabe();
        }
    });
});

// Admin-Panel Funktionen
async function loadAdminPanel() {
    if (currentUserRole !== 'admin') return;
    
    try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) {
            showError('Fehler beim Laden der Benutzerliste');
            return;
        }
        
        const users = await response.json();
        renderAdminUsersList(users);
    } catch (error) {
        console.error('Fehler beim Laden des Admin-Panels:', error);
    }
}

function renderAdminUsersList(users) {
    const liste = document.getElementById('adminUsersList');
    
    liste.innerHTML = users.map((user, index) => `
        <div class="admin-user-item" draggable="true" data-user-id="${user.id}" data-index="${index}">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                <span class="material-icons drag-handle" style="cursor: move; color: #6c757d;">drag_indicator</span>
                <div class="admin-user-info" style="flex: 1;">
                    <div class="username">
                        <span class="material-icons" style="vertical-align: middle;">person</span> 
                        <span id="username-${user.id}">${user.username}</span>
                        <button class="btn-icon" onclick="editUsername(${user.id}, '${user.username}')" title="Namen bearbeiten">
                            <span class="material-icons">edit</span>
                        </button>
                    </div>
                    <div class="user-meta">
                        <span class="role-badge ${user.role}">${user.role === 'admin' ? 'Admin' : 'User'}</span>
                        ${user.has_password ? '<span class="material-icons" style="vertical-align: middle; font-size: 16px; color: #28a745;">lock</span> Passwort gesetzt' : '<span class="material-icons" style="vertical-align: middle; font-size: 16px; color: #ffc107;">warning</span> Kein Passwort'}
                    </div>
                </div>
            </div>
            <div class="admin-user-actions">
                <select onchange="changeUserRole(${user.id}, this.value)" ${user.username === currentUser ? 'disabled' : ''}>
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
                ${user.has_password ? `
                    <button class="btn-warning" onclick="resetUserPassword(${user.id}, '${user.username}')" title="Passwort zurücksetzen">
                        <span class="material-icons" style="vertical-align: middle; font-size: 18px;">lock_reset</span>
                    </button>
                ` : ''}
                <button class="btn-danger" onclick="deleteUser(${user.id}, '${user.username}')" 
                    ${user.username === currentUser ? 'disabled' : ''}>
                    <span class="material-icons" style="vertical-align: middle; font-size: 18px;">delete</span>
                </button>
            </div>
        </div>
    `).join('');
    
    // Drag & Drop Events hinzufügen
    setupDragAndDrop();
}

// Drag & Drop Setup
function setupDragAndDrop() {
    const items = document.querySelectorAll('.admin-user-item');
    let draggedElement = null;
    
    items.forEach(item => {
        item.addEventListener('dragstart', function(e) {
            draggedElement = this;
            this.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragend', function(e) {
            this.style.opacity = '1';
            items.forEach(i => i.classList.remove('drag-over'));
        });
        
        item.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (this !== draggedElement) {
                this.classList.add('drag-over');
            }
        });
        
        item.addEventListener('dragleave', function(e) {
            this.classList.remove('drag-over');
        });
        
        item.addEventListener('drop', async function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            
            if (draggedElement !== this) {
                // Reihenfolge im DOM ändern
                const allItems = [...document.querySelectorAll('.admin-user-item')];
                const draggedIndex = allItems.indexOf(draggedElement);
                const targetIndex = allItems.indexOf(this);
                
                if (draggedIndex < targetIndex) {
                    this.parentNode.insertBefore(draggedElement, this.nextSibling);
                } else {
                    this.parentNode.insertBefore(draggedElement, this);
                }
                
                // Neue Reihenfolge an Server senden
                await saveUserOrder();
            }
        });
    });
}

async function saveUserOrder() {
    const items = document.querySelectorAll('.admin-user-item');
    const userIds = Array.from(items).map(item => parseInt(item.dataset.userId));
    
    try {
        const response = await fetch('/api/admin/reorder-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds })
        });
        
        if (response.ok) {
            console.log('Reihenfolge gespeichert');
            await loadAllSystemUsers(); // Aktualisiere auch die Hauptliste
        }
    } catch (error) {
        console.error('Fehler beim Speichern der Reihenfolge:', error);
    }
}

// Benutzername bearbeiten (Admin)
async function editUsername(userId, currentName) {
    const buttons = `
        <button class="btn-secondary" onclick="closeModal()">Abbrechen</button>
    `;
    
    showModal(
        '<span class="material-icons" style="vertical-align: middle;">edit</span> Benutzername ändern',
        '',
        buttons
    );
    
    const modalForm = document.getElementById('modalForm');
    modalForm.innerHTML = `
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Neuer Benutzername:</label>
            <input type="text" id="adminEditUsername" value="${currentName}" 
                style="width: 100%; padding: 10px; border: 2px solid #e9ecef; border-radius: 8px;">
        </div>
        <button onclick="saveAdminUsername(${userId})" class="btn-primary" style="width: 100%;">
            <span class="material-icons" style="vertical-align: middle;">save</span> Speichern
        </button>
    `;
    
    // Focus auf Input und select
    setTimeout(() => {
        const input = document.getElementById('adminEditUsername');
        if (input) {
            input.focus();
            input.select();
        }
    }, 100);
}

async function saveAdminUsername(userId) {
    const newUsername = document.getElementById('adminEditUsername').value.trim();
    
    if (!newUsername) {
        showError('Bitte einen Benutzernamen eingeben!');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/change-username/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newUsername })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal();
            showSuccess('Benutzername erfolgreich geändert!');
            loadAdminPanel();
            await checkSession(); // Session aktualisieren falls eigener Name
            await loadAllSystemUsers();
        } else {
            showError(data.error || 'Fehler beim Ändern des Benutzernamens');
        }
    } catch (error) {
        console.error('Fehler:', error);
        showError('Serverfehler');
    }
}

// Passwort zurücksetzen (Admin)
async function resetUserPassword(userId, username) {
    showConfirm(
        '<span class="material-icons" style="vertical-align: middle;">lock_reset</span> Passwort zurücksetzen',
        `Möchten Sie das Passwort von "${username}" wirklich zurücksetzen? Der Benutzer muss dann ein neues Passwort erstellen.`,
        async () => {
            try {
                const response = await fetch(`/api/admin/reset-password/${userId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showSuccess(`Passwort von "${username}" wurde zurückgesetzt!`);
                    loadAdminPanel();
                } else {
                    showError(data.error || 'Fehler beim Zurücksetzen des Passworts');
                }
            } catch (error) {
                console.error('Fehler:', error);
                showError('Serverfehler');
            }
        }
    );
}

async function createNewUser() {
    const username = document.getElementById('newUsername').value.trim();
    const role = document.getElementById('newUserRole').value;
    
    if (!username) {
        showError('Bitte einen Benutzernamen eingeben!');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, role })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess(`Benutzer "${username}" erfolgreich erstellt!`);
            document.getElementById('newUsername').value = '';
            document.getElementById('newUserRole').value = 'user';
            loadAdminPanel();
            await loadAllSystemUsers(); // Aktualisiere System-User Liste und synchronisiere
        } else {
            showError(data.error || 'Fehler beim Erstellen des Benutzers');
        }
    } catch (error) {
        console.error('Fehler:', error);
        showError('Serverfehler');
    }
}

async function deleteUser(userId, username) {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalFooter = document.getElementById('modalFooter');
    const modalForm = document.getElementById('modalForm');
    
    modalTitle.innerHTML = '<span class="material-icons" style="vertical-align: middle; color: #ffc107;">warning</span> Benutzer löschen';
    modalMessage.textContent = `Möchten Sie den Benutzer "${username}" wirklich löschen?\n\nAlle Daten dieses Benutzers werden unwiderruflich gelöscht!`;
    modalForm.innerHTML = '';
    
    modalFooter.innerHTML = `
        <button class="btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button class="btn-danger" onclick="confirmDeleteUser(${userId}, '${username}')"><span class="material-icons" style="vertical-align: middle; font-size: 18px;">delete</span> Löschen</button>
    `;
    
    modal.classList.add('active');
}

async function confirmDeleteUser(userId, username) {
    closeModal();
    
    try {
        const response = await fetch(`/api/admin/delete-user/${userId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess(`Benutzer "${username}" erfolgreich gelöscht!`);
            loadAdminPanel();
            await loadAllSystemUsers(); // Aktualisiere System-User Liste und synchronisiere
        } else {
            showError(data.error || 'Fehler beim Löschen des Benutzers');
        }
    } catch (error) {
        console.error('Fehler:', error);
        showError('Serverfehler');
    }
}

async function changeUserRole(userId, newRole) {
    try {
        const response = await fetch(`/api/admin/change-role/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Rolle erfolgreich geändert!');
            loadAdminPanel();
        } else {
            showError(data.error || 'Fehler beim Ändern der Rolle');
            loadAdminPanel(); // Reload um Select zurückzusetzen
        }
    } catch (error) {
        console.error('Fehler:', error);
        showError('Serverfehler');
        loadAdminPanel();
    }
}
