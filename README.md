# 🏠 Deutsches Monopoly Spiel

Ein vollständiges Multiplayer-Monopoly-Spiel mit authentischen deutschen Straßennamen, erweitert um moderne Features wie Spielerpersonalisierung und Frei-Parken-Jackpot-System.

## ✨ Features

### 🎮 Kernfunktionen
- **Vollständiges Monopoly-Gameplay**: Alle originalen Regeln, Felder, Karten und Mechaniken
- **Erweiterte Multiplayer-Unterstützung**: Bis zu 8 Spieler gleichzeitig über WebSockets
- **Lobby-System**: Spiele erstellen und beitreten mit Spiel-IDs
- **Echtzeit-Synchronisation**: Alle Aktionen werden sofort übertragen
- **Dark Mode Design**: Moderne, responsive Benutzeroberfläche
- **Authentische deutsche Straßennamen**: Originalgetreue deutsche Monopoly-Edition

### 🎨 Personalisierung (NEU!)
- **8 Spielerfarben zur Auswahl**:
  - 🔴 Rot • 🔵 Blau • 🟢 Grün • 🟡 Gelb
  - 🟠 Orange • 🟣 Lila • 🤎 Braun • 🩷 Rosa
- **8 Spielfiguren zur Auswahl**:
  - 🦄 Einhorn • 🐶 Hund • 🚗 Auto • ⛵ Schiff
  - 👞 Schuh • 🎩 Hut • 💍 Ring • 🪙 Münze
- **Individuelle Spieleridentität**: Jeder Spieler wählt seine eigene Farbe und Figur

### 💰 Frei-Parken Jackpot-System (NEU!)
- **Automatische Potansammlung**: Alle Steuern und Gebühren fließen in den Frei-Parken-Topf
- **Jackpot-Auszahlung**: Spieler erhalten das gesamte Geld beim Landen auf "Frei Parken"
- **Live-Anzeige**: Aktueller Topfbetrag wird kontinuierlich angezeigt
- **Realistische Spielmechanik**: Macht "Frei Parken" zu einem begehrten Feld

### 🏛️ Erweiterte Spielmechaniken
- **Vollständiges Gefängnis-System**: Inhaftierung, Befreiung durch Pasch oder Kaution
- **Auktionssystem**: Automatische Versteigerung nicht gekaufter Grundstücke
- **Handelssystem**: Spieler können Grundstücke und Geld tauschen
- **Liquidationssystem**: Automatische Abwicklung bei Zahlungsunfähigkeit
- **Gebäudewirtschaft**: Häuser und Hotels kaufen/verkaufen mit Monopol-System

### �️ Authentische deutsche Straßen
- **Braun**: Badstraße (60€) • Turmstraße (60€)
- **Hellblau**: Chausseestraße (100€) • Elisenstraße (100€) • Poststraße (120€)
- **Pink**: Seestraße (140€) • Hafenstraße (140€) • Neue Straße (160€)
- **Orange**: Münchener Straße (180€) • Wiener Straße (180€) • Berliner Straße (200€)
- **Rot**: Theaterstraße (220€) • Museumstraße (220€) • Opernplatz (240€)
- **Gelb**: Lessingstraße (260€) • Schillerstraße (260€) • Goethestraße (280€)
- **Grün**: Rathausplatz (300€) • Hauptstraße (300€) • Bahnhofstraße (320€)
- **Dunkelblau**: Parkstraße (350€) • Schlossallee (400€)

## �🏗️ Projektstruktur

