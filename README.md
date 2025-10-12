# Monopoly Multiplayer

Ein vollständiges Multiplayer-Monopoly-Spiel für den Webbrowser mit Node.js Backend und WebSocket-Synchronisation.

## 🎮 Features

- **Vollständiges Monopoly-Gameplay**: Alle originalen Regeln, Felder, Karten und Mechaniken
- **Multiplayer**: 2-6 Spieler gleichzeitig über WebSockets
- **Lobby-System**: Spiele erstellen und beitreten mit Spiel-IDs
- **Echtzeit-Synchronisation**: Alle Aktionen werden sofort übertragen
- **Dark Mode Design**: Moderne, responsive Benutzeroberfläche
- **Originalgetreue Spielregeln**: Startkapital, Preise und Effekte wie im echten Monopoly

## 🏗️ Projektstruktur

```
monopoly/
├── server/
│   ├── server.js       # Hauptserver mit Socket.IO
│   ├── Game.js         # Spiellogik-Klasse
│   └── Player.js       # Spieler-Klasse
├── client/
│   ├── index.html      # HTML-Struktur
│   ├── styles.css      # CSS-Styling (Dark Mode)
│   └── client.js       # Frontend-JavaScript
├── shared/
│   └── board-config.js # Spielfeld und Kartendefinitionen
└── package.json        # Projektabhängigkeiten
```

## 🚀 Installation und Start

### Voraussetzungen
- Node.js (Version 14 oder höher)
- npm oder yarn

### Installation
```bash
# Repository klonen oder herunterladen
cd monopoly

# Abhängigkeiten installieren
npm install
```

### Starten
```bash
# Produktionsstart
npm start

# Entwicklungsmodus (mit Nodemon)
npm run dev
```

Das Spiel ist dann unter `http://localhost:3000` verfügbar.

## 🎯 Spielanleitung

### Spiel erstellen/beitreten
1. Namen eingeben
2. "Spiel erstellen" oder "Spiel beitreten" wählen
3. Bei "Spiel beitreten": Spiel-ID eingeben
4. In der Lobby warten bis genug Spieler da sind (2-6)
5. Host startet das Spiel

### Spielablauf
1. **Würfeln**: Klicke auf "Würfeln" wenn du am Zug bist
2. **Grundstücke kaufen**: Kaufentscheidung bei verfügbaren Grundstücken
3. **Miete zahlen**: Automatische Berechnung bei fremden Grundstücken
4. **Karten ziehen**: Ereignis- und Gemeinschaftskarten bei entsprechenden Feldern
5. **Zug beenden**: Automatisch nach Aktionen (außer bei Pasch)

### Spielregeln
- **Startkapital**: 1500 Mark pro Spieler
- **Los-Geld**: 200 Mark beim Überqueren/Landen
- **Pasch**: Weiterspielen, bei 3 Paschen ins Gefängnis
- **Gefängnis**: 3 Versuche oder 50 Mark Kaution
- **Monopol**: Doppelte Miete ohne Häuser
- **Steuern**: Einkommensteuer 200M, Zusatzsteuer 100M

## 🏘️ Spielfeld

Das Spielfeld enthält alle 40 originalen Felder:

### Grundstücke (nach Farben)
- **Braun**: Badstraße (60M), Turmstraße (60M)
- **Hellblau**: Elisenstraße (100M), Chausseestraße (100M), Schillerstraße (120M)
- **Pink**: Theaterstraße (140M), Museumstraße (140M), Opernplatz (160M)
- **Orange**: Lessingstraße (180M), Friedrichstraße (180M), Poststraße (200M)
- **Rot**: Seestraße (220M), Hafenstraße (220M), Münchner Straße (240M)
- **Gelb**: Bahnhofstraße (260M), Wiener Straße (260M), Goethestraße (280M)
- **Grün**: Berliner Straße (300M), Hauptstraße (300M), Rathausplatz (320M)
- **Dunkelblau**: Schlossallee (350M), Parkstraße (400M)

### Bahnhöfe (200M each)
- Hauptbahnhof, Nordbahnhof, Südbahnhof, Ostbahnhof

### Werke (150M each)
- Elektrizitätswerk, Wasserwerk

