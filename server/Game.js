const Player = require('./Player');
const { BOARD_FIELDS, CHANCE_CARDS, COMMUNITY_CARDS } = require('../shared/board-config');

/**
 * Hauptspiel-Klasse für Monopoly
 */
class Game {
  constructor(id, hostPlayerId) {
    this.id = id;
    this.hostPlayerId = hostPlayerId;
    this.players = new Map();
    this.currentPlayerIndex = 0;
    this.gamePhase = 'waiting'; // waiting, playing, finished
    this.board = [...BOARD_FIELDS];
    this.chanceCards = this.shuffleArray([...CHANCE_CARDS]);
    this.communityCards = this.shuffleArray([...COMMUNITY_CARDS]);
    this.chanceIndex = 0;
    this.communityIndex = 0;
    this.houses = 32; // Verfügbare Häuser
    this.hotels = 12; // Verfügbare Hotels
    this.lastDiceRoll = null;
    this.consecutiveDoubles = 0;
    this.maxPlayers = 6;
    this.propertyOwnership = new Map(); // position -> playerId
    this.mortgagedProperties = new Set(); // Positions der hypothekisierten Grundstücke
    this.buildingsOnProperties = new Map(); // position -> {houses: number, hotel: boolean}
    this.turnInProgress = false; // Verhindert doppelte Züge
    this.activeTradeOffers = new Map(); // tradeId -> tradeOffer
    this.tradeIdCounter = 0; // Eindeutige Trade-IDs
    
    // Auktions-System
    this.currentAuction = null;
    this.auctionIdCounter = 0;
    
    // Frei-Parken-Topf für Steuern und Strafen
    this.freeParkingPot = 0;
    
    // Liquidations-System
    this.activeLiquidations = new Map();
    this.liquidationIdCounter = 0;
  }

  // Spieler hinzufügen
  addPlayer(playerId, playerName) {
    if (this.players.size >= this.maxPlayers) {
      return { success: false, error: 'Spiel ist voll' };
    }
    
    if (this.gamePhase !== 'waiting') {
      return { success: false, error: 'Spiel bereits gestartet' };
    }

    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
    const usedColors = Array.from(this.players.values()).map(p => p.color);
    const availableColor = colors.find(color => !usedColors.includes(color));

    const pieces = ['🎩', '🦄', '🐕', '🚗', '⛵', '✈️', '🍕', '👑'];
    const usedPieces = Array.from(this.players.values()).map(p => p.piece);
    const availablePiece = pieces.find(piece => !usedPieces.includes(piece));

    const player = new Player(playerId, playerName, availableColor, availablePiece);
    this.players.set(playerId, player);

    console.log(`DEBUG: Player ${playerName} assigned color: ${availableColor}, piece: ${availablePiece}`);
    return { success: true, player: player.getPublicData() };
  }

  // Spielerfarbe ändern
  changePlayerColor(playerId, newColor) {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Spieler nicht gefunden' };
    }

    console.log(`DEBUG: Farbwechsel-Anfrage für ${player.name}, aktuelle gamePhase: ${this.gamePhase}`);

    if (this.gamePhase !== 'waiting') {
      return { success: false, error: 'Farbwechsel nur vor Spielstart möglich' };
    }

    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
    if (!colors.includes(newColor)) {
      return { success: false, error: 'Ungültige Farbe' };
    }

    // Prüfe ob Farbe bereits verwendet wird
    const usedColors = Array.from(this.players.values())
      .filter(p => p.id !== playerId) // Eigene Farbe ausschließen
      .map(p => p.color);
    
    if (usedColors.includes(newColor)) {
      return { success: false, error: 'Farbe bereits vergeben' };
    }

    const oldColor = player.color;
    player.color = newColor;
    
