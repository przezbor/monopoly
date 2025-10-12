/**
 * Spieler-Klasse für Monopoly
 */
class Player {
  constructor(id, name, color, piece = '🎩') {
    this.id = id;
    this.name = name;
    this.color = color;
    this.piece = piece; // Spielfigur (Emoji)
    this.money = 1500; // Startkapital
    this.position = 0; // Startposition auf Los
    this.properties = []; // Besitztümer
    this.railroads = []; // Bahnhöfe
    this.utilities = []; // Werke
    this.houses = 0; // Anzahl Häuser
    this.hotels = 0; // Anzahl Hotels
    this.inJail = false;
    this.jailTurns = 0;
    this.jailFreeCards = 0;
    this.isBankrupt = false;
    this.hasPassedGo = false; // für diese Runde
    this.hasRolled = false; // Verhindert mehrfaches Würfeln
  }

  // Geld hinzufügen
  addMoney(amount) {
    this.money += amount;
  }

  // Geld abziehen
  removeMoney(amount) {
    if (this.money >= amount) {
      this.money -= amount;
      return true;
    }
    return false;
  }

  // Position setzen
  setPosition(position) {
    const oldPosition = this.position;
    this.position = position;
    
    // Prüfen ob über Los gegangen
    if (oldPosition > position || (oldPosition < 39 && position === 0)) {
      this.hasPassedGo = true;
    }
  }

  // Besitz hinzufügen
  addProperty(property) {
    if (property.type === 'property') {
      this.properties.push(property);
    } else if (property.type === 'railroad') {
      this.railroads.push(property);
    } else if (property.type === 'utility') {
      this.utilities.push(property);
    }
  }

  // Besitz entfernen
  removeProperty(property) {
    if (property.type === 'property') {
      this.properties = this.properties.filter(p => p.position !== property.position);
    } else if (property.type === 'railroad') {
      this.railroads = this.railroads.filter(p => p.position !== property.position);
    } else if (property.type === 'utility') {
      this.utilities = this.utilities.filter(p => p.position !== property.position);
    }
  }

  // Ins Gefängnis
  goToJail() {
    // Prüfe auf Freibrief - wenn vorhanden, automatisch verwenden
    if (this.jailFreeCards > 0) {
      this.jailFreeCards--;
      this.position = 10; // Auf Gefängnis-Feld bewegen, aber nicht ins Gefängnis
      return { 
        usedJailFreeCard: true, 
        remainingJailFreeCards: this.jailFreeCards 
      };
    }
    
    // Kein Freibrief vorhanden - ins Gefängnis
    this.inJail = true;
    this.jailTurns = 0;
    this.position = 10; // Gefängnis-Position
    return { 
      usedJailFreeCard: false, 
      remainingJailFreeCards: this.jailFreeCards 
    };
  }

  // Aus Gefängnis
  leaveJail() {
    this.inJail = false;
    this.jailTurns = 0;
  }

  // Spieler-Status für Client
  getPublicData() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      piece: this.piece,
      money: this.money,
      position: this.position,
      properties: this.properties.map(p => p.position),
      railroads: this.railroads.map(p => p.position),
      utilities: this.utilities.map(p => p.position),
      houses: this.houses,
      hotels: this.hotels,
      inJail: this.inJail,
      jailTurns: this.jailTurns,
      jailFreeCards: this.jailFreeCards,
      isBankrupt: this.isBankrupt,
      hasRolled: this.hasRolled
    };
  }

  // Vollständige Daten für Server
  getPrivateData() {
    return {
      ...this.getPublicData(),
      hasPassedGo: this.hasPassedGo
    };
  }
}

module.exports = Player;