### Sonderfelder
- Los, Gefängnis, Frei Parken, Gehe ins Gefängnis
- Ereignisfelder (Ereigniskarten)
- Gemeinschaftsfelder (Gemeinschaftskarten)
- Einkommensteuer (200M), Zusatzsteuer (100M)

## 🃏 Karten

### Ereigniskarten (16 Stück)
- Bewegungskarten (Los, verschiedene Felder, nächster Bahnhof/Werk)
- Geldkarten (Gewinne und Verluste)
- Gefängnis und Freibrief
- Reparaturkosten (25M/Haus, 100M/Hotel)
- Zahlung an alle Spieler

### Gemeinschaftskarten (16 Stück)
- Bewegungskarten (Los, Gefängnis)
- Geld von/an Bank
- Geburtstag (10M von jedem Spieler)
- Reparaturkosten (40M/Haus, 115M/Hotel)
- Freibrief aus dem Gefängnis

## 🔧 Technische Details

### Backend (Node.js)
- **Express.js**: Webserver für statische Dateien
- **Socket.IO**: WebSocket-Kommunikation
- **Game-Klasse**: Vollständige Spiellogik
- **Player-Klasse**: Spielerdaten und -methoden

### Frontend
- **Vanilla JavaScript**: Keine Frameworks, pure Performance
- **Socket.IO Client**: Echtzeit-Kommunikation
- **Responsive Design**: Mobile-first CSS
- **Dark Mode**: Standard dunkles Design

### Datenstruktur
- Spiele im Server-Speicher (keine Datenbank)
- Echtzeit-Synchronisation aller Spielzustände
- Automatische Cleanup bei Disconnect

## 🎨 Design

### Dark Mode Theme
- Haupthintergrund: `#1a1a1a`
- Sekundärhintergrund: `#2d2d2d`
- Akzentfarbe: `#4CAF50` (Grün)
- Text: Weiß/Hellgrau auf dunklem Grund

### Responsive Layout
- Desktop: Vollständiges Spielbrett mit Seitenpanel
- Tablet: Angepasste Größen, vertikales Layout
- Mobile: Kompakte Darstellung, Touch-optimiert

## 🐛 Bekannte Limitierungen

- Keine Persistierung (Spiele gehen bei Server-Neustart verloren)
- Keine Häuser/Hotels-Bauweise implementiert
- Keine Auktionen bei Kauf-Ablehnung
- Keine Hypotheken-Verwaltung
- Grundlegende KI-Spieler fehlen

## 🚀 Mögliche Erweiterungen

1. **Häuser & Hotels**: Vollständige Bebauung mit Monopol-Check
2. **Auktionen**: Versteigerung abgelehnter Grundstücke
3. **Hypotheken**: Ein- und Auslösung von Grundstücken
4. **Handel**: Spieler-zu-Spieler Tauschgeschäfte
5. **KI-Spieler**: Computer-gesteuerte Gegner
6. **Persistierung**: Datenbank für dauerhafte Spiele
7. **Spectator Mode**: Zuschauer-Modus
8. **Replay-System**: Aufzeichnung und Wiedergabe
9. **Chat-System**: In-Game Kommunikation
10. **Statistiken**: Spielerleistung und Rekorde

## 📋 Entwicklung

### Dev-Server starten
```bash
npm run dev
```

### Port ändern
```bash
# Windows
set PORT=3001 && npm start

# Linux/Mac
PORT=3001 npm start
```

### Debugging
- Browser-Console für Client-Logs
- Server-Console für Backend-Logs
- Chrome DevTools für WebSocket-Traffic

## 🤝 Mitwirkung

Das Projekt ist als vollständige Implementierung konzipiert. Verbesserungen und Erweiterungen sind willkommen:

1. Fork des Repositories
2. Feature-Branch erstellen
3. Änderungen implementieren
4. Pull Request erstellen

## 📄 Lizenz

MIT License - Freie Nutzung und Modifikation erlaubt.

## 🎉 Credits

Erstellt als vollständige Monopoly-Implementierung mit modernen Web-Technologien. Das Spiel orientiert sich an den klassischen Monopoly-Regeln und -Feldernamen der deutschen Ausgabe.