```
monopoly/
├── server/
│   ├── server.js       # Hauptserver mit Socket.IO & Personalisierung
│   ├── Game.js         # Erweiterte Spiellogik mit Frei-Parken-System
│   └── Player.js       # Spieler-Klasse mit Farbe & Figur
├── client/
│   ├── index.html      # HTML mit Farb- & Figurauswahl
│   ├── styles.css      # CSS-Styling (Dark Mode + Personalisierung)
│   ├── client.js       # Frontend mit Auswahlsystem
│   └── audio-manager.js # Audio-System
├── shared/
│   ├── board-config.js # Deutsche Straßen & Kartendefinitionen  
│   └── game-utils.js   # Geteilte Utilities
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

### Lobby & Spielstart
1. **Namen eingeben** und Spiel erstellen/beitreten
2. **Farbe auswählen**: Wähle aus 8 verfügbaren Farben (Rot, Blau, Grün, Gelb, Orange, Lila, Braun, Rosa)
3. **Spielfigur auswählen**: Wähle deine Lieblings-Emoji-Figur (Einhorn, Hund, Auto, Schiff, Schuh, Hut, Ring, Münze)
4. In der Lobby warten bis genug Spieler da sind (2-8)
5. Host startet das Spiel

### Gameplay
1. **Würfeln**: Klicke auf "Würfeln" wenn du am Zug bist
2. **Grundstücke kaufen**: Kaufentscheidung bei verfügbaren Grundstücken
3. **Miete zahlen**: Automatische Berechnung bei fremden Grundstücken
4. **Frei-Parken Jackpot**: Kassiere den gesamten Steuertopf beim Landen!
5. **Karten ziehen**: Ereignis- und Gemeinschaftskarten bei entsprechenden Feldern
6. **Gebäude bauen**: Häuser und Hotels auf Monopol-Grundstücken errichten
7. **Zug beenden**: Automatisch nach Aktionen (außer bei Pasch)

### Wichtige Spielregeln
- **Startkapital**: 1500€ pro Spieler
- **Los-Geld**: 200€ beim Überqueren/Landen auf Los
- **Frei-Parken Bonus**: Alle Steuern sammeln sich im Jackpot (NEU!)
- **Pasch**: Weiterspielen, bei 3 Paschen direkt ins Gefängnis
- **Gefängnis**: 3 Versuche für Pasch oder 50€ Kaution zahlen
- **Monopol**: Doppelte Miete ohne Gebäude, Häuser/Hotels möglich
- **Steuern**: Einkommensteuer 200€, Zusatzsteuer 100€ → Frei-Parken-Topf

## 🏘️ Spielfeld

Das Spielfeld enthält alle 40 authentischen deutschen Felder:

### Grundstücke (nach Farben)
- **Braun**: Badstraße (60€), Turmstraße (60€)
- **Hellblau**: Chausseestraße (100€), Elisenstraße (100€), Poststraße (120€)
- **Pink**: Seestraße (140€), Hafenstraße (140€), Neue Straße (160€)
- **Orange**: Münchener Straße (180€), Wiener Straße (180€), Berliner Straße (200€)
- **Rot**: Theaterstraße (220€), Museumstraße (220€), Opernplatz (240€)
- **Gelb**: Lessingstraße (260€), Schillerstraße (260€), Goethestraße (280€)
- **Grün**: Rathausplatz (300€), Hauptstraße (300€), Bahnhofstraße (320€)
- **Dunkelblau**: Parkstraße (350€), Schlossallee (400€)

### Bahnhöfe (200€ each)
- Hauptbahnhof, Nordbahnhof, Südbahnhof, Ostbahnhof

### Werke (150€ each)
- Elektrizitätswerk, Wasserwerk

### Sonderfelder
- **Los** (200€ Gehalt)
- **Frei Parken** (💰 JACKPOT! - Alle Steuern werden ausgezahlt)
- **Gefängnis** (Besucher/Inhaftiert)
- **Gehe ins Gefängnis** (Direkt einsperren)
- **Ereignisfelder** (Ereigniskarten ziehen)
- **Gemeinschaftsfelder** (Gemeinschaftskarten ziehen)
- **Einkommensteuer** (200€ → Frei-Parken-Topf)
- **Zusatzsteuer** (100€ → Frei-Parken-Topf)

## 🃏 Karten

### Ereigniskarten (16 Stück)
- Bewegungskarten (Los, verschiedene Felder, nächster Bahnhof/Werk)
- Geldkarten (Gewinne und Verluste)
- Gefängnis und Freibrief
- Reparaturkosten (25M/Haus, 100M/Hotel)
- Zahlung an alle Spieler

### Gemeinschaftskarten (16 Stück)
- Bewegungskarten (Los, Gefängnis)
- Geld von/an Bank → Verluste gehen an Frei-Parken-Topf
- Geburtstag (10€ von jedem Spieler)
- Reparaturkosten (40€/Haus, 115€/Hotel) → An Frei-Parken-Topf
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

## ✅ Implementierte Features

- ✅ **Vollständige Spielmechanik**: Alle Regeln und Interaktionen
- ✅ **Frei-Parken Jackpot-System**: Steuern sammeln und auszahlen
- ✅ **8 Spielerfarben**: Individuelle Farbauswahl
- ✅ **8 Spielfiguren**: Emoji-basierte Figurauswahl  
- ✅ **Häuser & Hotels**: Vollständige Bebauung mit Monopol-Check
- ✅ **Auktionssystem**: Versteigerung abgelehnter Grundstücke
- ✅ **Gefängnis-System**: Vollständige Inhaftierungs-Mechanik
- ✅ **Handelssystem**: Spieler-zu-Spieler Tauschgeschäfte
- ✅ **Liquidationssystem**: Automatische Abwicklung bei Pleite
- ✅ **Authentische deutsche Straßen**: Originalgetreue Namen validiert

## 🔄 Bekannte Verbesserungen

- Keine Persistierung (Spiele gehen bei Server-Neustart verloren)
- Keine Hypotheken-Verwaltung implementiert
- KI-Spieler könnten hinzugefügt werden
- Chat-System für In-Game Kommunikation

## 🚀 Mögliche Erweiterungen

1. **Hypotheken**: Ein- und Auslösung von Grundstücken
2. **KI-Spieler**: Computer-gesteuerte Gegner
3. **Persistierung**: Datenbank für dauerhafte Spiele
4. **Spectator Mode**: Zuschauer-Modus
5. **Replay-System**: Aufzeichnung und Wiedergabe
6. **Chat-System**: In-Game Kommunikation
7. **Statistiken**: Spielerleistung und Rekorde
8. **Turniere**: Mehrstufige Wettkämpfe
9. **Custom Rules**: Hausregeln konfigurieren
10. **Mobile App**: Native iOS/Android Apps

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

Erstellt als vollständige Monopoly-Implementierung mit modernen Web-Technologien und erweiterten Features. Das Spiel orientiert sich an den klassischen Monopoly-Regeln der deutschen Ausgabe und erweitert diese um zeitgemäße Funktionen wie Spielerpersonalisierung und das beliebte Frei-Parken-Jackpot-System.

### 🆕 Version 2.0 Features
- Frei-Parken Jackpot-System für mehr Spannung
- 8 Spielerfarben für individuelle Identifikation  
- 8 Emoji-Spielfiguren für persönlichen Touch
- Erweiterte Multiplayer-Unterstützung (bis zu 8 Spieler)
- Authentische deutsche Straßennamen validiert und korrigiert
- Vollständig funktionierende Gebäudewirtschaft
- Robustes Auktions- und Handelssystem