    console.log(`DEBUG: Player ${player.name} changed color: ${oldColor} -> ${newColor}`);
    return { success: true, player: player.getPublicData() };
  }

  // Verfügbare Farben abrufen
  getAvailableColors() {
    const allColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
    const usedColors = Array.from(this.players.values()).map(p => p.color);
    return allColors.filter(color => !usedColors.includes(color));
  }

  // Spielerfigur ändern
  changePlayerPiece(playerId, newPiece) {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Spieler nicht gefunden' };
    }

    console.log(`DEBUG: Figurenwechsel-Anfrage für ${player.name}, aktuelle gamePhase: ${this.gamePhase}`);

    if (this.gamePhase !== 'waiting') {
      return { success: false, error: 'Figurenwechsel nur vor Spielstart möglich' };
    }

    const pieces = ['🎩', '🦄', '🐕', '🚗', '⛵', '✈️', '🍕', '👑'];
    if (!pieces.includes(newPiece)) {
      return { success: false, error: 'Ungültige Figur' };
    }

    // Prüfe ob Figur bereits verwendet wird
    const usedPieces = Array.from(this.players.values())
      .filter(p => p.id !== playerId) // Eigene Figur ausschließen
      .map(p => p.piece);
    
    if (usedPieces.includes(newPiece)) {
      return { success: false, error: 'Figur bereits vergeben' };
    }

    const oldPiece = player.piece;
    player.piece = newPiece;
    
    console.log(`DEBUG: Player ${player.name} changed piece: ${oldPiece} -> ${newPiece}`);
    return { success: true, player: player.getPublicData() };
  }

  // Verfügbare Figuren abrufen
  getAvailablePieces() {
    const allPieces = ['🎩', '🦄', '🐕', '🚗', '⛵', '✈️', '🍕', '👑'];
    const usedPieces = Array.from(this.players.values()).map(p => p.piece);
    return allPieces.filter(piece => !usedPieces.includes(piece));
  }

  // Spieler entfernen
  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return false;

    console.log(`Entferne Spieler ${player.name} (${playerId})`);

    // Bereinige alle Grundstücke, Häuser und Hotels des Spielers
    this.clearPlayerProperties(playerId);

    // Bestimme Index des zu entfernenden Spielers VOR der Entfernung
    const playerIds = Array.from(this.players.keys());
    const removedPlayerIndex = playerIds.findIndex(id => id === playerId);
    const wasCurrentPlayer = (removedPlayerIndex === this.currentPlayerIndex);
    
    console.log(`Entfernter Spieler Index: ${removedPlayerIndex}, aktueller Index: ${this.currentPlayerIndex}, war am Zug: ${wasCurrentPlayer}`);
    
    // Spieler aus der Map entfernen
    this.players.delete(playerId);

    // Index-Anpassung nach Entfernung
    if (this.players.size > 0) {
      if (wasCurrentPlayer) {
        // Der Spieler der am Zug war wurde entfernt
        // Der nächste Spieler wird automatisch zum aktuellen Spieler
        this.currentPlayerIndex = this.currentPlayerIndex % this.players.size;
        this.turnInProgress = false; // Zug freigeben
        console.log(`Aktueller Spieler entfernt. Neuer Index: ${this.currentPlayerIndex}, turnInProgress zurückgesetzt`);
      } else if (removedPlayerIndex < this.currentPlayerIndex) {
        // Ein Spieler VOR dem aktuellen Spieler wurde entfernt
        // Index um 1 reduzieren, da alle Indices nach links rutschen
        this.currentPlayerIndex--;
        console.log(`Spieler vor aktuellem entfernt. Index reduziert auf: ${this.currentPlayerIndex}`);
      }
      // Wenn removedPlayerIndex > this.currentPlayerIndex: nichts ändern
      
      // Sicherheitscheck: Index darf nie >= players.size sein
      if (this.currentPlayerIndex >= this.players.size) {
        this.currentPlayerIndex = 0;
        console.log(`Index-Korrektur: auf 0 gesetzt`);
      }
    } else {
      // Letzter Spieler entfernt
      this.currentPlayerIndex = 0;
      this.turnInProgress = false;
    }

    // Wenn Host verlässt, neuen Host bestimmen
    if (playerId === this.hostPlayerId && this.players.size > 0) {
      this.hostPlayerId = this.players.keys().next().value;
    }

    return true;
  }

  // Spiel starten
  startGame() {
    if (this.players.size < 2) {
      return { success: false, error: 'Mindestens 2 Spieler benötigt' };
    }

    if (this.gamePhase !== 'waiting') {
      return { success: false, error: 'Spiel bereits gestartet' };
    }

    this.gamePhase = 'playing';
    this.currentPlayerIndex = 0;

    return { success: true };
  }

  // Aktueller Spieler
  getCurrentPlayer() {
    const playerIds = Array.from(this.players.keys());
    const currentPlayerId = playerIds[this.currentPlayerIndex];
    return this.players.get(currentPlayerId);
  }

  // Nächster Spieler
  nextPlayer() {
    if (this.turnInProgress) {
      console.log('Turn bereits in Bearbeitung, überspringe nextPlayer()');
      return false; // Verhindert doppelten Spielerwechsel
    }
    
    this.turnInProgress = true;
    
    const oldPlayerIndex = this.currentPlayerIndex;
    
    // Finde nächsten nicht-bankrotten Spieler
    let attempts = 0;
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.size;
      attempts++;
      
      // Verhindere Endlosschleife wenn alle Spieler bankrott sind
      if (attempts >= this.players.size) {
        console.log('⚠️ Alle Spieler sind bankrott - Spiel beenden');
        this.gamePhase = 'finished';
        this.turnInProgress = false;
        return false;
      }
    } while (this.getCurrentPlayer().isBankrupt);
    
    this.consecutiveDoubles = 0;
    this.lastDiceRoll = null; // Würfel-Reset für neuen Spieler
    
    // Reset für neuen Spieler NACH dem Wechsel
    const newCurrentPlayer = this.getCurrentPlayer();
    if (newCurrentPlayer) {
      newCurrentPlayer.hasPassedGo = false;
      newCurrentPlayer.hasRolled = false; // Erlaube neues Würfeln
    }
    
    console.log(`Spielerwechsel: Index ${oldPlayerIndex} -> ${this.currentPlayerIndex}`);
    
    // Nach kurzer Zeit wieder freigeben
    setTimeout(() => {
      this.turnInProgress = false;
    }, 2000);
    
    return true;
  }

  // Würfeln
  rollDice() {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const sum = dice1 + dice2;
    const isDouble = dice1 === dice2;

    this.lastDiceRoll = { dice1, dice2, sum, isDouble };

    if (isDouble) {
      this.consecutiveDoubles++;
      if (this.consecutiveDoubles >= 3) {
        // Bei 3 Pासchen ins Gefängnis
        const currentPlayer = this.getCurrentPlayer();
        const jailResult = currentPlayer.goToJail();
        this.consecutiveDoubles = 0;
        return { 
          ...this.lastDiceRoll, 
          goToJail: true,
          usedJailFreeCard: jailResult.usedJailFreeCard,
          remainingJailFreeCards: jailResult.remainingJailFreeCards
        };
      }
    } else {
      this.consecutiveDoubles = 0;
    }

    return this.lastDiceRoll;
  }

  // Spieler bewegen
  movePlayer(playerId, steps) {
    const player = this.players.get(playerId);
    if (!player) return { success: false, error: 'Spieler nicht gefunden' };

    const oldPosition = player.position;
    let newPosition = (oldPosition + steps) % 40;
    
    console.log(`DEBUG movePlayer: ${player.name} von Position ${oldPosition} + ${steps} Schritte = ${newPosition}`);
    
    // Über Los gegangen oder genau auf Los gelandet?
    if ((newPosition < oldPosition && steps > 0) || (oldPosition + steps >= 40)) {
      player.addMoney(200); // 200 M für Los passieren/erreichen (deutsche Monopoly-Regeln)
      player.hasPassedGo = true;
      console.log(`${player.name} erhält 200M für Los passieren/erreichen`);
    }

    player.setPosition(newPosition);
    console.log(`DEBUG movePlayer: ${player.name} neue Position gesetzt: ${player.position}`);
    return { 
      success: true, 
      moved: true, 
      oldPosition, 
      newPosition, 
      passedGo: player.hasPassedGo 
    };
  }

  // Grundstück kaufen
  buyProperty(playerId, position) {
    const player = this.players.get(playerId);
    const property = this.board[position];

    if (!player || !property) {
      return { success: false, error: 'Spieler oder Grundstück nicht gefunden' };
    }

    if (this.propertyOwnership.has(position)) {
      return { success: false, error: 'Grundstück bereits besessen' };
    }

    if (!['property', 'railroad', 'utility'].includes(property.type)) {
      return { success: false, error: 'Grundstück nicht kaufbar' };
    }

    if (player.money < property.price) {
      return { success: false, error: 'Nicht genug Geld' };
    }

    player.removeMoney(property.price);
    player.addProperty(property);
    this.propertyOwnership.set(position, playerId);

    return { success: true };
  }

  // Miete berechnen und zahlen
  payRent(payerId, propertyPosition) {
    const payer = this.players.get(payerId);
    const property = this.board[propertyPosition];
    const ownerId = this.propertyOwnership.get(propertyPosition);
    const owner = this.players.get(ownerId);

    if (!payer || !property || !owner || !ownerId) {
      return { success: false, error: 'Ungültige Parameter' };
    }

    if (this.mortgagedProperties.has(propertyPosition)) {
      return { success: true, rent: 0 }; // Keine Miete bei Hypothek
    }

    let rent = 0;

    if (property.type === 'property') {
      rent = this.calculatePropertyRent(property, ownerId);
    } else if (property.type === 'railroad') {
      rent = this.calculateRailroadRent(ownerId);
    } else if (property.type === 'utility') {
      rent = this.calculateUtilityRent(ownerId);
    }

    if (payer.money < rent) {
      // Prüfe Bankruptcy/Liquidation
      const bankruptcyCheck = this.checkBankruptcy(payerId, rent, `Miete an ${owner.name}`);
      
      if (bankruptcyCheck.isBankrupt) {
        // Spieler ist wirklich bankrott - zahle was möglich
        const partialPayment = payer.money;
        payer.money = 0;
        owner.addMoney(partialPayment);
        
        console.log(`${payer.name} ist bankrott! Kann Miete von ${rent}M nicht vollständig zahlen.`);
        return { success: true, rent: partialPayment, ownerId, playerBankrupt: true };
      } else if (bankruptcyCheck.requiresLiquidation) {
        // Spieler muss interaktiv liquidieren
        return { 
          success: false, 
          requiresLiquidation: true,
          liquidationData: this.createLiquidationRequest(payerId, rent, `Miete an ${owner.name}`)
        };
      }
    }

    // Spieler hat genug Geld oder Liquidation bereits durchgeführt
    payer.removeMoney(rent);
    owner.addMoney(rent);

    return { success: true, rent, ownerId };
  }

  // Miete für Grundstücke berechnen
  calculatePropertyRent(property, ownerId) {
    const owner = this.players.get(ownerId);
    const colorGroup = this.board.filter(p => p.color === property.color && p.type === 'property');
    const ownedInGroup = colorGroup.filter(p => this.propertyOwnership.get(p.position) === ownerId).length;
    
    // Monopol?
    if (ownedInGroup === colorGroup.length) {
      const buildings = this.buildingsOnProperties.get(property.position) || { houses: 0, hotel: false };
      
      if (buildings.hotel) {
        // Hotel = Index 5 in rent array
        return property.rent[5];
      } else if (buildings.houses > 0) {
        // Häuser = Index 1-4 in rent array
        return property.rent[buildings.houses];
      } else {
        // Monopol ohne Gebäude = doppelte Grundmiete
        return property.rent[0] * 2;
      }
    }

    return property.rent[0];
  }

  // Miete für Bahnhöfe berechnen
  calculateRailroadRent(ownerId) {
    const owner = this.players.get(ownerId);
    const ownedRailroads = owner.railroads.length;
    const baseRent = 25;
    return baseRent * Math.pow(2, ownedRailroads - 1);
  }

  // Miete für Werke berechnen
  calculateUtilityRent(ownerId) {
    const owner = this.players.get(ownerId);
    const ownedUtilities = owner.utilities.length;
    const multiplier = ownedUtilities === 1 ? 4 : 10;
    return this.lastDiceRoll ? this.lastDiceRoll.sum * multiplier : 0;
  }

  // Karte ziehen
  drawCard(type) {
    let card, index;
    
    if (type === 'chance') {
      index = this.chanceIndex;
      card = this.chanceCards[index];
      this.chanceIndex = (this.chanceIndex + 1) % this.chanceCards.length;
      
      // Karten neu mischen wenn der Stapel durchgegangen ist
      if (this.chanceIndex === 0) {
        console.log('Ereigniskarten werden neu gemischt');
        this.chanceCards = this.shuffleArray([...this.chanceCards]);
      }
    } else if (type === 'community') {
      index = this.communityIndex;
      card = this.communityCards[index];
      this.communityIndex = (this.communityIndex + 1) % this.communityCards.length;
      
      // Karten neu mischen wenn der Stapel durchgegangen ist
      if (this.communityIndex === 0) {
        console.log('Gemeinschaftskarten werden neu gemischt');
        this.communityCards = this.shuffleArray([...this.communityCards]);
      }
    }

    return card;
  }

  // Kartenaktion ausführen
  executeCardAction(playerId, card) {
    const player = this.players.get(playerId);
    if (!player || !card) return { success: false };

    const results = [];

    switch (card.action) {
      case 'move_to':
        // Korrekte Berechnung für ringförmiges Brett
        let stepsToTarget = card.target - player.position;
        if (stepsToTarget <= 0) {
          stepsToTarget += 40; // Um das Brett herum
        }
        const moveResult = this.movePlayer(playerId, stepsToTarget);
        results.push({ type: 'move', ...moveResult });
        break;

      case 'move_to_nearest':
        const nearestResult = this.moveToNearest(playerId, card.target);
        results.push({ type: 'move', ...nearestResult });
        break;

      case 'move_relative':
        const relativeResult = this.movePlayer(playerId, card.steps);
        results.push({ type: 'move', ...relativeResult });
        break;

      case 'receive_money':
        player.addMoney(card.amount);
        results.push({ type: 'money', amount: card.amount, message: `${player.name} erhält ${card.amount}M` });
        break;

      case 'pay_money':
        // Prüfe Bankruptcy mit automatischer Liquidation
        const bankruptcyCheck = this.checkBankruptcy(playerId, card.amount);
        
        if (bankruptcyCheck.isBankrupt) {
          // Spieler ist bankrott nach Liquidation
          // Liquidiertes Geld geht trotzdem in den Frei-Parken-Topf
          if (bankruptcyCheck.amountRaised > 0) {
            this.addToFreeParkingPot(bankruptcyCheck.amountRaised);
          }
          results.push({ 
            type: 'pay', 
            amount: bankruptcyCheck.amountRaised, 
            bankrupt: true, 
            message: `${player.name} ist bankrott! Liquidiert ${bankruptcyCheck.amountRaised}M, aber benötigt ${card.amount}M`,
            liquidationLog: bankruptcyCheck.liquidationLog,
            freeParkingPot: this.getFreeParkingPot()
          });
        } else if (bankruptcyCheck.canPay) {
          // Spieler kann zahlen nach Liquidation
          player.removeMoney(card.amount);
          // Geld geht in den Frei-Parken-Topf
          this.addToFreeParkingPot(card.amount);
          results.push({ 
            type: 'pay', 
            amount: card.amount, 
            liquidated: bankruptcyCheck.amountRaised > 0,
            message: `${player.name} zahlt ${card.amount}M${bankruptcyCheck.amountRaised > 0 ? ' nach Liquidation' : ''}`,
            liquidationLog: bankruptcyCheck.liquidationLog,
            freeParkingPot: this.getFreeParkingPot()
          });
        } else {
          // Normaler Fall - genug Bargeld
          player.removeMoney(card.amount);
          // Geld geht in den Frei-Parken-Topf
          this.addToFreeParkingPot(card.amount);
          results.push({ 
            type: 'pay', 
            amount: card.amount, 
            message: `${player.name} zahlt ${card.amount}M`,
            freeParkingPot: this.getFreeParkingPot()
          });
        }
        break;

      case 'pay_all_players':
        const totalPayment = card.amount * (this.players.size - 1);
        
        // Prüfe Bankruptcy mit automatischer Liquidation
        const payAllBankruptcyCheck = this.checkBankruptcy(playerId, totalPayment);
        
        if (payAllBankruptcyCheck.isBankrupt) {
          // Spieler ist bankrott
          results.push({ 
            type: 'pay_all', 
            amount: payAllBankruptcyCheck.amountRaised, 
            bankrupt: true,
            message: `${player.name} ist bankrott! Kann ${totalPayment}M nicht an alle Spieler zahlen`,
            liquidationLog: payAllBankruptcyCheck.liquidationLog
          });
        } else {
          // Spieler kann zahlen (eventuell nach Liquidation)
          player.removeMoney(totalPayment);
          
          // Geld an alle anderen Spieler verteilen
          this.players.forEach((otherPlayer, otherId) => {
            if (otherId !== playerId) {
              otherPlayer.addMoney(card.amount);
            }
          });
          
          results.push({ 
            type: 'pay_all', 
            amount: totalPayment,
            liquidated: payAllBankruptcyCheck.amountRaised > 0,
            message: `${player.name} zahlt ${card.amount}M an jeden Spieler${payAllBankruptcyCheck.amountRaised > 0 ? ' nach Liquidation' : ''}`,
            liquidationLog: payAllBankruptcyCheck.liquidationLog
          });
        }
        break;

      case 'receive_from_all':
        let totalReceived = 0;
        this.players.forEach((otherPlayer, otherId) => {
          if (otherId !== playerId) {
            const payment = Math.min(card.amount, otherPlayer.money);
            otherPlayer.removeMoney(payment);
            totalReceived += payment;
          }
        });
        player.addMoney(totalReceived);
        results.push({ type: 'receive_from_all', amount: totalReceived });
        break;

      case 'repair_buildings':
        const repairCost = (player.houses * card.house_cost) + (player.hotels * card.hotel_cost);
        
        if (repairCost === 0) {
          results.push({ type: 'repair', amount: 0, message: `${player.name} hat keine Gebäude zu reparieren` });
        } else {
          // Prüfe Bankruptcy mit automatischer Liquidation
          const repairBankruptcyCheck = this.checkBankruptcy(playerId, repairCost);
          
          if (repairBankruptcyCheck.isBankrupt) {
            // Spieler ist bankrott
            results.push({ 
              type: 'repair', 
              amount: repairBankruptcyCheck.amountRaised, 
              bankrupt: true,
              message: `${player.name} ist bankrott! Kann Reparaturkosten von ${repairCost}M nicht zahlen`,
              liquidationLog: repairBankruptcyCheck.liquidationLog
            });
          } else {
            // Spieler kann zahlen (eventuell nach Liquidation)
            player.removeMoney(repairCost);
            results.push({ 
              type: 'repair', 
              amount: repairCost,
              liquidated: repairBankruptcyCheck.amountRaised > 0,
              message: `${player.name} zahlt ${repairCost}M Reparaturkosten${repairBankruptcyCheck.amountRaised > 0 ? ' nach Liquidation' : ''}`,
              liquidationLog: repairBankruptcyCheck.liquidationLog
            });
          }
        }
        break;

      case 'go_to_jail':
        // Pasch-Counter zurücksetzen bei Gefängnis durch Karte
        this.consecutiveDoubles = 0;
        const oldPositionJail = player.position; // Position vor Gefängnis speichern
        const jailResult = player.goToJail();
        if (jailResult.usedJailFreeCard) {
          results.push({ 
            type: 'jail_free_card_used',
            moved: true,
            oldPosition: oldPositionJail,
            newPosition: 10,
            remainingJailFreeCards: jailResult.remainingJailFreeCards
          });
        } else {
          results.push({ 
            type: 'jail',
            moved: true,
            oldPosition: oldPositionJail,
            newPosition: 10
          });
        }
        break;

      case 'jail_free_card':
        player.jailFreeCards++;
        results.push({ type: 'jail_free_card' });
        break;
    }

    return { success: true, results };
  }

  // Zum nächsten Feld eines bestimmten Typs bewegen
  moveToNearest(playerId, targetType) {
    const player = this.players.get(playerId);
    if (!player) return { success: false };

    let searchPosition = (player.position + 1) % 40;
    let steps = 1;

    while (steps < 40) {
      const field = this.board[searchPosition];
      if (field.type === targetType) {
        return this.movePlayer(playerId, steps);
      }
      searchPosition = (searchPosition + 1) % 40;
      steps++;
    }

    return { success: false, error: 'Zieltyp nicht gefunden' };
  }

  // Array mischen (Fisher-Yates)
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Spielername finden
  getPlayerName(playerId) {
    const player = this.players.get(playerId);
    return player ? player.name : 'Unbekannt';
  }

  // Spielzustand für Client
  getGameState() {
    const playerIds = Array.from(this.players.keys());
    const currentPlayerId = playerIds[this.currentPlayerIndex];

    return {
      id: this.id,
      gamePhase: this.gamePhase,
      hostPlayerId: this.hostPlayerId, // Host-ID hinzufügen
      players: Array.from(this.players.values()).map(p => p.getPublicData()),
      currentPlayerId,
      lastDiceRoll: this.lastDiceRoll,
      houses: this.houses,
      hotels: this.hotels,
      propertyOwnership: Object.fromEntries(this.propertyOwnership),
      mortgagedProperties: Array.from(this.mortgagedProperties),
      buildingsOnProperties: Object.fromEntries(this.buildingsOnProperties),
      currentAuction: this.getAuctionStatus(),
      freeParkingPot: this.freeParkingPot
    };
  }

  // Häuser/Hotel-System

  // Monopol-Gruppe prüfen
  hasMonopoly(playerId, colorGroup) {
    const playerProperties = [];
    this.propertyOwnership.forEach((ownerId, position) => {
      if (ownerId === playerId && this.board[position].color === colorGroup) {
        playerProperties.push(position);
      }
    });

    // Anzahl Felder in der Farbgruppe
    const totalInGroup = this.board.filter(field => field.color === colorGroup).length;
    return playerProperties.length === totalInGroup;
  }

  // Haus bauen
  buildHouse(playerId, position) {
    const player = this.players.get(playerId);
    const property = this.board[position];

    if (!player || !property) {
      return { success: false, error: 'Spieler oder Grundstück nicht gefunden' };
    }

    if (property.type !== 'property') {
      return { success: false, error: 'Nur auf Grundstücken können Häuser gebaut werden' };
    }

    if (this.propertyOwnership.get(position) !== playerId) {
      return { success: false, error: 'Du besitzt dieses Grundstück nicht' };
    }

    if (this.mortgagedProperties.has(position)) {
      return { success: false, error: 'Auf hypothekisierten Grundstücken kann nicht gebaut werden' };
    }

    if (!this.hasMonopoly(playerId, property.color)) {
      return { success: false, error: 'Du benötigst ein Monopol um zu bauen' };
    }

    if (this.houses <= 0) {
      return { success: false, error: 'Keine Häuser mehr verfügbar' };
    }

    if (player.money < property.houseCost) {
      return { success: false, error: 'Nicht genug Geld' };
    }

    const buildings = this.buildingsOnProperties.get(position) || { houses: 0, hotel: false };
    
    if (buildings.hotel) {
      return { success: false, error: 'Auf diesem Grundstück steht bereits ein Hotel' };
    }

    if (buildings.houses >= 4) {
      return { success: false, error: 'Maximal 4 Häuser pro Grundstück möglich' };
    }

    // Gleichmäßiges Bauen prüfen
    if (!this.canBuildEvenly(playerId, property.color, position, 'house')) {
      return { success: false, error: 'Häuser müssen gleichmäßig gebaut werden' };
    }

    // Prüfen ob das 4. Haus gebaut wird und automatisch zu Hotel werden soll
    const willBe4thHouse = buildings.houses === 3;
    
    if (willBe4thHouse) {
      // Prüfen ob Hotels verfügbar sind für automatische Umwandlung
      if (this.hotels <= 0) {
        return { success: false, error: 'Keine Hotels für automatische Umwandlung verfügbar' };
      }
      
      // Automatisch Hotel bauen (4. Haus wird sofort zu Hotel)
      player.removeMoney(property.houseCost);
      player.houses -= 3; // 3 bestehende Häuser + 1 neues = Hotel
      player.hotels++;
      this.houses += 3; // 3 Häuser zurück zur Bank (das neue wird nie hinzugefügt)
      this.hotels--;
      buildings.houses = 0;
      buildings.hotel = true;
      this.buildingsOnProperties.set(position, buildings);

      return { success: true, cost: property.houseCost, autoHotel: true };
    } else {
      // Normal Haus bauen (1-3 Häuser)
      player.removeMoney(property.houseCost);
      player.houses++;
      this.houses--;
      buildings.houses++;
      this.buildingsOnProperties.set(position, buildings);

      return { success: true, cost: property.houseCost, autoHotel: false };
    }
  }

  // Hotel bauen
  buildHotel(playerId, position) {
    const player = this.players.get(playerId);
    const property = this.board[position];

    if (!player || !property) {
      return { success: false, error: 'Spieler oder Grundstück nicht gefunden' };
    }

    if (property.type !== 'property') {
      return { success: false, error: 'Nur auf Grundstücken können Hotels gebaut werden' };
    }

    if (this.propertyOwnership.get(position) !== playerId) {
      return { success: false, error: 'Du besitzt dieses Grundstück nicht' };
    }

    if (this.mortgagedProperties.has(position)) {
      return { success: false, error: 'Auf hypothekisierten Grundstücken kann nicht gebaut werden' };
    }

    if (!this.hasMonopoly(playerId, property.color)) {
      return { success: false, error: 'Du benötigst ein Monopol um zu bauen' };
    }

    if (this.hotels <= 0) {
      return { success: false, error: 'Keine Hotels mehr verfügbar' };
    }

    if (player.money < property.houseCost) {
      return { success: false, error: 'Nicht genug Geld' };
    }

    const buildings = this.buildingsOnProperties.get(position) || { houses: 0, hotel: false };
    
    if (buildings.hotel) {
      return { success: false, error: 'Auf diesem Grundstück steht bereits ein Hotel' };
    }

    if (buildings.houses !== 4) {
      return { success: false, error: 'Ein Hotel benötigt 4 Häuser' };
    }

    // Gleichmäßiges Bauen prüfen
    if (!this.canBuildEvenly(playerId, property.color, position, 'hotel')) {
      return { success: false, error: 'Hotels müssen gleichmäßig gebaut werden' };
    }

    // Hotel bauen (4 Häuser werden zu 1 Hotel)
    player.removeMoney(property.houseCost);
    player.houses -= 4;
    player.hotels++;
    this.houses += 4; // Häuser zurück zur Bank
    this.hotels--;
    buildings.houses = 0;
    buildings.hotel = true;
    this.buildingsOnProperties.set(position, buildings);

    return { success: true, cost: property.houseCost };
  }

  // Gleichmäßiges Bauen prüfen
  canBuildEvenly(playerId, colorGroup, position, buildingType) {
    const groupProperties = [];
    this.propertyOwnership.forEach((ownerId, pos) => {
      if (ownerId === playerId && this.board[pos].color === colorGroup) {
        const buildings = this.buildingsOnProperties.get(pos) || { houses: 0, hotel: false };
        groupProperties.push({ position: pos, ...buildings });
      }
    });

    const currentBuildings = this.buildingsOnProperties.get(position) || { houses: 0, hotel: false };
    
    if (buildingType === 'house') {
      // Prüfe ob alle anderen Grundstücke mindestens so viele Häuser haben
      const minHouses = Math.min(...groupProperties.map(p => p.hotel ? 5 : p.houses));
      return currentBuildings.houses === minHouses;
    } else if (buildingType === 'hotel') {
      // Alle Grundstücke müssen 4 Häuser haben oder Hotels
      return groupProperties.every(p => p.houses === 4 || p.hotel);
    }

    return false;
  }

  // Haus verkaufen
  sellHouse(playerId, position) {
    const player = this.players.get(playerId);
    const property = this.board[position];

    if (!player || !property) {
      return { success: false, error: 'Spieler oder Grundstück nicht gefunden' };
    }

    if (this.propertyOwnership.get(position) !== playerId) {
      return { success: false, error: 'Du besitzt dieses Grundstück nicht' };
    }

    const buildings = this.buildingsOnProperties.get(position) || { houses: 0, hotel: false };
    
    if (buildings.houses === 0) {
      return { success: false, error: 'Keine Häuser zum Verkaufen vorhanden' };
    }

    // Gleichmäßiges Verkaufen prüfen
    if (!this.canSellEvenly(playerId, property.color, position, 'house')) {
      return { success: false, error: 'Häuser müssen gleichmäßig verkauft werden' };
    }

    // Haus verkaufen (halber Preis)
    const sellPrice = Math.floor(property.houseCost / 2);
    player.addMoney(sellPrice);
    player.houses--;
    this.houses++;
    buildings.houses--;
    this.buildingsOnProperties.set(position, buildings);

    return { success: true, sellPrice };
  }

  // Hotel verkaufen
  sellHotel(playerId, position) {
    const player = this.players.get(playerId);
    const property = this.board[position];

    if (!player || !property) {
      return { success: false, error: 'Spieler oder Grundstück nicht gefunden' };
    }

    if (this.propertyOwnership.get(position) !== playerId) {
      return { success: false, error: 'Du besitzt dieses Grundstück nicht' };
    }

    const buildings = this.buildingsOnProperties.get(position) || { houses: 0, hotel: false };
    
    if (!buildings.hotel) {
      return { success: false, error: 'Kein Hotel zum Verkaufen vorhanden' };
    }

    if (this.houses < 3) {
      return { success: false, error: `Hotel kann nicht verkauft werden - nur ${this.houses} Häuser in der Bank verfügbar (3 benötigt)` };
    }

    // Gleichmäßiges Verkaufen prüfen
    if (!this.canSellEvenly(playerId, property.color, position, 'hotel')) {
      return { success: false, error: 'Hotels müssen gleichmäßig verkauft werden' };
    }

    // Hotel verkaufen (halber Preis, wird zu 3 Häusern)
    const sellPrice = Math.floor(property.houseCost / 2);
    player.addMoney(sellPrice);
    player.hotels--;
    player.houses += 3;
    this.hotels++;
    this.houses -= 3;
    buildings.hotel = false;
    buildings.houses = 3;
    this.buildingsOnProperties.set(position, buildings);

    return { success: true, sellPrice };
  }

  // Gleichmäßiges Verkaufen prüfen
  canSellEvenly(playerId, colorGroup, position, buildingType) {
    const groupProperties = [];
    this.propertyOwnership.forEach((ownerId, pos) => {
      if (ownerId === playerId && this.board[pos].color === colorGroup) {
        const buildings = this.buildingsOnProperties.get(pos) || { houses: 0, hotel: false };
        groupProperties.push({ position: pos, ...buildings });
      }
    });

    const currentBuildings = this.buildingsOnProperties.get(position) || { houses: 0, hotel: false };
    
    if (buildingType === 'house') {
      // Prüfe ob alle anderen Grundstücke höchstens so viele Häuser haben
      const maxHouses = Math.max(...groupProperties.map(p => p.hotel ? 5 : p.houses));
      return currentBuildings.houses === maxHouses;
    } else if (buildingType === 'hotel') {
      // Hotels können verkauft werden wenn es das einzige Hotel ist oder alle haben Hotels
      const hotelsInGroup = groupProperties.filter(p => p.hotel).length;
      return hotelsInGroup === 1 || groupProperties.every(p => p.hotel);
    }

    return false;
  }

  // === HANDELSSYSTEM ===

  // Handelsangebot erstellen
  initiateTradeOffer(initiatorId, targetId, offer) {
    const initiator = this.players.get(initiatorId);
    const target = this.players.get(targetId);

    if (!initiator || !target) {
      return { success: false, error: 'Spieler nicht gefunden' };
    }

    if (initiatorId === targetId) {
      return { success: false, error: 'Kann nicht mit sich selbst handeln' };
    }

    // Validiere das Angebot
    const validation = this.validateTradeOffer(initiatorId, targetId, offer);
    if (!validation.success) {
      return validation;
    }

    // Erstelle Trade-Angebot
    const tradeId = ++this.tradeIdCounter;
    const tradeOffer = {
      id: tradeId,
      initiatorId,
      targetId,
      offer,
      status: 'pending',
      createdAt: Date.now()
    };

    this.activeTradeOffers.set(tradeId, tradeOffer);

    return { 
      success: true, 
      tradeId,
      tradeOffer 
    };
  }

  // Handelsangebot validieren
  validateTradeOffer(initiatorId, targetId, offer) {
    const initiator = this.players.get(initiatorId);
    const target = this.players.get(targetId);

    // Prüfe ob Initiator genug Geld hat
    if (offer.initiatorMoney > initiator.money) {
      return { success: false, error: 'Nicht genug Geld vorhanden' };
    }

    // Prüfe ob Target genug Geld hat
    if (offer.targetMoney > target.money) {
      return { success: false, error: 'Zielspieler hat nicht genug Geld' };
    }

    // Prüfe Grundstücke des Initiators
    for (const position of offer.initiatorProperties) {
      if (this.propertyOwnership.get(position) !== initiatorId) {
        return { success: false, error: `Du besitzt Grundstück ${position} nicht` };
      }

      // Prüfe ob Häuser/Hotels darauf stehen
      const buildings = this.buildingsOnProperties.get(position) || { houses: 0, hotel: false };
      if (buildings.houses > 0 || buildings.hotel) {
        return { success: false, error: `Grundstück ${position} hat Gebäude - erst abreißen` };
      }
    }

    // Prüfe Grundstücke des Targets
    for (const position of offer.targetProperties) {
      if (this.propertyOwnership.get(position) !== targetId) {
        return { success: false, error: `Zielspieler besitzt Grundstück ${position} nicht` };
      }

      // Prüfe ob Häuser/Hotels darauf stehen
      const buildings = this.buildingsOnProperties.get(position) || { houses: 0, hotel: false };
      if (buildings.houses > 0 || buildings.hotel) {
        return { success: false, error: `Grundstück ${position} hat Gebäude - erst abreißen` };
      }
    }

    // Mindestens eine Gegenleistung erforderlich
    const hasInitiatorOffer = offer.initiatorProperties.length > 0 || offer.initiatorMoney > 0;
    const hasTargetOffer = offer.targetProperties.length > 0 || offer.targetMoney > 0;
    
    if (!hasInitiatorOffer || !hasTargetOffer) {
      return { success: false, error: 'Beide Seiten müssen etwas anbieten' };
    }

    return { success: true };
  }

  // Handelsangebot annehmen
  acceptTradeOffer(tradeId, targetId) {
    const trade = this.activeTradeOffers.get(tradeId);
    
    if (!trade) {
      return { success: false, error: 'Handelsangebot nicht gefunden' };
    }

    if (trade.targetId !== targetId) {
      return { success: false, error: 'Du bist nicht der Zielspieler dieses Handels' };
    }

    if (trade.status !== 'pending') {
      return { success: false, error: 'Handelsangebot ist nicht mehr aktiv' };
    }

    // Nochmals validieren (falls sich etwas geändert hat)
    const validation = this.validateTradeOffer(trade.initiatorId, trade.targetId, trade.offer);
    if (!validation.success) {
      return validation;
    }

    // Handel durchführen
    const result = this.executeTradeOffer(trade);
    if (result.success) {
      trade.status = 'completed';
      this.activeTradeOffers.delete(tradeId);
    }

    return result;
  }

  // Handelsangebot ablehnen
  rejectTradeOffer(tradeId, targetId) {
    const trade = this.activeTradeOffers.get(tradeId);
    
    if (!trade) {
      return { success: false, error: 'Handelsangebot nicht gefunden' };
    }

    if (trade.targetId !== targetId) {
      return { success: false, error: 'Du bist nicht der Zielspieler dieses Handels' };
    }

    if (trade.status !== 'pending') {
      return { success: false, error: 'Handelsangebot ist nicht mehr aktiv' };
    }

    trade.status = 'rejected';
    this.activeTradeOffers.delete(tradeId);

    return { success: true };
  }

  // Handelsangebot abbrechen (durch Initiator)
  cancelTradeOffer(tradeId, initiatorId) {
    const trade = this.activeTradeOffers.get(tradeId);
    
    if (!trade) {
      return { success: false, error: 'Handelsangebot nicht gefunden' };
    }

    if (trade.initiatorId !== initiatorId) {
      return { success: false, error: 'Du bist nicht der Initiator dieses Handels' };
    }

    if (trade.status !== 'pending') {
      return { success: false, error: 'Handelsangebot ist nicht mehr aktiv' };
    }

    trade.status = 'cancelled';
    this.activeTradeOffers.delete(tradeId);

    return { success: true };
  }

  // Handel ausführen
  executeTradeOffer(trade) {
    const initiator = this.players.get(trade.initiatorId);
    const target = this.players.get(trade.targetId);
    const offer = trade.offer;

    try {
      // Geld transferieren
      if (offer.initiatorMoney > 0) {
        initiator.removeMoney(offer.initiatorMoney);
        target.addMoney(offer.initiatorMoney);
      }

      if (offer.targetMoney > 0) {
        target.removeMoney(offer.targetMoney);
        initiator.addMoney(offer.targetMoney);
      }

      // Grundstücke transferieren
      for (const position of offer.initiatorProperties) {
        this.transferProperty(position, trade.initiatorId, trade.targetId);
      }

      for (const position of offer.targetProperties) {
        this.transferProperty(position, trade.targetId, trade.initiatorId);
      }

      return { 
        success: true,
        trade: {
          initiator: initiator.name,
          target: target.name,
          offer
        }
      };

    } catch (error) {
      console.error('Fehler beim Ausführen des Handels:', error);
      return { success: false, error: 'Fehler beim Ausführen des Handels' };
    }
  }

  // Grundstück zwischen Spielern transferieren
  transferProperty(position, fromPlayerId, toPlayerId) {
    const fromPlayer = this.players.get(fromPlayerId);
    const toPlayer = this.players.get(toPlayerId);
    const property = this.board[position];

    if (!fromPlayer || !toPlayer || !property) {
      throw new Error('Transfer-Parameter ungültig');
    }

    // Ownership ändern
    this.propertyOwnership.set(position, toPlayerId);

    // Aus fromPlayer entfernen
    fromPlayer.removeProperty(property);

    // Zu toPlayer hinzufügen
    toPlayer.addProperty(property);

    // Hypothek wird übertragen
    // (Hypothekisierte Grundstücke bleiben hypothekisiert)
  }

  // Aktive Handelsangebote für einen Spieler abrufen
  getTradeOffersForPlayer(playerId) {
    const offers = [];
    this.activeTradeOffers.forEach(trade => {
      if (trade.targetId === playerId && trade.status === 'pending') {
        offers.push(trade);
      }
    });
    return offers;
  }

  // Alle aktiven Handelsangebote abrufen
  getAllActiveTradeOffers() {
    const offers = [];
    this.activeTradeOffers.forEach(trade => {
      if (trade.status === 'pending') {
        offers.push(trade);
      }
    });
    return offers;
  }

  // Grundstück hypothekarisieren
  mortgageProperty(playerId, position) {
    const player = this.players.get(playerId);
    const property = this.board[position];
    
    if (!player || !property) {
      return { success: false, error: 'Ungültige Parameter' };
    }

    if (this.mortgagedProperties.has(position)) {
      return { success: false, error: 'Grundstück ist bereits hypothekarisch belastet' };
    }

    if (this.propertyOwnership.get(position) !== playerId) {
      return { success: false, error: 'Du besitzt dieses Grundstück nicht' };
    }

    // Prüfe ob Gebäude auf Grundstück stehen
    const buildings = this.buildingsOnProperties.get(position);
    if (buildings && (buildings.houses > 0 || buildings.hotel)) {
      return { success: false, error: 'Grundstück hat Gebäude - verkaufe zuerst alle Häuser/Hotels' };
    }

    // Hypothekenwert = 50% des Kaufpreises
    const mortgageValue = Math.floor(property.price * 0.5);
    
    // Hypothek aufnehmen
    this.mortgagedProperties.add(position);
    player.addMoney(mortgageValue);

    return { 
      success: true, 
      mortgageValue,
      propertyName: property.name
    };
  }

  // Hypothek zurückkaufen
  unmortgageProperty(playerId, position) {
    const player = this.players.get(playerId);
    const property = this.board[position];
    
    if (!player || !property) {
      return { success: false, error: 'Ungültige Parameter' };
    }

    if (!this.mortgagedProperties.has(position)) {
      return { success: false, error: 'Grundstück ist nicht hypothekarisch belastet' };
    }

    if (this.propertyOwnership.get(position) !== playerId) {
      return { success: false, error: 'Du besitzt dieses Grundstück nicht' };
    }

    // Rückkaufpreis = 110% des Hypothekenwerts (10% Zinsen)
    const mortgageValue = Math.floor(property.price * 0.5);
    const unmortgagePrice = Math.floor(mortgageValue * 1.1);

    if (player.money < unmortgagePrice) {
      return { success: false, error: `Nicht genug Geld. Benötigt: ${unmortgagePrice}M, verfügbar: ${player.money}M` };
    }

    // Hypothek zurückkaufen
    player.removeMoney(unmortgagePrice);
    this.mortgagedProperties.delete(position);

    return { 
      success: true, 
      unmortgagePrice,
      propertyName: property.name
    };
  }

  // Verfügbare Liquidations-Optionen für Spieler sammeln
  getAvailableLiquidationOptions(playerId, requiredAmount) {
    const player = this.players.get(playerId);
    if (!player) return null;

    const options = {
      availableHouses: [],
      availableHotels: [],
      availableProperties: []
    };

    let idCounter = 1;

    // Häuser sammeln
    for (let prop of player.properties) {
      const buildings = this.buildingsOnProperties.get(prop.position);
      if (buildings && buildings.houses > 0) {
        for (let i = 0; i < buildings.houses; i++) {
          options.availableHouses.push({
            id: idCounter++,
            propertyPosition: prop.position,
            propertyName: prop.name,
            salePrice: Math.floor(prop.houseCost / 2) // Halber Preis
          });
        }
      }
    }

    // Hotels sammeln (nur wenn genug Häuser für Verkauf verfügbar)
    for (let prop of player.properties) {
      const buildings = this.buildingsOnProperties.get(prop.position);
      if (buildings && buildings.hotel && this.houses >= 3) {
        options.availableHotels.push({
          id: idCounter++,
          propertyPosition: prop.position,
          propertyName: prop.name,
          salePrice: Math.floor(prop.houseCost / 2) // Halber Preis
        });
      }
    }

    // Grundstücke für Hypotheken sammeln
    const allProperties = [...player.properties, ...player.railroads, ...player.utilities];
    for (let prop of allProperties) {
      if (!this.mortgagedProperties.has(prop.position)) {
        // Nur Grundstücke ohne Gebäude können hypothekarisiert werden
        const buildings = this.buildingsOnProperties.get(prop.position);
        if (!buildings || (buildings.houses === 0 && !buildings.hotel)) {
          options.availableProperties.push({
            id: idCounter++,
            position: prop.position,
            name: prop.name,
            mortgageValue: Math.floor(prop.price * 0.5)
          });
        }
      }
    }

    return options;
  }

  // Liquidations-Anfrage erstellen
  createLiquidationRequest(playerId, requiredAmount, reason) {
    const player = this.players.get(playerId);
    if (!player) return null;

    const availableOptions = this.getAvailableLiquidationOptions(playerId, requiredAmount);
    if (!availableOptions) return null;

    const liquidationId = ++this.liquidationIdCounter || 1;
    this.liquidationIdCounter = liquidationId;

    const liquidationData = {
      id: liquidationId,
      playerId,
      playerName: player.name,
      requiredAmount,
      availableMoney: player.money,
      shortfall: requiredAmount - player.money,
      reason,
      ...availableOptions,
      status: 'pending',
      createdAt: Date.now()
    };

    // In aktive Liquidationen speichern
    this.activeLiquidations.set(liquidationId, liquidationData);

    return liquidationData;
  }

  // Ausgewählte Liquidationen durchführen
  performSelectedLiquidations(liquidationId, selections) {
    const liquidation = this.activeLiquidations?.get(liquidationId);
    if (!liquidation || liquidation.status !== 'pending') {
      return { success: false, error: 'Liquidation nicht gefunden oder bereits verarbeitet' };
    }

    const player = this.players.get(liquidation.playerId);
    if (!player) {
      return { success: false, error: 'Spieler nicht gefunden' };
    }

    let amountRaised = 0;
    let liquidationLog = [];

    // Häuser verkaufen
    for (let houseId of selections.houses) {
      const house = liquidation.availableHouses.find(h => h.id === houseId);
      if (house) {
        const buildings = this.buildingsOnProperties.get(house.propertyPosition);
        if (buildings && buildings.houses > 0) {
          buildings.houses--;
          player.houses--;
          this.houses++;
          amountRaised += house.salePrice;
          liquidationLog.push(`Verkauft 1 Haus auf ${house.propertyName} für ${house.salePrice}M`);
        }
      }
    }

    // Hotels verkaufen
    for (let hotelId of selections.hotels) {
      const hotel = liquidation.availableHotels.find(h => h.id === hotelId);
      if (hotel) {
        const buildings = this.buildingsOnProperties.get(hotel.propertyPosition);
        if (buildings && buildings.hotel && this.houses >= 3) {
          buildings.hotel = false;
          buildings.houses = 3; // Hotel wird zu 3 Häusern (1 Haus-Wert verkauft)
          player.hotels--;
          player.houses += 3;
          this.hotels++;
          this.houses -= 3;
          amountRaised += hotel.salePrice;
          liquidationLog.push(`Verkauft Hotel auf ${hotel.propertyName} für ${hotel.salePrice}M (jetzt 3 Häuser)`);
        } else if (buildings && buildings.hotel && this.houses < 3) {
          liquidationLog.push(`Hotel auf ${hotel.propertyName} kann nicht verkauft werden - nur ${this.houses} Häuser verfügbar`);
        }
      }
    }

    // Hypotheken aufnehmen
    for (let propertyId of selections.properties) {
      const property = liquidation.availableProperties.find(p => p.id === propertyId);
      if (property) {
        if (!this.mortgagedProperties.has(property.position)) {
          this.mortgagedProperties.add(property.position);
          amountRaised += property.mortgageValue;
          liquidationLog.push(`Hypothek auf ${property.name} für ${property.mortgageValue}M`);
        }
      }
    }

    // Liquidiertes Geld dem Spieler gutschreiben
    player.addMoney(amountRaised);

    // Liquidation als abgeschlossen markieren
    liquidation.status = 'completed';
    liquidation.amountRaised = amountRaised;
    liquidation.liquidationLog = liquidationLog;

    console.log(`Interaktive Liquidation von ${player.name}:`, liquidationLog);
    console.log(`Aufgebracht: ${amountRaised}M von benötigten ${liquidation.requiredAmount}M`);
    console.log(`Spieler ${player.name} hat jetzt ${player.money}M`);

    return {
      success: player.money >= liquidation.requiredAmount,
      amountRaised,
      liquidationLog
    };
  }

  // Prüft ob Spieler liquidieren muss (neue interaktive Version)
  checkBankruptcy(playerId, requiredAmount, reason = 'Zahlung') {
    const player = this.players.get(playerId);
    if (!player) return { isBankrupt: false };

    // Hat Spieler genug Bargeld?
    if (player.money >= requiredAmount) {
      return { isBankrupt: false, canPay: true, hasEnoughCash: true };
    }

    // Prüfe ob theoretisch genug Vermögen vorhanden ist
    const availableOptions = this.getAvailableLiquidationOptions(playerId, requiredAmount);
    if (!availableOptions) {
      // Spieler ist sofort bankrott
      this.handlePlayerBankruptcy(playerId);
      return { isBankrupt: true };
    }

    // Berechne maximale Liquidationsmöglichkeiten
    let maxLiquidation = 0;
    maxLiquidation += availableOptions.availableHouses.reduce((sum, house) => sum + house.salePrice, 0);
    maxLiquidation += availableOptions.availableHotels.reduce((sum, hotel) => sum + hotel.salePrice, 0);
    maxLiquidation += availableOptions.availableProperties.reduce((sum, prop) => sum + prop.mortgageValue, 0);

    if (player.money + maxLiquidation < requiredAmount) {
      // Spieler ist wirklich bankrott - auch mit Liquidation nicht zahlbar
      this.handlePlayerBankruptcy(playerId);
      return { isBankrupt: true };
    }

    // Spieler muss liquidieren - interaktives Modal erforderlich
    return { 
      isBankrupt: false, 
      requiresLiquidation: true,
      requiredAmount,
      reason
    };
  }

  // Behandelt Spieler-Bankrott
  handlePlayerBankruptcy(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    console.log(`${player.name} ist bankrott und scheidet aus dem Spiel aus!`);
    
    // Spieler als bankrott markieren
    player.isBankrupt = true;
    player.money = 0;

    // Bereinige alle Grundstücke, Häuser und Hotels des Spielers
    this.clearPlayerProperties(playerId);

    // Listen leeren
    player.properties = [];
    player.railroads = [];
    player.utilities = [];

    // Prüfen ob Spiel beendet ist (nur noch 1 aktiver Spieler)
    const activePlayers = Array.from(this.players.values()).filter(p => !p.isBankrupt);
    if (activePlayers.length <= 1) {
      this.gamePhase = 'finished';
      if (activePlayers.length === 1) {
        console.log(`${activePlayers[0].name} gewinnt das Spiel!`);
      }
    }
  }

  // === AUKTIONS-SYSTEM ===

  // Auktion für Grundstück starten
  startPropertyAuction(position) {
    const property = this.board[position];
    
    if (!property || !['property', 'railroad', 'utility'].includes(property.type)) {
      return { success: false, error: 'Ungültiges Grundstück für Auktion' };
    }

    if (this.propertyOwnership.has(position)) {
      return { success: false, error: 'Grundstück ist bereits besessen' };
    }

    if (this.currentAuction) {
      return { success: false, error: 'Bereits eine Auktion aktiv' };
    }

    // Aktive Spieler (nicht bankrotte) bestimmen
    const activePlayers = Array.from(this.players.values())
      .filter(p => !p.isBankrupt)
      .map(p => p.id);

    this.auctionIdCounter++;
    this.currentAuction = {
      id: this.auctionIdCounter,
      position: position,
      property: property,
      currentBid: 10, // Startgebot 10M
      highestBidder: null,
      participants: activePlayers,
      hasPassedThisRound: new Set(),
      status: 'active',
      startTime: Date.now()
    };

    console.log(`Auktion für ${property.name} gestartet mit ${activePlayers.length} Teilnehmern`);
    return { success: true, auction: this.currentAuction };
  }

  // Gebot in Auktion abgeben
  placeBid(playerId, bidAmount) {
    if (!this.currentAuction || this.currentAuction.status !== 'active') {
      return { success: false, error: 'Keine aktive Auktion' };
    }

    const player = this.players.get(playerId);
    const auction = this.currentAuction;

    if (!player || player.isBankrupt) {
      return { success: false, error: 'Spieler nicht gefunden oder bankrott' };
    }

    if (!auction.participants.includes(playerId)) {
      return { success: false, error: 'Du nimmst nicht an dieser Auktion teil' };
    }

    if (auction.hasPassedThisRound.has(playerId)) {
      return { success: false, error: 'Du hast bereits gepasst in dieser Runde' };
    }

    // Validierungen
    if (bidAmount <= auction.currentBid) {
      return { success: false, error: `Gebot muss höher als ${auction.currentBid}M sein` };
    }

    if (player.money < bidAmount) {
      return { success: false, error: 'Nicht genug Geld für dieses Gebot' };
    }

    // Gebot akzeptieren
    auction.currentBid = bidAmount;
    auction.highestBidder = playerId;
    auction.hasPassedThisRound.clear(); // Reset für neue Runde

    console.log(`${player.name} bietet ${bidAmount}M für ${auction.property.name}`);
    return { success: true, auction: auction, bidder: player.name };
  }

  // In Auktion passen
  passAuction(playerId) {
    if (!this.currentAuction || this.currentAuction.status !== 'active') {
      return { success: false, error: 'Keine aktive Auktion' };
    }

    const player = this.players.get(playerId);
    const auction = this.currentAuction;

    if (!player) {
      return { success: false, error: 'Spieler nicht gefunden' };
    }

    if (!auction.participants.includes(playerId)) {
      return { success: false, error: 'Du nimmst nicht an dieser Auktion teil' };
    }

    // Spieler passt
    auction.hasPassedThisRound.add(playerId);
    console.log(`${player.name} passt in der Auktion für ${auction.property.name}`);

    // Prüfe ob alle anderen gepasst haben (nur Höchstbietender übrig)
    const activeBidders = auction.participants.filter(id => 
      !auction.hasPassedThisRound.has(id) && !this.players.get(id).isBankrupt
    );

    if (activeBidders.length <= 1 && auction.highestBidder) {
      // Auktion beenden - nur Höchstbietender übrig
      return this.endAuction();
    } else if (activeBidders.length === 0 && !auction.highestBidder) {
      // Alle haben gepasst, kein Gebot - Grundstück bleibt unverkauft
      return this.endAuction();
    }

    return { success: true, auction: auction, passed: true };
  }

  // Auktion beenden
  endAuction() {
    if (!this.currentAuction) {
      return { success: false, error: 'Keine aktive Auktion' };
    }

    const auction = this.currentAuction;
    auction.status = 'ended';

    let result = {
      success: true,
      auctionId: auction.id,
      property: auction.property,
      position: auction.position
    };

    if (auction.highestBidder && auction.currentBid > 0) {
      // Gewinner zahlt und bekommt Grundstück
      const winner = this.players.get(auction.highestBidder);
      winner.removeMoney(auction.currentBid);
      
      // Grundstück direkt zuweisen (ohne buyProperty da der Preis bereits abgezogen wurde)
      winner.addProperty(auction.property);
      this.propertyOwnership.set(auction.position, auction.highestBidder);
      
      result.winner = auction.highestBidder;
      result.winnerName = winner.name;
      result.finalPrice = auction.currentBid;
      result.sold = true;
      
      console.log(`Auktion beendet: ${winner.name} kauft ${auction.property.name} für ${auction.currentBid}M`);
    } else {
      // Kein Gewinner - Grundstück bleibt unverkauft
      result.winner = null;
      result.finalPrice = 0;
      result.sold = false;
      
      console.log(`Auktion beendet: ${auction.property.name} bleibt unverkauft`);
    }

    this.currentAuction = null;
    return result;
  }

  // Auktion-Status abrufen
  getAuctionStatus() {
    if (!this.currentAuction) {
      return null;
    }

    return {
      ...this.currentAuction,
      timeElapsed: Date.now() - this.currentAuction.startTime
    };
  }

  // Prüfen ob Spieler an Auktion teilnehmen kann
  canParticipateInAuction(playerId) {
    if (!this.currentAuction) return false;
    
    const player = this.players.get(playerId);
    return player && 
           !player.isBankrupt && 
           this.currentAuction.participants.includes(playerId) &&
           !this.currentAuction.hasPassedThisRound.has(playerId);
  }

  // Frei-Parken-Topf Funktionen
  addToFreeParkingPot(amount) {
    this.freeParkingPot += amount;
    console.log(`${amount}M zum Frei-Parken-Topf hinzugefügt. Topf jetzt: ${this.freeParkingPot}M`);
  }

  collectFreeParkingPot(playerId) {
    const player = this.players.get(playerId);
    if (!player) return 0;

    const amount = this.freeParkingPot;
    if (amount > 0) {
      player.addMoney(amount);
      this.freeParkingPot = 0;
      console.log(`${player.name} sammelt ${amount}M aus dem Frei-Parken-Topf ein`);
    }
    return amount;
  }

  getFreeParkingPot() {
    return this.freeParkingPot;
  }

  // Hilfsfunktion: Bereinigt alle Grundstücke, Häuser und Hotels eines Spielers
  clearPlayerProperties(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    console.log(`Bereinige alle Eigenschaften von ${player.name}...`);

    // Sammle alle Positionen des Spielers
    const allPlayerProperties = [
      ...player.properties.map(p => p.position),
      ...player.railroads.map(r => r.position), 
      ...player.utilities.map(u => u.position)
    ];

    // Entferne Häuser und Hotels von allen Grundstücken des Spielers
    allPlayerProperties.forEach(position => {
      const buildings = this.buildingsOnProperties.get(position);
      if (buildings) {
        // Häuser und Hotels zurück an Bank
        this.houses += buildings.houses;
        if (buildings.hotel) {
          this.hotels += 1;
        }
        
        // Entferne Gebäude von der Position
        this.buildingsOnProperties.delete(position);
        console.log(`Gebäude von Position ${position} entfernt: ${buildings.houses} Häuser, ${buildings.hotel ? '1 Hotel' : '0 Hotels'}`);
      }

      // Entferne Eigentumsrecht und Hypotheken
      this.propertyOwnership.delete(position);
      this.mortgagedProperties.delete(position);
    });

    // Aktualisiere Spieler-Zähler
    player.houses = 0;
    player.hotels = 0;

    console.log(`Bereinigung abgeschlossen. Verfügbare Häuser: ${this.houses}, verfügbare Hotels: ${this.hotels}`);
  }
}

module.exports = Game;