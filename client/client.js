/**
 * Monopoly Multiplayer Client
 * Hauptlogik für Frontend-Interaktion und WebSocket-Kommunikation
 */

class MonopolyClient {
  constructor() {
    console.log('MonopolyClient Constructor gestartet');
    this.socket = null;
    this.gameId = null;
    this.playerId = null;
    this.isHost = false;
    this.currentGameState = null;
    this.boardConfig = null; // Board-Konfiguration vom Server laden
    this.currentCard = null; // Aktuell gezogene Karte für Ausführung
    this.isAnimationRunning = false; // Anti-Spam Schutz für Animationen
    this.lastFreeParkingAmount = undefined; // Für Animationseffekte bei Topf-Änderungen
    
    // Audio-System initialisieren
    this.audioManager = getAudioManager();
    this.audioEnabled = true;
    
    console.log('Initialisiere DOM-Elemente...');
    this.initializeElements();
    console.log('Lade Board-Config...');
    this.loadBoardConfig(); // Board-Config vom Server laden
    console.log('Lade verfügbare Spiele...');
    this.loadAvailableGames(); // Verfügbare Spiele laden
    console.log('Binde Events...');
    this.bindEvents();
    console.log('Verbinde Socket...');
    this.connectSocket();
    console.log('MonopolyClient Constructor abgeschlossen');
  }

  // DOM-Elemente initialisieren
  initializeElements() {
    // Screens
    this.lobbyScreen = document.getElementById('lobby-screen');
    this.gameLobbyScreen = document.getElementById('game-lobby-screen');
    this.gameScreen = document.getElementById('game-screen');

    // Lobby Elements
    this.playerNameInput = document.getElementById('player-name');
    this.createGameBtn = document.getElementById('create-game-btn');
    this.joinGameBtn = document.getElementById('join-game-btn');
    this.gameIdInput = document.getElementById('game-id');
    this.gameIdInputDiv = document.getElementById('game-id-input');
    this.joinByIdBtn = document.getElementById('join-by-id-btn');
    this.cancelJoinBtn = document.getElementById('cancel-join-btn');

    // Available Games Elements
    this.availableGamesDiv = document.getElementById('available-games');
    this.gamesList = document.getElementById('games-list');
    this.refreshGamesBtn = document.getElementById('refresh-games-btn');

    // Game Lobby Elements
    this.gameIdDisplay = document.getElementById('game-id-display');
    this.copyGameIdBtn = document.getElementById('copy-game-id');
    this.playersListLobby = document.getElementById('players-list');
    this.playerCount = document.getElementById('player-count');
    this.startGameBtn = document.getElementById('start-game-btn');
    this.hostControls = document.getElementById('host-controls');
    this.leaveGameBtn = document.getElementById('leave-game-btn');

    // Color Selection Elements
    this.colorSelection = document.querySelector('.color-selection');
    this.selectedColor = null;

    // Piece Selection Elements  
    this.pieceSelection = document.querySelector('.piece-selection');
    this.selectedPiece = null;

    // Game Elements
    this.monopolyBoard = document.getElementById('monopoly-board');
    this.rollDiceBtn = document.getElementById('roll-dice-btn');
    this.dice1 = document.getElementById('dice1');
    this.dice2 = document.getElementById('dice2');
    this.currentPlayerDisplay = document.getElementById('current-player-display');
    this.playersInfo = document.getElementById('players-info');
    this.actionPanel = document.getElementById('action-panel');
    this.gameLog = document.getElementById('game-log');

    // Chat Elements
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.sendChatBtn = document.getElementById('send-chat-btn');

    // Modals
    this.buyPropertyModal = document.getElementById('buy-property-modal');
    this.cardModal = document.getElementById('card-modal');
    this.propertyManagementModal = document.getElementById('property-management-modal');
    this.tradeModal = document.getElementById('trade-modal');
    this.tradeOfferModal = document.getElementById('trade-offer-modal');
    this.auctionModal = document.getElementById('auction-modal');
    this.liquidationModal = document.getElementById('liquidation-modal');
    this.errorToast = document.getElementById('error-toast');
    this.successToast = document.getElementById('success-toast');

    // Liquidation State
    this.currentLiquidationData = null;
    this.selectedLiquidations = {
      houses: [],
      hotels: [],
      properties: []
    };
  }

  // Event-Listener binden
  bindEvents() {
    // Lobby Events
    this.createGameBtn.addEventListener('click', () => this.createGame());
    this.joinGameBtn.addEventListener('click', () => this.showJoinGameInput());
    this.joinByIdBtn.addEventListener('click', () => this.joinGameById());
    this.cancelJoinBtn.addEventListener('click', () => this.hideJoinGameInput());
    this.copyGameIdBtn.addEventListener('click', () => this.copyGameId());
    this.refreshGamesBtn.addEventListener('click', () => this.loadAvailableGames());

    // Game Lobby Events
    this.startGameBtn.addEventListener('click', () => this.startGame());
    this.leaveGameBtn.addEventListener('click', () => this.leaveGame());

    // Game Events
    this.rollDiceBtn.addEventListener('click', () => this.rollDice());

    // Modal Events
    document.getElementById('confirm-buy-btn').addEventListener('click', () => this.confirmBuyProperty());
    document.getElementById('decline-buy-btn').addEventListener('click', () => this.declineBuyProperty());
    document.getElementById('card-ok-btn').addEventListener('click', () => this.closeCardModal());
    document.getElementById('close-property-management').addEventListener('click', () => this.closePropertyManagement());

    // Handelssystem Events
    // Note: open-trade-btn wird in addTradeButton() sichtbar gemacht und Event-Listener hinzugefügt
    document.getElementById('close-trade-modal').addEventListener('click', () => this.closeTradeModal());
    document.getElementById('cancel-trade-modal').addEventListener('click', () => this.closeTradeModal());
    document.getElementById('send-trade-offer').addEventListener('click', () => this.sendTradeOffer());
    document.getElementById('accept-trade-offer').addEventListener('click', () => this.acceptTradeOffer());
    document.getElementById('reject-trade-offer').addEventListener('click', () => this.rejectTradeOffer());

    // Liquidation Events
    document.getElementById('confirm-liquidation').addEventListener('click', () => this.confirmLiquidation());
    document.getElementById('declare-bankruptcy').addEventListener('click', () => this.declareBankruptcy());

    // Color Selection Events
    this.setupColorSelectionEvents();

    // Piece Selection Events
    this.setupPieceSelectionEvents();

    // Toast Events
    document.querySelectorAll('.toast-close').forEach(btn => {
      btn.addEventListener('click', (e) => this.closeToast(e.target.parentNode));
    });

    // Enter-Taste für Inputs
    this.playerNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.createGame();
    });

    this.gameIdInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.joinGameById();
    });

    // Chat Events
    this.sendChatBtn.addEventListener('click', () => this.sendChatMessage());
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendChatMessage();
    });

    // Audio-System bei erstem User-Click initialisieren
    document.addEventListener('click', () => this.initializeAudioOnFirstClick(), { once: true });

    // Audio-Controls Setup
    this.setupAudioControls();
  }

  // Audio bei erstem User-Click aktivieren (Web Audio API Requirement)
  async initializeAudioOnFirstClick() {
    if (this.audioManager) {
      await this.audioManager.initialize();
      // Test-Sound abspielen
      this.audioManager.playButtonClick();
    }
  }

  // Audio-Controls Setup
  setupAudioControls() {
    const settingsToggle = document.getElementById('settingsToggle');
    const audioSettings = document.getElementById('audioSettings');
    const audioToggle = document.getElementById('audioToggle');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeDisplay = document.getElementById('volumeDisplay');
    const audioIcon = document.getElementById('audioIcon');

    let hideTimeout;

    // Settings Panel Toggle
    if (settingsToggle && audioSettings) {
      settingsToggle.addEventListener('click', () => {
        const isVisible = audioSettings.classList.contains('show');
        
        if (isVisible) {
          this.hideAudioSettings();
        } else {
          this.showAudioSettings();
        }
        
        // Feedback-Sound
        if (this.audioEnabled && this.audioManager) {
          this.audioManager.playButtonClick();
        }
      });

      // Auto-Hide nach 3 Sekunden Inaktivität
      const resetHideTimer = () => {
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
          this.hideAudioSettings();
        }, 3000);
      };

      // Event Listeners für Aktivität im Settings Panel
      audioSettings.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
      audioSettings.addEventListener('mouseleave', resetHideTimer);
      audioSettings.addEventListener('click', resetHideTimer);
    }

    // Audio Toggle Button
    if (audioToggle) {
      audioToggle.addEventListener('click', () => {
        this.audioEnabled = !this.audioEnabled;
        audioIcon.textContent = this.audioEnabled ? '🔊' : '🔇';
        audioToggle.classList.toggle('disabled', !this.audioEnabled);
        
        // Feedback-Sound für Toggle
        if (this.audioEnabled && this.audioManager) {
          this.audioManager.playButtonClick();
        }
      });
    }

    // Volume Slider
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const volume = parseInt(e.target.value);
        volumeDisplay.textContent = volume + '%';
        
        if (this.audioManager) {
          this.audioManager.setVolume(volume / 100);
        }
      });
    }
  }

  // Audio Settings anzeigen
  showAudioSettings() {
    const audioSettings = document.getElementById('audioSettings');
    if (audioSettings) {
      audioSettings.classList.add('show');
    }
  }

  // Audio Settings verstecken
  hideAudioSettings() {
    const audioSettings = document.getElementById('audioSettings');
    if (audioSettings) {
      audioSettings.classList.remove('show');
    }
  }

  // Socket.IO Verbindung
  connectSocket() {
    this.socket = io();
    
    // Verbindung hergestellt
    this.socket.on('connect', () => {
      console.log('Mit Server verbunden');
      this.playerId = this.socket.id;
      
      // Reset Animation-State bei Reconnect
      this.isAnimationRunning = false;
    });

    // Spiel erstellt
    this.socket.on('game_created', (data) => {
      this.gameId = data.gameId;
      this.isHost = data.isHost;
      this.currentGameState = data.gameState; // GameState setzen
      this.clearGameLog(); // Altes Spiellog löschen
      this.showGameLobby();
      this.updateGameIdDisplay();
      this.updateGameLobby(); // Spielerliste aktualisieren
      this.showSuccess('Spiel erfolgreich erstellt!');
      
      // Host-Steuerung anzeigen
      if (this.isHost) {
        this.hostControls.style.display = 'block';
      }
    });

    // Spiel beigetreten
    this.socket.on('game_joined', (data) => {
      this.gameId = data.gameId;
      this.isHost = data.isHost;
      this.currentGameState = data.gameState; // GameState setzen
      this.clearGameLog(); // Altes Spiellog löschen
      this.showGameLobby();
      this.updateGameIdDisplay();
      this.updateGameLobby(); // Spielerliste aktualisieren
      this.showSuccess('Spiel erfolgreich beigetreten!');
      
      // Host-Steuerung anzeigen falls Host
      if (this.isHost) {
        this.hostControls.style.display = 'block';
      }

      // Verfügbare Farben und Figuren laden
      this.requestAvailableColors();
      this.requestAvailablePieces();
    });

    // Spielstatus-Update
    this.socket.on('game_state_update', (gameState) => {
      this.currentGameState = gameState;
      
      // Je nachdem auf welchem Screen wir sind, verschiedene Updates
      if (this.gameLobbyScreen.classList.contains('active')) {
        this.updateGameLobby();
      } else if (this.gameScreen.classList.contains('active')) {
        this.updateGameUI();
      }
    });

    // Farbauswahl Events
    this.socket.on('available_colors', (data) => {
      const currentPlayer = this.currentGameState?.players?.find(p => p.id === this.playerId);
      this.updateColorSelection(data.colors, currentPlayer?.color);
    });

    this.socket.on('color_changed', (data) => {
      this.currentGameState = data.gameState;
      this.updateColorSelection(data.availableColors, 
        this.currentGameState.players.find(p => p.id === this.playerId)?.color);
      
      // UI in der Lobby aktualisieren
      if (this.gameLobbyScreen.classList.contains('active')) {
        this.updateGameLobby();
      }

      const changedPlayer = this.currentGameState.players.find(p => p.id === data.playerId);
      if (changedPlayer) {
        this.addLogEntry(`${changedPlayer.name} hat die Farbe zu ${this.getColorName(data.newColor)} geändert`);
      }
    });

    this.socket.on('color_change_error', (data) => {
      this.showError(`Farbwechsel fehlgeschlagen: ${data.message}`);
    });

    // Figurenauswahl Events
    this.socket.on('available_pieces', (data) => {
      const currentPlayer = this.currentGameState?.players?.find(p => p.id === this.playerId);
      this.updatePieceSelection(data.pieces, currentPlayer?.piece);
    });

    this.socket.on('piece_changed', (data) => {
      this.currentGameState = data.gameState;
      this.updatePieceSelection(data.availablePieces, 
        this.currentGameState.players.find(p => p.id === this.playerId)?.piece);
      
      // UI in der Lobby aktualisieren
      if (this.gameLobbyScreen.classList.contains('active')) {
        this.updateGameLobby();
      }

      const changedPlayer = this.currentGameState.players.find(p => p.id === data.playerId);
      if (changedPlayer) {
        this.addLogEntry(`${changedPlayer.name} hat die Spielfigur zu ${data.newPiece} geändert`);
      }
    });

    this.socket.on('piece_change_error', (data) => {
      this.showError(`Figurenwechsel fehlgeschlagen: ${data.message}`);
    });

    // Spiel gestartet
    this.socket.on('game_started', async (gameState) => {
      this.currentGameState = gameState;
      this.clearGameLog(); // Spiellog für neues Spiel zurücksetzen
      this.showGameScreen();
      await this.initializeBoard();
      this.updateGameUI();
      this.showSuccess('Spiel gestartet!');
    });

  // Würfel-Ergebnis
  this.socket.on('dice_rolled', (data) => {
    console.log('🎲 dice_rolled empfangen:', data);
    console.log('🔍 moveResult Details:', data.moveResult);
    
    // Spieler-Bewegung animieren falls Bewegung stattfand
    if (data.moveResult && data.moveResult.moved !== false) {
      console.log('🎬 Animation wird gestartet!');
      console.log('- oldPosition:', data.moveResult.oldPosition);
      console.log('- newPosition:', data.moveResult.newPosition);
      
      // Animation-Sperre aktivieren
      this.isAnimationRunning = true;
      console.log('🔒 Animation-Sperre aktiviert');
      
      // Sicherheits-Timeout: Sperre nach 3 Sekunden automatisch lösen
      setTimeout(() => {
        if (this.isAnimationRunning) {
          console.log('⚠️ Animation-Timeout erreicht - Sperre wird gelöst');
          this.isAnimationRunning = false;
          this.updateCurrentPlayer();
        }
      }, 3000);
      
      this.animatePlayerMovement(data.playerId, data.moveResult.oldPosition, data.moveResult.newPosition);
    } else {
      console.log('⏭️ Keine Bewegung - keine Animation');
      console.log('- moveResult:', data.moveResult);
    }
    
    this.currentGameState = data.gameState;
    this.showDiceRoll(data.dice); // Korrigiert: data.dice statt data.diceResult
    
    // UI Update mit oder ohne Positionen je nach Animation
    if (data.moveResult && data.moveResult.moved !== false) {
      console.log('🔄 updateGameUIWithoutPositions (wegen Schwebeanimation)');
      this.updateGameUIWithoutPositions();
      
      // Keine separaten Position-Updates nötig - Animation handled das bereits
    } else {
      console.log('🔄 updateGameUI (normal)');
      this.updateGameUI();
      
      // Keine Animation - Sperre direkt lösen falls sie gesetzt war
      this.isAnimationRunning = false;
    }
    
    if (data.fieldAction && data.fieldAction.length > 0) {
      // Feldaktionen erst nach Schwebeanimation starten
      setTimeout(() => {
        this.handleFieldActions(data.fieldAction);
      }, 2100); // NACH Animation-Sperre-Lösung (2000ms + Buffer)
    }
    
    // Korrekte Spieler-ID für Log verwenden
    const rollingPlayer = this.currentGameState.players.find(p => p.id === data.playerId);
    const playerName = rollingPlayer ? rollingPlayer.name : 'Unbekannt';
    console.log(`DEBUG: ${playerName} ist jetzt auf Position ${rollingPlayer?.position}`);
    this.addLogEntry(`${playerName} würfelt ${data.dice.dice1} + ${data.dice.dice2} = ${data.dice.sum}`);
    
    // LOS-Geld prüfen
    if (data.moveResult && data.moveResult.passedGo) {
      // Audio-Feedback für Geld erhalten
      if (this.audioManager && this.audioEnabled) {
        this.audioManager.playMoneySound(200);
      }
      this.addLogEntry(`🎉 ${playerName} kommt über Los und erhält 200M!`);
      this.showSuccess(`${playerName} erhält 200M für Los passieren!`);
    }
    
    if (data.dice.goToJail) {
      // Audio-Feedback für Gefängnis
      if (this.audioManager && this.audioEnabled) {
        this.audioManager.playJailSound();
      }
      this.addLogEntry(`${playerName} muss ins Gefängnis!`);
    }
    
    if (data.dice.isDouble) {
      this.addLogEntry(`${playerName} hat einen Pasch gewürfelt und darf nochmal!`);
    }
  });    // Buy-Offer nur für aktuellen Spieler
    this.socket.on('buy_offer', (data) => {
      console.log('DEBUG: buy_offer Event erhalten!', data);
      this.showBuyPropertyModal(data.property);
    });

    // Grundstück gekauft
    this.socket.on('property_bought', (data) => {
      this.currentGameState = data.gameState;
      this.updateGameUI();
      this.closeBuyPropertyModal();
      const playerName = this.getPlayerName(data.playerId);
      this.addLogEntry(`${playerName} kauft ${this.getBoardField(data.position).name}`);
      this.showSuccess('Grundstück gekauft!');
    });

    // Zug beendet
    this.socket.on('turn_ended', (data) => {
      this.currentGameState = data.gameState;
      this.updateGameUI();
      this.addLogEntry(`${data.nextPlayer.name} ist jetzt am Zug`);
    });

    // Karte gezogen (nur für aktuellen Spieler)
    this.socket.on('card_drawn', (data) => {
      // Audio-Feedback für Karte ziehen
      if (this.audioManager && this.audioEnabled) {
        this.audioManager.playCardDraw();
      }
      this.currentGameState = data.gameState;
      this.updateGameUI();
      this.showCardModal(data.card);
      this.addLogEntry(`Du ziehst eine ${data.card.type === 'chance' ? 'Ereignis' : 'Gemeinschafts'}karte: ${data.card.text}`);
    });

  // Kartenaktion ausgeführt
  this.socket.on('card_action_executed', (data) => {
    console.log('DEBUG: card_action_executed empfangen:', data);
    
    // Prüfe auf Bewegung durch Karte (für alle Spieler für UI-Update)
    let hasMovement = false;
    if (data.result && data.result.results) {
      data.result.results.forEach(result => {
        // Prüfe auf alle Arten von Bewegungen: normale Bewegung, Gefängnis, oder Freibrief-Nutzung
        if ((result.type === 'move' || result.type === 'jail' || result.type === 'jail_free_card_used') && 
            result.moved && result.oldPosition !== undefined && result.newPosition !== undefined) {
          hasMovement = true;
          
          // Animation NUR für den betroffenen Spieler ausführen
          if (data.playerId === this.socket.id) {
            console.log('🎬 Bewegung durch Karte erkannt - animiere von', result.oldPosition, 'zu', result.newPosition);
            
            // Animation-Sperre für Kartenanimation
            this.isAnimationRunning = true;
            console.log('🔒 Animation-Sperre aktiviert (Karte)');
            
            // Sicherheits-Timeout auch für Kartenanimationen
            setTimeout(() => {
              if (this.isAnimationRunning) {
                console.log('⚠️ Kartenanimation-Timeout erreicht - Sperre wird gelöst');
                this.isAnimationRunning = false;
                this.updateCurrentPlayer();
              }
            }, 3000);
            
            this.animatePlayerMovement(data.playerId, result.oldPosition, result.newPosition);
          } else {
            console.log('🎬 Andere Spieler Kartenbewegung - keine Animation für mich');
          }
        }
      });
    }
    
    this.currentGameState = data.gameState;
    
    // UI Update mit oder ohne Positionen
    if (hasMovement) {
      this.updateGameUIWithoutPositions();
    } else {
      this.updateGameUI();
    }
    
    // Log-Eintrag für Kartenaktion
    if (data.result && data.result.results) {
      data.result.results.forEach(result => {
        if (result.type === 'move' || result.type === 'jail' || result.type === 'jail_free_card_used') {
          console.log('DEBUG: Bewegung durch Karte erkannt:', result.type);
          const playerName = this.getPlayerName(data.playerId);
          if (result.type === 'jail') {
            this.addLogEntry(`${playerName} wird ins Gefängnis geschickt!`);
          } else if (result.type === 'jail_free_card_used') {
            this.addLogEntry(`${playerName} würde ins Gefängnis gehen, nutzt aber Freibrief!`);
          } else {
            this.addLogEntry(`${playerName} wird durch Karte bewegt`);
          }
        }
      });
    }
  });    // Neue Feldaktionen nach Kartenbewegung
    this.socket.on('field_actions', (data) => {
      this.currentGameState = data.gameState;
      this.updateGameUI();
      this.handleFieldActions(data.actions);
    });

    // Freibrief verwendet
    this.socket.on('jail_free_card_used', (data) => {
      this.currentGameState = data.gameState;
      this.updateGameUI();
      this.addLogEntry(`🎫 ${data.message}`);
      this.showSuccess('Freibrief verwendet! Du bist frei!');
    });

    // Haus gebaut
    this.socket.on('house_built', (data) => {
      this.currentGameState = data.gameState;
      this.updateGameUI();
      const playerName = this.getPlayerName(data.playerId);
      this.addLogEntry(`🏠 ${playerName} baut ein Haus für ${data.cost}M`);
      this.showSuccess('Haus gebaut!');
    });

    // Hotel gebaut
    this.socket.on('hotel_built', (data) => {
      this.currentGameState = data.gameState;
      this.updateGameUI();
      const playerName = this.getPlayerName(data.playerId);
      this.addLogEntry(`🏨 ${playerName} baut ein Hotel für ${data.cost}M`);
      this.showSuccess('Hotel gebaut!');
    });

    // Haus verkauft
    this.socket.on('house_sold', (data) => {
      this.currentGameState = data.gameState;
      this.updateGameUI();
      const playerName = this.getPlayerName(data.playerId);
      this.addLogEntry(`🏠💰 ${playerName} verkauft ein Haus für ${data.sellPrice}M`);
      this.showSuccess('Haus verkauft!');
    });

    // Hotel verkauft
    this.socket.on('hotel_sold', (data) => {
      this.currentGameState = data.gameState;
      this.updateGameUI();
      const playerName = this.getPlayerName(data.playerId);
      this.addLogEntry(`🏨💰 ${playerName} verkauft ein Hotel für ${data.sellPrice}M`);
      this.showSuccess('Hotel verkauft!');
    });

    // Spielereignisse (Miete, Steuern, Kartenaktionen etc.)
    this.socket.on('game_event', (data) => {
      this.addLogEntry(data.message);
    });

    // === HYPOTHEKEN-EVENTS ===

    // Grundstück hypothekarisiert
    this.socket.on('property_mortgaged', (data) => {
      this.currentGameState = data.gameState;
      this.updateGameUI();
      if (data.playerId === this.playerId) {
        this.showSuccess(`Hypothek von ${data.mortgageValue}M aufgenommen!`);
      }
    });

    // Hypothek zurückgekauft
    this.socket.on('property_unmortgaged', (data) => {
      this.currentGameState = data.gameState;
      this.updateGameUI();
      if (data.playerId === this.playerId) {
        this.showSuccess(`Hypothek für ${data.unmortgagePrice}M zurückgekauft!`);
      }
    });

    // === ENDE HYPOTHEKEN-EVENTS ===

    // Spieler verlassen
    this.socket.on('player_left', (data) => {
      this.currentGameState = data.gameState;
      if (this.lobbyScreen.classList.contains('active')) {
        this.updateGameLobby();
      } else {
        this.updateGameUI();
      }
      this.showError('Ein Spieler hat das Spiel verlassen');
    });



    // Spieler hat aufgegeben
    this.socket.on('player_surrendered', (data) => {
      console.log('🏳️ Spieler hat aufgegeben:', data);
      
      this.currentGameState = data.gameState;
      this.updateGameUI();
      
      // Log-Eintrag hinzufügen
      this.addLogEntry(`🏳️ ${data.playerName} hat das Spiel aufgegeben!`);
      
      // Toast-Nachricht anzeigen
      this.showInfo(`${data.playerName} hat das Spiel aufgegeben`);
      
      // Audio-Feedback
      if (this.audioEnabled && this.audioManager) {
        this.audioManager.playError();
      }
    });

    // Zurück zur Lobby nach Aufgabe
    this.socket.on('redirect_to_lobby', (data) => {
      console.log('🔄 Zurück zur Lobby:', data);
      
      // Zur Lobby wechseln
      this.showScreen('lobby');
      
      // Nachricht anzeigen
      if (data.message) {
        setTimeout(() => {
          this.showInfo(data.message);
        }, 500);
      }
    });

    // Fehler
    this.socket.on('error', (data) => {
      this.showError(data.message);
      
      // Button wieder freigeben bei Server-Fehler (z.B. bereits gewürfelt)
      console.log('🔓 Button wieder freigegeben nach Server-Fehler');
      this.updateCurrentPlayer(); // Re-evaluiert Button-Status basierend auf aktuellem Spielzustand
    });

    // === HANDELSSYSTEM SOCKET-EVENTS ===

    // Handelsangebot erhalten
    this.socket.on('trade_offer_received', (data) => {
      this.showTradeOfferReceived(data);
    });

    // Handelsangebot gesendet (Bestätigung)
    this.socket.on('trade_offer_sent', (data) => {
      this.showSuccess(`Handelsangebot an ${data.target} gesendet`);
    });

    // Handel abgeschlossen
    this.socket.on('trade_completed', (data) => {
      this.showSuccess(`🤝 Handel mit ${data.trade.target} abgeschlossen!`);
      this.currentGameState = data.gameState;
      this.updateGameUI(); // Korrekte Funktion aufrufen
      this.closeTradeModal();
    });

    // Handelsangebot abgelehnt
    this.socket.on('trade_offer_rejected', (data) => {
      this.showError(`Handelsangebot von ${data.rejectedBy} abgelehnt`);
    });

    // Handelsangebot abgebrochen
    this.socket.on('trade_offer_cancelled', (data) => {
      this.showError(`Handelsangebot von ${data.cancelledBy} abgebrochen`);
    });

    // === LIQUIDATIONS-SYSTEM SOCKET EVENTS ===

    // Liquidation erforderlich
    this.socket.on('liquidation_required', (data) => {
      this.showLiquidationModal(data);
    });

    // Liquidation abgeschlossen
    this.socket.on('liquidation_completed', (data) => {
      this.currentGameState = data.gameState;
      this.updateGameUI();
      this.closeLiquidationModal();
      this.showSuccess(`Liquidation erfolgreich: ${data.amountRaised}M aufgebracht`);
    });

    // === AUKTIONS-SYSTEM SOCKET EVENTS ===

    // Auktion gestartet
    this.socket.on('auction_started', (data) => {
      // Audio-Feedback für Auktionsstart
      if (this.audioManager && this.audioEnabled) {
        this.audioManager.playAuctionGong();
      }
      this.currentGameState = data.gameState;
      this.updateGameUI();
      this.showAuctionModal(data.auction);
      this.addLogEntry(`🔨 Auktion für ${data.auction.property.name} gestartet!`);
    });

    // Gebot abgegeben
    this.socket.on('bid_placed', (data) => {
      this.currentGameState = data.gameState;
      this.updateAuctionDisplay(data.auction);
      this.addLogEntry(`💰 ${data.bidder} bietet ${data.bidAmount}M`);
    });

    // Spieler hat gepasst
    this.socket.on('player_passed_auction', (data) => {
      this.currentGameState = data.gameState;
      this.updateAuctionDisplay(data.auction);
      this.addLogEntry(`${data.player} passt in der Auktion`);
    });

    // Auktion beendet
    this.socket.on('auction_ended', (data) => {
      this.currentGameState = data.gameState;
      this.updateGameUI();
      this.closeAuctionModal();
      
      if (data.result.sold) {
        this.addLogEntry(`🎉 ${data.result.winnerName} gewinnt ${data.result.property.name} für ${data.result.finalPrice}M!`);
        this.showSuccess(`Auktion beendet! ${data.result.winnerName} kauft für ${data.result.finalPrice}M`);
      } else {
        this.addLogEntry(`🔨 Auktion für ${data.result.property.name} beendet - kein Verkauf`);
        this.showInfo('Auktion beendet - Grundstück bleibt unverkauft');
      }
    });

    // === CHAT SYSTEM ===
    
    // Chat-Nachricht empfangen
    this.socket.on('chat_message', (data) => {
      this.addChatMessage(data.sender, data.message, data.timestamp, data.senderId === this.socket.id);
    });

    // === ENDE AUKTIONS-SYSTEM ===

    // Verbindung getrennt
    this.socket.on('disconnect', () => {
      this.showError('Verbindung zum Server verloren');
      this.resetToLobby();
    });
  }

  // Spiel erstellen
  createGame() {
    console.log('createGame() wurde aufgerufen');
    const playerName = this.playerNameInput.value.trim();
    console.log('Spielername:', playerName);
    
    if (!playerName) {
      console.log('Kein Spielername eingegeben');
      this.showError('Bitte gib einen Spielernamen ein');
      return;
    }

    console.log('Socket verfügbar:', !!this.socket);
    console.log('Socket verbunden:', this.socket && this.socket.connected);
    
    if (!this.socket || !this.socket.connected) {
      this.showError('Keine Verbindung zum Server');
      return;
    }

    console.log('Sende create_game Event');
    this.socket.emit('create_game', { playerName });
  }

  // Spiel-Beitritt Input anzeigen
  showJoinGameInput() {
    this.gameIdInputDiv.style.display = 'block';
    this.createGameBtn.style.display = 'none';
    this.joinGameBtn.style.display = 'none';
  }

  // Spiel-Beitritt Input verstecken
  hideJoinGameInput() {
    this.gameIdInputDiv.style.display = 'none';
    this.createGameBtn.style.display = 'inline-block';
    this.joinGameBtn.style.display = 'inline-block';
  }

  // Spiel per ID beitreten
  joinGameById() {
    const playerName = this.playerNameInput.value.trim();
    const gameId = this.gameIdInput.value.trim();

    if (!playerName) {
      this.showError('Bitte gib einen Spielernamen ein');
      return;
    }

    if (!gameId) {
      this.showError('Bitte gib eine Spiel-ID ein');
      return;
    }

    this.socket.emit('join_game', { gameId, playerName });
  }

  // Spiel-ID kopieren
  copyGameId() {
    if (navigator.clipboard && this.gameId) {
      navigator.clipboard.writeText(this.gameId).then(() => {
        this.showSuccess('Spiel-ID kopiert!');
      });
    }
  }

  // Spiel-Lobby anzeigen
  showGameLobby() {
    this.lobbyScreen.classList.remove('active');
    this.gameLobbyScreen.classList.add('active');
    this.gameScreen.classList.remove('active');

    // Host-Steuerung anzeigen falls Host
    if (this.isHost) {
      this.hostControls.style.display = 'block';
    }
    
    // Falls bereits Gamestate vorhanden, Lobby sofort aktualisieren
    if (this.currentGameState) {
      this.updateGameLobby();
    }
  }

  // Spiel-ID Display aktualisieren
  updateGameIdDisplay() {
    if (this.gameId) {
      this.gameIdDisplay.textContent = `Spiel-ID: ${this.gameId}`;
    }
  }

  // Spiellobby aktualisieren
  updateGameLobby() {
    if (!this.currentGameState) {
      console.log('Keine GameState verfügbar für Lobby-Update');
      return;
    }

    console.log('Aktualisiere Lobby mit', this.currentGameState.players.length, 'Spielern');

    // Spieleranzahl
    this.playerCount.textContent = this.currentGameState.players.length;

    // Spielerliste
    this.playersListLobby.innerHTML = '';
    this.currentGameState.players.forEach(player => {
      const playerItem = document.createElement('div');
      playerItem.className = 'player-item';
      
      // Host hervorheben
      if (player.id === this.currentGameState.hostPlayerId) {
        playerItem.classList.add('host');
      }

      playerItem.innerHTML = `
        <div class="player-avatar">
          <div class="player-color color-${player.color}"></div>
          <div class="player-piece">${player.piece || '🎩'}</div>
        </div>
        <span class="player-name">${player.name}</span>
        ${player.id === this.currentGameState.hostPlayerId ? '<span class="player-badge">HOST</span>' : ''}
      `;

      this.playersListLobby.appendChild(playerItem);
    });

    // Farbauswahl und Figurenauswahl aktualisieren
    this.requestAvailableColors();
    this.requestAvailablePieces();

    // Start-Button aktivieren/deaktivieren (nur für Host)
    if (this.isHost) {
      const canStart = this.currentGameState.players.length >= 2;
      this.startGameBtn.disabled = !canStart;
      
      const infoText = this.hostControls.querySelector('.info-text');
      if (infoText) {
        infoText.textContent = canStart ? 
          `Bereit zum Start mit ${this.currentGameState.players.length} Spielern` : 
          'Mindestens 2 Spieler erforderlich';
      }
    }
  }

  // Spiel starten
  startGame() {
    this.socket.emit('start_game');
  }

  // Spiel verlassen
  leaveGame() {
    this.resetToLobby();
    this.socket.disconnect();
    this.connectSocket();
  }

  // Verfügbare Spiele laden
  async loadAvailableGames() {
    try {
      this.gamesList.innerHTML = '<div class="loading-message">Lade Spiele...</div>';
      
      const response = await fetch('/games');
      const games = await response.json();
      
      this.displayAvailableGames(games);
    } catch (error) {
      console.error('Fehler beim Laden der Spiele:', error);
      this.gamesList.innerHTML = '<div class="loading-message">Fehler beim Laden der Spiele</div>';
    }
  }

  // Verfügbare Spiele anzeigen
  displayAvailableGames(games) {
    if (games.length === 0) {
      this.gamesList.innerHTML = `
        <div class="no-games-message">
          <h3>🎮 Keine offenen Spiele</h3>
          <p>Erstelle ein neues Spiel oder warte, bis andere Spieler Spiele erstellen!</p>
        </div>
      `;
      return;
    }

    this.gamesList.innerHTML = games.map(game => this.createGameCard(game)).join('');
    
    // Event-Listener für Spiel-Karten hinzufügen
    this.gamesList.querySelectorAll('.game-card:not(.full)').forEach(card => {
      card.addEventListener('click', () => {
        const gameId = card.dataset.gameId;
        this.joinSpecificGame(gameId);
      });
    });
  }

  // Game-Card HTML erstellen
  createGameCard(game) {
    const isFull = game.playerCount >= game.maxPlayers;
    const statusText = game.gamePhase === 'waiting' ? 'Wartend' : 
                      game.gamePhase === 'playing' ? 'Läuft' : 'Voll';
    const statusClass = game.gamePhase === 'waiting' ? 'waiting' : 
                       game.gamePhase === 'playing' ? 'playing' : 'full';

    return `
      <div class="game-card ${isFull ? 'full' : ''}" data-game-id="${game.id}">
        <div class="game-card-header">
          <div class="game-id">${game.id.substring(0, 8)}</div>
          <div class="game-status ${statusClass}">${statusText}</div>
        </div>
        <div class="game-info-row">
          <span>Host:</span>
          <span class="game-host">${game.hostName}</span>
        </div>
        <div class="game-info-row">
          <span>Spieler:</span>
          <span>${game.playerCount}/${game.maxPlayers}</span>
        </div>
        ${!isFull ? '<div style="margin-top: 1rem; text-align: center; color: var(--primary-color); font-weight: bold;">👆 Klicken zum Beitreten</div>' : ''}
      </div>
    `;
  }

  // Bestimmtem Spiel beitreten
  joinSpecificGame(gameId) {
    const playerName = this.playerNameInput.value.trim();
    
    if (!playerName) {
      this.showError('Bitte gib deinen Namen ein!');
      this.playerNameInput.focus();
      return;
    }

    console.log(`Trete Spiel ${gameId} bei als ${playerName}`);
    this.socket.emit('join_game', { gameId, playerName });
  }

  // Zurück zur Lobby
  resetToLobby() {
    this.lobbyScreen.classList.add('active');
    this.gameLobbyScreen.classList.remove('active');
    this.gameScreen.classList.remove('active');
    this.gameId = null;
    this.isHost = false;
    this.currentGameState = null;
  }

  // Spielbildschirm anzeigen
  showGameScreen() {
    this.lobbyScreen.classList.remove('active');
    this.gameLobbyScreen.classList.remove('active');
    this.gameScreen.classList.add('active');
  }

  // Spielbrett initialisieren
  async initializeBoard() {
    // Warte auf Board-Konfiguration falls noch nicht geladen
    if (!this.boardConfig) {
      await this.loadBoardConfig();
    }
    this.createBoardFields();
    this.updateGameUI();
  }

  // Spielfelder erstellen
  createBoardFields() {
    const boardFields = this.getBoardConfig();
    
    // Seiten des Spielbretts
    const sides = {
      bottom: this.monopolyBoard.querySelector('.side-bottom'),
      left: this.monopolyBoard.querySelector('.side-left'),
      top: this.monopolyBoard.querySelector('.side-top'),
      right: this.monopolyBoard.querySelector('.side-right')
    };

    // Felder zu Seiten zuordnen (entsprechend CSS flex-direction)
    const sideFields = {
      bottom: boardFields.slice(1, 10).reverse(),   // 9-1 wegen flex-direction: row (links→rechts)
      left: boardFields.slice(11, 20).reverse(),    // 19-11 wegen flex-direction: column (oben→unten) aber Monopoly ist unten→oben
      top: boardFields.slice(21, 30).reverse(),     // 29-21, da row-reverse die Reihenfolge umdreht
      right: boardFields.slice(31, 40).reverse()    // 39-31 wegen flex-direction: column-reverse, aber wir wollen 31-39
    };

    // Felder erstellen
    Object.entries(sideFields).forEach(([sideName, fields]) => {
      const sideElement = sides[sideName];
      sideElement.innerHTML = '';

      fields.forEach(field => {
        const fieldElement = this.createFieldElement(field);
        sideElement.appendChild(fieldElement);
      });
    });
  }

  // Einzelnes Spielfeld Element erstellen
  createFieldElement(field) {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'board-field';
    fieldDiv.dataset.position = field.position;
    
    let headerClass = '';
    if (field.color && field.type === 'property') {
      headerClass = field.color;
    } else if (field.type === 'railroad') {
      headerClass = 'railroad';
    } else if (field.type === 'utility') {
      headerClass = 'utility';
    }

    // Bestimme ob das Feld vertikal (links/rechts) ist
    const isVertical = field.position >= 11 && field.position <= 19 || field.position >= 31 && field.position <= 39;
    
    if (isVertical) {
      // Vertikale Felder (links und rechts) - Farbe seitlich
      fieldDiv.innerHTML = `
        ${headerClass ? `<div class="field-header ${headerClass}"></div>` : ''}
        <div class="field-content">
          <div class="field-name">${field.name}</div>
          ${field.price > 0 ? `<div class="field-price">${field.price}M</div>` : ''}
        </div>
        <div class="field-buildings"></div>
        <div class="field-players"></div>
      `;
    } else {
      // Horizontale Felder (oben und unten) - Farbe oben
      fieldDiv.innerHTML = `
        ${headerClass ? `<div class="field-header ${headerClass}"></div>` : ''}
        <div class="field-content">
          <div class="field-name">${field.name}</div>
          ${field.price > 0 ? `<div class="field-price">${field.price}M</div>` : ''}
        </div>
        <div class="field-buildings"></div>
        <div class="field-players"></div>
      `;
    }

    // Click-Handler für kaufbare Felder
    if (['property', 'railroad', 'utility'].includes(field.type)) {
      fieldDiv.addEventListener('click', () => this.handleFieldClick(field));
    }

    return fieldDiv;
  }

  // Feld-Click Handler
  handleFieldClick(field) {
    console.log('DEBUG: handleFieldClick aufgerufen für:', field.name);
    
    if (!this.currentGameState) {
      console.log('FEHLER: Kein currentGameState verfügbar');
      return;
    }
    
    const ownership = this.currentGameState.propertyOwnership[field.position];
    console.log('DEBUG: Ownership Check:');
    console.log('- Field Position:', field.position);
    console.log('- Ownership:', ownership);
    console.log('- My Player ID:', this.playerId);
    console.log('- Is mine?', ownership === this.playerId);
    console.log('- Field Type:', field.type);
    
    if (ownership) {
      const owner = this.currentGameState.players.find(p => p.id === ownership);
      console.log('DEBUG: Ownership gefunden für', field.name);
      console.log('- owner:', owner?.name);
      console.log('- ownership === this.playerId:', ownership === this.playerId);
      console.log('- field.type:', field.type);
      console.log('- field.type === "property":', field.type === 'property');
      
      if (ownership === this.playerId && field.type === 'property') {
        console.log('DEBUG: Eigenes Grundstück erkannt - öffne Property Management');
        // Eigenes Grundstück - Property Management öffnen
        this.showPropertyManagement(field);
      } else {
        console.log('DEBUG: Grundstück gehört anderem Spieler oder ist kein Property:', owner?.name);
        this.showInfo(`${field.name} gehört ${owner ? owner.name : 'Unbekannt'}`);
      }
    } else {
      console.log('DEBUG: Grundstück ist verfügbar');
      this.showInfo(`${field.name} ist verfügbar für ${field.price}M`);
    }
  }

  // Würfeln
  rollDice() {
    // Audio-Feedback für Würfelwurf
    if (this.audioManager && this.audioEnabled) {
      this.audioManager.playDiceRoll();
    }

    // Anti-Spam Schutz: Verhindere mehrfaches Würfeln während Animation
    if (this.isAnimationRunning) {
      console.log('⚠️ Würfeln gesperrt - Animation läuft noch');
      this.showError('Bitte warte bis die Animation fertig ist');
      return;
    }
    
    // SOFORTIGER ANTI-CHEAT: Prüfe ob Button bereits disabled ist
    if (this.rollDiceBtn.disabled) {
      console.log('⚠️ Würfeln gesperrt - Button ist bereits deaktiviert');
      this.showError('Du hast bereits gewürfelt oder bist nicht am Zug');
      return;
    }
    
    // SOFORT Button sperren um weitere Klicks zu verhindern
    this.rollDiceBtn.disabled = true;
    console.log('🔒 Button sofort gesperrt beim Würfel-Request');
    
    this.socket.emit('roll_dice');
  }

  // Würfel-Animation anzeigen
  showDiceRoll(diceResult) {
    this.dice1.classList.add('rolling');
    this.dice2.classList.add('rolling');

    setTimeout(() => {
      this.dice1.textContent = diceResult.dice1;
      this.dice2.textContent = diceResult.dice2;
      this.dice1.classList.remove('rolling');
      this.dice2.classList.remove('rolling');
    }, 500);
  }

  // Spiel-UI aktualisieren
  updateGameUI() {
    if (!this.currentGameState) return;

    this.updatePlayerInfo();
    this.updatePlayerPositions();
    this.updateCurrentPlayer();
    this.updateActionPanel();
    this.updatePropertyOwnership();
    this.updateBuildings(); // Neue Methode für Häuser/Hotels
    this.updateFreeParkingPot(); // Neue Methode für Frei-Parken-Topf
    
    // Prüfe auf Spielende
    this.checkGameOver();
    
    // Prüfe auf aktive Auktion
    if (this.currentGameState.currentAuction && this.currentGameState.currentAuction.status === 'active') {
      // Wenn Auktions-Modal nicht bereits geöffnet ist
      if (!this.auctionModal.classList.contains('active')) {
        this.showAuctionModal(this.currentGameState.currentAuction);
      } else {
        // Aktualisiere bestehende Auktions-Anzeige
        this.updateAuctionDisplay(this.currentGameState.currentAuction);
      }
    }
  }

  // Spiel-UI ohne Spielerpositionen aktualisieren (für Animationen)
  updateGameUIWithoutPositions() {
    if (!this.currentGameState) return;

    this.updatePlayerInfo();
    this.updateCurrentPlayer();
    this.updateActionPanel();
    this.updatePropertyOwnership();
    this.updateBuildings(); // Neue Methode für Häuser/Hotels
    this.updateFreeParkingPot(); // Neue Methode für Frei-Parken-Topf
    
    // Prüfe auf aktive Auktion
    if (this.currentGameState.currentAuction && this.currentGameState.currentAuction.status === 'active') {
      // Wenn Auktions-Modal nicht bereits geöffnet ist
      if (!this.auctionModal.classList.contains('active')) {
        this.showAuctionModal(this.currentGameState.currentAuction);
      } else {
        // Aktualisiere bestehende Auktions-Anzeige
        this.updateAuctionDisplay(this.currentGameState.currentAuction);
      }
    }
  }

  // Spielfigur animiert bewegen - Schwebende Bewegung zur Zielposition
  animatePlayerMovement(playerId, fromPosition, toPosition) {
    console.log(`🎬 Animiere schwebende Bewegung: Spieler ${playerId} von Position ${fromPosition} zu ${toPosition}`);
    
    if (!this.currentGameState || !this.currentGameState.players) {
      console.error('❌ Kein GameState verfügbar für Animation');
      return;
    }
    
    // Bewegenden Spieler finden
    const movingPlayer = this.currentGameState.players.find(p => p.id === playerId);
    if (!movingPlayer) {
      console.error('❌ Spieler für Animation nicht gefunden:', playerId);
      return;
    }
    
    console.log(`🔍 Gefunden: ${movingPlayer.name} (${movingPlayer.color}) schwebt von ${fromPosition} zu ${toPosition}`);
    
    // Startfeld und Zielfeld finden
    const fromField = this.monopolyBoard.querySelector(`[data-position="${fromPosition}"]`);
    const toField = this.monopolyBoard.querySelector(`[data-position="${toPosition}"]`);
    
    if (!fromField || !toField) {
      console.error('❌ Start- oder Zielfeld nicht gefunden:', fromPosition, toPosition);
      // Sperre lösen bei Fehler
      this.isAnimationRunning = false;
      return;
    }
    
    // Temporär alte Position setzen und Figuren aktualisieren
    const originalPosition = movingPlayer.position;
    movingPlayer.position = fromPosition;
    this.updatePlayerPositions();
    
    // Bewegende Figur finden
    const movingPiece = fromField.querySelector(`.player-piece.color-${movingPlayer.color}`);
    if (!movingPiece) {
      console.error('❌ Bewegende Spielfigur nicht gefunden. Farbe:', movingPlayer.color);
      movingPlayer.position = originalPosition;
      // Sperre lösen bei Fehler
      this.isAnimationRunning = false;
      return;
    }
    
    // Bildschirm-Koordinaten berechnen
    const fromRect = fromField.getBoundingClientRect();
    const toRect = toField.getBoundingClientRect();
    
    // Zentrum der Felder berechnen (für die Players-Container)
    const fromPlayersContainer = fromField.querySelector('.field-players');
    const toPlayersContainer = toField.querySelector('.field-players');
    
    const fromPlayersRect = fromPlayersContainer ? fromPlayersContainer.getBoundingClientRect() : fromRect;
    const toPlayersRect = toPlayersContainer ? toPlayersContainer.getBoundingClientRect() : toRect;
    
    const startX = fromPlayersRect.left + (fromPlayersRect.width / 2) - 9; // -9 für Figur-Center
    const startY = fromPlayersRect.top + (fromPlayersRect.height / 2) - 9;
    const endX = toPlayersRect.left + (toPlayersRect.width / 2) - 9;
    const endY = toPlayersRect.top + (toPlayersRect.height / 2) - 9;
    
    console.log(`📍 Flugbahn: Start (${startX}, ${startY}) → Ziel (${endX}, ${endY})`);
    
    // Figur für Flug vorbereiten - mit eindeutiger z-index basierend auf playerId
    const zIndex = 50 + (playerId.slice(-2).charCodeAt(0) || 0); // Eindeutige z-index pro Spieler
    movingPiece.style.position = 'fixed';
    movingPiece.style.left = startX + 'px';
    movingPiece.style.top = startY + 'px';
    movingPiece.style.zIndex = zIndex.toString();
    movingPiece.classList.add('flying');
    
    // Flugbewegung starten
    setTimeout(() => {
      movingPiece.style.transition = 'left 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      movingPiece.style.left = endX + 'px';
      movingPiece.style.top = endY + 'px';
      
      console.log(`✈️ Figur schwebt zur Position (${endX}, ${endY})`);
    }, 50);
    
    // Nach Flugzeit: Figur an Zielposition platzieren
    setTimeout(() => {
      // Position auf Ziel setzen
      movingPlayer.position = toPosition;
      
      // Alle Figuren neu platzieren (entfernt die fliegende Figur)
      this.updatePlayerPositions();
      
      // Neue Figur am Ziel finden und Landung animieren
      const newPiece = toField.querySelector(`.player-piece.color-${movingPlayer.color}`);
      if (newPiece) {
        newPiece.classList.add('landing');
        
        // Landung-Animation nach kurzer Zeit entfernen
        setTimeout(() => {
          newPiece.classList.remove('landing');
          console.log(`🎯 Landung abgeschlossen: ${movingPlayer.name} ist auf Position ${toPosition}`);
          
          // Animation-Sperre lösen
          this.isAnimationRunning = false;
          console.log('🔓 Animation-Sperre gelöst');
          
          // Button-Status aktualisieren
          this.updateCurrentPlayer();
          
        }, 400);
      } else {
        // Fallback: Sperre auch ohne Landungsanimation lösen
        this.isAnimationRunning = false;
        console.log('🔓 Animation-Sperre gelöst (Fallback)');
        this.updateCurrentPlayer();
      }
      
    }, 1600); // 1.5s Flug + 100ms Buffer
  }

  // Spieler-Info aktualisieren
  updatePlayerInfo() {
    this.playersInfo.innerHTML = '';
    
    this.currentGameState.players.forEach(player => {
      const playerDiv = document.createElement('div');
      playerDiv.className = 'player-info';
      
      if (player.id === this.currentGameState.currentPlayerId) {
        playerDiv.classList.add('current');
      }

      const propertyCount = player.properties.length + player.railroads.length + player.utilities.length;

      playerDiv.innerHTML = `
        <div class="player-info-header">
          <div class="player-info-name">
            <div class="player-color color-${player.color}"></div>
            ${player.name}
          </div>
          <div class="player-money">${player.money}M</div>
        </div>
        <div class="player-properties">
          ${propertyCount} Besitztümer
          ${player.inJail ? ' • Im Gefängnis' : ''}
        </div>
      `;

      this.playersInfo.appendChild(playerDiv);
    });
  }

  // Spieler-Positionen aktualisieren
  updatePlayerPositions() {
    // Alle Spieler-Figuren entfernen
    document.querySelectorAll('.player-piece').forEach(piece => piece.remove());

    // Spieler-Positionen gruppieren
    const positionGroups = {};
    this.currentGameState.players.forEach(player => {
      if (!positionGroups[player.position]) {
        positionGroups[player.position] = [];
      }
      positionGroups[player.position].push(player);
    });

    // Spieler-Figuren platzieren
    Object.entries(positionGroups).forEach(([position, players]) => {
      const fieldElement = this.monopolyBoard.querySelector(`[data-position="${position}"]`);
      if (!fieldElement) return;

      const playersContainer = fieldElement.querySelector('.field-players');
      if (!playersContainer) return;

      players.forEach(player => {
        const pieceElement = document.createElement('div');
        pieceElement.className = `player-piece color-${player.color}`;
        pieceElement.title = player.name;
        
        // Gewählte Figur als Emoji anzeigen
        pieceElement.innerHTML = player.piece || '🎩';
        
        playersContainer.appendChild(pieceElement);
      });
    });
  }

  // Aktueller Spieler Display aktualisieren
  updateCurrentPlayer() {
    const currentPlayer = this.currentGameState.players.find(
      p => p.id === this.currentGameState.currentPlayerId
    );

    if (currentPlayer) {
      // Text-Display verstecken - Würfel-Button zeigt visuell wer am Zug ist
      this.currentPlayerDisplay.style.display = 'none';
      
      // Würfel-Button Sperr-Logik: Nur für aktuellen Spieler + keine Animation
      const isMyTurn = (currentPlayer.id === this.playerId);
      const isBlocked = this.isAnimationRunning || currentPlayer.hasRolled;
      
      this.rollDiceBtn.disabled = !isMyTurn || isBlocked;
      
      // Detailliertes Visual Feedback für Button-Zustand
      this.updateDiceButtonAppearance(isMyTurn, isBlocked, currentPlayer);
    }
  }

  // Würfel-Button Appearance basierend auf Zustand aktualisieren
  updateDiceButtonAppearance(isMyTurn, isBlocked, currentPlayer) {
    // Reset alle benutzerdefinierten Styles
    this.rollDiceBtn.style.opacity = '';
    this.rollDiceBtn.style.background = '';
    this.rollDiceBtn.style.color = '';
    this.rollDiceBtn.style.transform = '';
    
    if (!isMyTurn) {
      // Nicht mein Zug - grau und deaktiviert
      this.rollDiceBtn.textContent = `${currentPlayer.name} ist dran`;
      this.rollDiceBtn.title = 'Warte bis du an der Reihe bist';
      
    } else if (this.isAnimationRunning) {
      // Animation läuft - orange/gelb mit Warte-Indikator
      this.rollDiceBtn.textContent = '⏳ Bitte warten...';
      this.rollDiceBtn.title = 'Warte bis die Animation beendet ist';
      this.rollDiceBtn.style.background = 'linear-gradient(135deg, #ff9800, #f57c00)';
      this.rollDiceBtn.style.color = 'white';
      
    } else if (currentPlayer.hasRolled) {
      // Bereits gewürfelt - grün mit Häkchen
      this.rollDiceBtn.textContent = '✅ Bereits gewürfelt';
      this.rollDiceBtn.title = 'Du hast bereits gewürfelt - warte auf nächsten Zug';
      this.rollDiceBtn.style.background = 'linear-gradient(135deg, #4caf50, #388e3c)';
      this.rollDiceBtn.style.color = 'white';
      
    } else if (currentPlayer.inJail) {
      // Im Gefängnis - spezielle Darstellung
      this.rollDiceBtn.textContent = '🏛️ Gefängnis-Wurf';
      this.rollDiceBtn.title = 'Würfle einen Pasch um aus dem Gefängnis zu kommen';
      this.rollDiceBtn.style.background = 'linear-gradient(135deg, #ff5722, #d32f2f)';
      this.rollDiceBtn.style.color = 'white';
      
    } else {
      // Normal - bereit zum Würfeln
      this.rollDiceBtn.textContent = '🎲 Würfeln';
      this.rollDiceBtn.title = 'Klicke um zu würfeln';
      this.rollDiceBtn.style.background = '';
      this.rollDiceBtn.style.color = '';
    }
  }

  // Action Panel aktualisieren
  updateActionPanel() {
    const isMyTurn = this.currentGameState.currentPlayerId === this.playerId;
    const currentPlayer = this.currentGameState.players.find(
      p => p.id === this.currentGameState.currentPlayerId
    );
    const myPlayer = this.currentGameState.players.find(p => p.id === this.playerId);
    
    if (isMyTurn) {
      if (myPlayer && myPlayer.inJail) {
        const freibriefButton = myPlayer.jailFreeCards > 0 ? 
          `<button id="use-jail-free-btn" class="btn btn-secondary">Freibrief verwenden (${myPlayer.jailFreeCards})</button>` : '';
        
        this.actionPanel.innerHTML = `
          <p><strong>Du bist im Gefängnis!</strong></p>
          <p>Runde ${myPlayer.jailTurns}/3 im Gefängnis</p>
          <p>Würfle einen Pasch um rauszukommen oder zahle 50M nach 3 Runden.</p>
          ${freibriefButton}
        `;
        
        // Event-Listener für Freibrief-Button hinzufügen
        if (myPlayer.jailFreeCards > 0) {
          const useJailFreeBtn = document.getElementById('use-jail-free-btn');
          if (useJailFreeBtn) {
            useJailFreeBtn.addEventListener('click', () => {
              this.socket.emit('use_jail_free_card');
            });
          }
        }
      } else if (myPlayer && myPlayer.hasRolled) {
        this.actionPanel.innerHTML = `
          <p><strong>Du hast bereits gewürfelt!</strong></p>
          <p>Warte auf Aktionen oder nächsten Spieler.</p>
        `;
      } else if (!this.currentGameState.lastDiceRoll) {
        this.actionPanel.innerHTML = `
          <p><strong>Du bist am Zug!</strong></p>
          <p>Klicke auf "Würfeln" um zu beginnen.</p>
        `;
      } else if (this.currentGameState.lastDiceRoll.isDouble) {
        this.actionPanel.innerHTML = `
          <p><strong>Pasch gewürfelt!</strong></p>
          <p>Du darfst nochmal würfeln.</p>
        `;
      } else {
        this.actionPanel.innerHTML = `
          <p><strong>Zug läuft...</strong></p>
          <p>Warte auf Aktionen oder nächsten Spieler.</p>
        `;
      }
    } else {
      const playerStatus = currentPlayer && currentPlayer.inJail ? ' (im Gefängnis)' : '';
      this.actionPanel.innerHTML = `
        <p><strong>${currentPlayer ? currentPlayer.name : 'Ein Spieler'} ist am Zug${playerStatus}</strong></p>
        <p>Warte auf deine Runde...</p>
      `;
    }

    // Handel-Button immer anzeigen (außerhalb vom Action Panel)
    this.addTradeButton();
    
    // Debug: Test-Button für Animation (nur im Development)
    this.addTestAnimationButton();
  }

  // Handel-Button hinzufügen
  addTradeButton() {
    // Prüfen ob Button bereits existiert (aus HTML)
    const existingButton = document.getElementById('open-trade-btn');
    if (existingButton) {
      // Button sichtbar machen
      existingButton.style.display = 'block';
      existingButton.innerHTML = '🤝 Handel';
      // Event-Listener hinzufügen falls noch nicht vorhanden
      existingButton.onclick = () => this.openTradeModal();
      return;
    }

    // Fallback: Button dynamisch erstellen falls nicht in HTML vorhanden
    const actionPanel = document.getElementById('action-panel');
    const tradeButton = document.createElement('button');
    tradeButton.id = 'open-trade-btn';
    tradeButton.className = 'btn btn-trade';
    tradeButton.innerHTML = '🤝 Handel';
    tradeButton.addEventListener('click', () => this.openTradeModal());

    actionPanel.parentNode.appendChild(tradeButton);
  }

  // Test-Button für Animation (Debug)
  addTestAnimationButton() {
    if (!this.currentGameState || !this.currentGameState.players) return;
    
    // Test-Button entfernt - Animation funktioniert einwandfrei
  }

  // Eigentumsverhältnisse aktualisieren
  updatePropertyOwnership() {
    console.log('DEBUG: updatePropertyOwnership called');
    console.log('DEBUG: propertyOwnership:', this.currentGameState.propertyOwnership);
    console.log('DEBUG: players:', this.currentGameState.players);

    // Erst alle Ownership-Klassen entfernen
    document.querySelectorAll('.board-field').forEach(field => {
      field.classList.remove('owned', 'owned-red', 'owned-blue', 'owned-green', 
                            'owned-yellow', 'owned-purple', 'owned-orange', 
                            'owned-pink', 'owned-cyan');
      field.removeAttribute('title'); // Tooltip entfernen
    });

    // Dann Ownership basierend auf aktuellem State setzen
    Object.entries(this.currentGameState.propertyOwnership || {}).forEach(([position, ownerId]) => {
      const fieldElement = this.monopolyBoard.querySelector(`[data-position="${position}"]`);
      if (fieldElement) {
        const owner = this.currentGameState.players.find(p => p.id === ownerId);
        if (owner) {
          console.log(`DEBUG: Setting field ${position} to color ${owner.color} for owner ${owner.name}`);
          fieldElement.classList.add('owned', `owned-${owner.color}`);
          fieldElement.title = `Besitzer: ${owner.name} (${owner.color})`; // Debug info in tooltip
          
          // Extra debug: Check if classes are actually applied
          console.log(`DEBUG: Field ${position} classes:`, fieldElement.className);
        } else {
          fieldElement.classList.add('owned');
        }
      } else {
        console.log(`DEBUG: Field element not found for position ${position}`);
      }
    });
  }

  // Feld-Aktionen behandeln
  handleFieldActions(actions) {
    if (!actions) return;
    
    actions.forEach(action => {
      switch (action.type) {
        case 'buy_offer':
          // Debug-Ausgaben
          console.log('DEBUG buy_offer:');
          console.log('- currentPlayerId:', this.currentGameState.currentPlayerId);
          console.log('- this.playerId:', this.playerId);
          console.log('- Sind gleich?', this.currentGameState.currentPlayerId === this.playerId);
          
          // Kaufangebot nur für aktuellen Spieler anzeigen
          if (this.currentGameState.currentPlayerId === this.playerId) {
            console.log('Zeige Kaufangebot für:', action.property.name);
            this.showBuyPropertyModal(action.property);
          } else {
            console.log('Kaufangebot NICHT angezeigt - falscher Spieler');
          }
          break;
        case 'rent_paid':
          const owner = this.getPlayerName(action.ownerId);
          this.addLogEntry(`Miete von ${action.amount}M an ${owner} gezahlt`);
          break;
        case 'tax_paid':
          this.addLogEntry(`Steuer von ${action.amount}M gezahlt`);
          break;
        case 'free_parking_collected':
          const collector = this.getPlayerName(action.playerId);
          this.addLogEntry(`🎉 ${collector} sammelt ${action.amount}M aus dem Frei-Parken-Topf!`);
          this.showSuccess(`🎉 ${action.amount}M aus dem Frei-Parken-Topf erhalten!`);
          break;
        case 'draw_card_required':
          // Nur der Spieler der auf dem Feld gelandet ist zieht die Karte
          if (action.playerId === this.playerId) {
            this.socket.emit('draw_card', { cardType: action.cardType });
          }
          break;
      }
    });
  }

  // Grundstück-Kauf Modal anzeigen
  showBuyPropertyModal(property) {
    console.log('DEBUG showBuyPropertyModal aufgerufen mit property:', property);
    console.log('DEBUG this.currentGameState:', this.currentGameState);
    console.log('DEBUG this.playerId:', this.playerId);
    
    const modal = this.buyPropertyModal;
    const details = document.getElementById('property-details');
    
    if (!modal) {
      console.error('Modal nicht gefunden! this.buyPropertyModal:', this.buyPropertyModal);
      return;
    }
    
    if (!details) {
      console.error('Details-Element nicht gefunden!');
      return;
    }
    
    // Erst einmal einfache Version ohne Kapital-Check
    details.innerHTML = `
      <h3>${property.name}</h3>
      <p><strong>Preis:</strong> ${property.price}M</p>
      <p><strong>Miete:</strong> ${property.rent[0]}M</p>
      ${property.mortgage ? `<p><strong>Hypothek:</strong> ${property.mortgage}M</p>` : ''}
      ${property.houseCost ? `<p><strong>Hauspreis:</strong> ${property.houseCost}M</p>` : ''}
    `;
    
    // Kapital-Info hinzufügen wenn möglich
    let debugInfo = '';
    
    if (!this.currentGameState) {
      debugInfo = 'DEBUG: this.currentGameState ist null/undefined';
    } else if (!this.currentGameState.players) {
      debugInfo = 'DEBUG: this.currentGameState.players ist null/undefined';
    } else if (!Array.isArray(this.currentGameState.players)) {
      debugInfo = `DEBUG: this.currentGameState.players ist kein Array: ${typeof this.currentGameState.players}`;
    } else if (!this.playerId) {
      debugInfo = `DEBUG: this.playerId ist leer: ${this.playerId}`;
    } else {
      const currentPlayer = this.currentGameState.players.find(player => player.id === this.playerId);
      console.log('DEBUG currentPlayer gefunden:', currentPlayer);
      
      if (!currentPlayer) {
        debugInfo = `DEBUG: Spieler nicht gefunden. playerId: ${this.playerId}, verfügbare IDs: ${this.currentGameState.players.map(p => p.id).join(', ')}`;
      } else if (typeof currentPlayer.money !== 'number') {
        debugInfo = `DEBUG: Spielergeld ist kein Number: ${typeof currentPlayer.money} = ${currentPlayer.money}`;
      } else {
        const playerMoney = currentPlayer.money;
        const canAfford = playerMoney >= property.price;
        
        details.innerHTML += `
          <hr style="margin: 15px 0; border: 1px solid #ddd;">
          <p><strong>Ihr Kapital:</strong> <span style="color: ${canAfford ? '#28a745' : '#dc3545'}">${playerMoney}M</span></p>
          ${!canAfford ? '<p style="color: #dc3545; font-style: italic;">Nicht genug Geld verfügbar!</p>' : ''}
        `;
        
        // Button-Status
        const confirmBtn = document.getElementById('confirm-buy-btn');
        if (confirmBtn) {
          confirmBtn.disabled = !canAfford;
          confirmBtn.style.opacity = canAfford ? '1' : '0.5';
        }
        
        debugInfo = ''; // Kein Debug nötig, alles funktioniert
      }
    }
    
    // Debug-Info im Modal anzeigen wenn ein Problem vorliegt
    if (debugInfo) {
      details.innerHTML += `
        <hr style="margin: 15px 0; border: 1px solid #ff9800;">
        <p style="color: #ff9800; font-size: 12px; font-family: monospace;">${debugInfo}</p>
      `;
    }
    
    console.log('DEBUG: Modal wird aktiviert...');
    modal.classList.add('active');
    this.currentPropertyToBuy = property.position;
    console.log('DEBUG: Modal sollte jetzt sichtbar sein');
  }

  // Grundstück-Kauf bestätigen
  confirmBuyProperty() {
    console.log('DEBUG confirmBuyProperty aufgerufen:');
    console.log('- currentPropertyToBuy:', this.currentPropertyToBuy);
    console.log('- playerId:', this.playerId);
    
    if (this.currentPropertyToBuy !== undefined) {
      console.log('Sende buy_property Event für Position:', this.currentPropertyToBuy);
      this.socket.emit('buy_property', { position: this.currentPropertyToBuy });
    } else {
      console.log('FEHLER: currentPropertyToBuy ist undefined!');
    }
  }

  // Grundstück-Kauf ablehnen
  declineBuyProperty() {
    this.closeBuyPropertyModal();
    this.socket.emit('decline_property');
  }

  // Grundstück-Kauf Modal schließen
  closeBuyPropertyModal() {
    this.buyPropertyModal.classList.remove('active');
    this.currentPropertyToBuy = undefined;
    
    // Kaufen-Button wieder aktivieren für nächste Verwendung
    const confirmBtn = document.getElementById('confirm-buy-btn');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
    }
  }

  // Karten-Modal anzeigen
  showCardModal(card) {
    const modal = this.cardModal;
    const title = document.getElementById('card-title');
    const content = document.getElementById('card-content');
    
    title.textContent = card.type === 'chance' ? 'Ereigniskarte' : 'Gemeinschaftskarte';
    content.innerHTML = `<p>${card.text}</p>`;
    
    // Karte für später speichern (für Ausführung beim Schließen)
    this.currentCard = card;
    
    modal.classList.add('active');
  }

  // Karten-Modal schließen
  closeCardModal() {
    this.cardModal.classList.remove('active');
    
    // Kartenaktion ausführen wenn Karte vorhanden
    if (this.currentCard) {
      console.log('Führe Kartenaktion aus:', this.currentCard);
      this.socket.emit('execute_card_action', {
        action: this.currentCard
      });
      this.currentCard = null; // Karte zurücksetzen
    }
  }

  // Log-Eintrag hinzufügen
  addLogEntry(message) {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.textContent = message;
    
    this.gameLog.insertBefore(logEntry, this.gameLog.firstChild);
    
    // Nur die letzten 50 Einträge behalten
    const entries = this.gameLog.children;
    if (entries.length > 50) {
      this.gameLog.removeChild(entries[entries.length - 1]);
    }
  }

  clearGameLog() {
    this.gameLog.innerHTML = '';
  }

  // Board-Konfiguration laden (statisch importiert) - Version 2.0
  async loadBoardConfig() {
    try {
      console.log('FIXED VERSION: Loading static board config - no server request!');
      // Statische Board-Konfiguration verwenden statt Server-Request
      this.boardConfig = {
        fields: [
          // Startfeld
          { position: 0, name: "Los", type: "start", color: null, price: 0, rent: [0], mortgage: 0 },
          
          // Braune Gruppe
          { position: 1, name: "Badstraße", type: "property", color: "brown", price: 60, rent: [2, 10, 30, 90, 160, 250], mortgage: 30, houseCost: 50 },
          { position: 2, name: "Gemeinschaftsfeld", type: "community", color: null, price: 0, rent: [0], mortgage: 0 },
          { position: 3, name: "Turmstraße", type: "property", color: "brown", price: 60, rent: [4, 20, 60, 180, 320, 450], mortgage: 30, houseCost: 50 },
          { position: 4, name: "Einkommensteuer", type: "tax", color: null, price: 0, rent: [200], mortgage: 0 },
          { position: 5, name: "Hauptbahnhof", type: "railroad", color: "railroad", price: 200, rent: [25, 50, 100, 200], mortgage: 100 },
          
          // Hellblaue Gruppe
          { position: 6, name: "Elisenstraße", type: "property", color: "light-blue", price: 100, rent: [6, 30, 90, 270, 400, 550], mortgage: 50, houseCost: 50 },
          { position: 7, name: "Ereignisfeld", type: "chance", color: null, price: 0, rent: [0], mortgage: 0 },
          { position: 8, name: "Chausseestraße", type: "property", color: "light-blue", price: 100, rent: [6, 30, 90, 270, 400, 550], mortgage: 50, houseCost: 50 },
          { position: 9, name: "Schillerstraße", type: "property", color: "light-blue", price: 120, rent: [8, 40, 100, 300, 450, 600], mortgage: 60, houseCost: 50 },
          
          // Gefängnis
          { position: 10, name: "Gefängnis", type: "jail", color: null, price: 0, rent: [0], mortgage: 0 },
          
          // Pinke Gruppe
          { position: 11, name: "Theaterstraße", type: "property", color: "pink", price: 140, rent: [10, 50, 150, 450, 625, 750], mortgage: 70, houseCost: 100 },
          { position: 12, name: "Elektrizitätswerk", type: "utility", color: "utility", price: 150, rent: [4, 10], mortgage: 75 },
          { position: 13, name: "Museumstraße", type: "property", color: "pink", price: 140, rent: [10, 50, 150, 450, 625, 750], mortgage: 70, houseCost: 100 },
          { position: 14, name: "Opernplatz", type: "property", color: "pink", price: 160, rent: [12, 60, 180, 500, 700, 900], mortgage: 80, houseCost: 100 },
          { position: 15, name: "Nordbahnhof", type: "railroad", color: "railroad", price: 200, rent: [25, 50, 100, 200], mortgage: 100 },
          
          // Orange Gruppe  
          { position: 16, name: "Lessingstraße", type: "property", color: "orange", price: 180, rent: [14, 70, 200, 550, 750, 950], mortgage: 90, houseCost: 100 },
          { position: 17, name: "Gemeinschaftsfeld", type: "community", color: null, price: 0, rent: [0], mortgage: 0 },
          { position: 18, name: "Friedrichstraße", type: "property", color: "orange", price: 180, rent: [14, 70, 200, 550, 750, 950], mortgage: 90, houseCost: 100 },
          { position: 19, name: "Poststraße", type: "property", color: "orange", price: 200, rent: [16, 80, 220, 600, 800, 1000], mortgage: 100, houseCost: 100 },
          
          // Frei Parken
          { position: 20, name: "Frei Parken", type: "free-parking", color: null, price: 0, rent: [0], mortgage: 0 },
          
          // Rote Gruppe
          { position: 21, name: "Seestraße", type: "property", color: "red", price: 220, rent: [18, 90, 250, 700, 875, 1050], mortgage: 110, houseCost: 150 },
          { position: 22, name: "Ereignisfeld", type: "chance", color: null, price: 0, rent: [0], mortgage: 0 },
          { position: 23, name: "Hafenstraße", type: "property", color: "red", price: 220, rent: [18, 90, 250, 700, 875, 1050], mortgage: 110, houseCost: 150 },
          { position: 24, name: "Münchner Straße", type: "property", color: "red", price: 240, rent: [20, 100, 300, 750, 925, 1100], mortgage: 120, houseCost: 150 },
          { position: 25, name: "Südbahnhof", type: "railroad", color: "railroad", price: 200, rent: [25, 50, 100, 200], mortgage: 100 },
          
          // Gelbe Gruppe
          { position: 26, name: "Bahnhofstraße", type: "property", color: "yellow", price: 260, rent: [22, 110, 330, 800, 975, 1150], mortgage: 130, houseCost: 150 },
          { position: 27, name: "Wiener Straße", type: "property", color: "yellow", price: 260, rent: [22, 110, 330, 800, 975, 1150], mortgage: 130, houseCost: 150 },
          { position: 28, name: "Wasserwerk", type: "utility", color: "utility", price: 150, rent: [4, 10], mortgage: 75 },
          { position: 29, name: "Goethestraße", type: "property", color: "yellow", price: 280, rent: [24, 120, 360, 850, 1025, 1200], mortgage: 140, houseCost: 150 },
          
          // Gehe ins Gefängnis
          { position: 30, name: "Gehe ins Gefängnis", type: "go-to-jail", color: null, price: 0, rent: [0], mortgage: 0 },
          
          // Grüne Gruppe
          { position: 31, name: "Berliner Straße", type: "property", color: "green", price: 300, rent: [26, 130, 390, 900, 1100, 1275], mortgage: 150, houseCost: 200 },
          { position: 32, name: "Hauptstraße", type: "property", color: "green", price: 300, rent: [26, 130, 390, 900, 1100, 1275], mortgage: 150, houseCost: 200 },
          { position: 33, name: "Gemeinschaftsfeld", type: "community", color: null, price: 0, rent: [0], mortgage: 0 },
          { position: 34, name: "Rathausplatz", type: "property", color: "green", price: 320, rent: [28, 150, 450, 1000, 1200, 1400], mortgage: 160, houseCost: 200 },
          { position: 35, name: "Ostbahnhof", type: "railroad", color: "railroad", price: 200, rent: [25, 50, 100, 200], mortgage: 100 },
          { position: 36, name: "Ereignisfeld", type: "chance", color: null, price: 0, rent: [0], mortgage: 0 },
          { position: 37, name: "Schlossallee", type: "property", color: "dark-blue", price: 350, rent: [35, 175, 500, 1100, 1300, 1500], mortgage: 175, houseCost: 200 },
          { position: 38, name: "Zusatzsteuer", type: "tax", color: null, price: 0, rent: [100], mortgage: 0 },
          { position: 39, name: "Alexanderplatz", type: "property", color: "dark-blue", price: 400, rent: [50, 200, 600, 1400, 1700, 2000], mortgage: 200, houseCost: 200 }
        ]
      };
      
      console.log('FIXED VERSION: Board-Konfiguration statisch geladen:', this.boardConfig.fields.length, 'Felder');
      console.log('FIXED VERSION: Beispiel Feld 8:', this.boardConfig.fields[8]);
    } catch (error) {
      console.error('Fehler beim Laden der Board-Konfiguration:', error);
      this.boardConfig = null;
    }
  }

  // Hilfsfunktionen
  getPlayerName(playerId) {
    const player = this.currentGameState?.players.find(p => p.id === playerId);
    return player ? player.name : 'Unbekannt';
  }

  getBoardField(position) {
    return this.getBoardConfig()[position];
  }

  getBoardConfig() {
    // Verwende Server-Konfiguration falls verfügbar, sonst Fallback
    if (this.boardConfig && this.boardConfig.length > 0) {
      return this.boardConfig;
    }
    
    // Fallback: Import der Spielfeld-Konfiguration (aktualisiert auf deutsche Namen)
    return [
      { position: 0, name: "Los", type: "start", color: null, price: 0 },
      { position: 1, name: "Badstraße", type: "property", color: "brown", price: 60 },
      { position: 2, name: "Gemeinschaftsfeld", type: "community", color: null, price: 0 },
      { position: 3, name: "Turmstraße", type: "property", color: "brown", price: 60 },
      { position: 4, name: "Einkommensteuer", type: "tax", color: null, price: 0 },
      { position: 5, name: "Hauptbahnhof", type: "railroad", color: "railroad", price: 200 },
      { position: 6, name: "Elisenstraße", type: "property", color: "light-blue", price: 100 },
      { position: 7, name: "Ereignisfeld", type: "chance", color: null, price: 0 },
      { position: 8, name: "Chausseestraße", type: "property", color: "light-blue", price: 100 },
      { position: 9, name: "Schillerstraße", type: "property", color: "light-blue", price: 120 },
      { position: 10, name: "Gefängnis", type: "jail", color: null, price: 0 },
      { position: 11, name: "Theaterstraße", type: "property", color: "pink", price: 140 },
      { position: 12, name: "Elektrizitätswerk", type: "utility", color: "utility", price: 150 },
      { position: 13, name: "Museumstraße", type: "property", color: "pink", price: 140 },
      { position: 14, name: "Opernplatz", type: "property", color: "pink", price: 160 },
      { position: 15, name: "Nordbahnhof", type: "railroad", color: "railroad", price: 200 },
      { position: 16, name: "Lessingstraße", type: "property", color: "orange", price: 180 },
      { position: 17, name: "Gemeinschaftsfeld", type: "community", color: null, price: 0 },
      { position: 18, name: "Friedrichstraße", type: "property", color: "orange", price: 180 },
      { position: 19, name: "Poststraße", type: "property", color: "orange", price: 200 },
      { position: 20, name: "Frei Parken", type: "free-parking", color: null, price: 0 },
      { position: 21, name: "Seestraße", type: "property", color: "red", price: 220 },
      { position: 22, name: "Ereignisfeld", type: "chance", color: null, price: 0 },
      { position: 23, name: "Hafenstraße", type: "property", color: "red", price: 220 },
      { position: 24, name: "Münchner Straße", type: "property", color: "red", price: 240 },
      { position: 25, name: "Südbahnhof", type: "railroad", color: "railroad", price: 200 },
      { position: 26, name: "Bahnhofstraße", type: "property", color: "yellow", price: 260 },
      { position: 27, name: "Wiener Straße", type: "property", color: "yellow", price: 260 },
      { position: 28, name: "Wasserwerk", type: "utility", color: "utility", price: 150 },
      { position: 29, name: "Goethestraße", type: "property", color: "yellow", price: 280 },
      { position: 30, name: "Gehe ins Gefängnis", type: "go-to-jail", color: null, price: 0 },
      { position: 31, name: "Berliner Straße", type: "property", color: "green", price: 300 },
      { position: 32, name: "Hauptstraße", type: "property", color: "green", price: 300 },
      { position: 33, name: "Gemeinschaftsfeld", type: "community", color: null, price: 0 },
      { position: 34, name: "Rathausplatz", type: "property", color: "green", price: 320 },
      { position: 35, name: "Ostbahnhof", type: "railroad", color: "railroad", price: 200 },
      { position: 36, name: "Ereignisfeld", type: "chance", color: null, price: 0 },
      { position: 37, name: "Schlossallee", type: "property", color: "dark-blue", price: 350 },
      { position: 38, name: "Zusatzsteuer", type: "tax", color: null, price: 0 },
      { position: 39, name: "Parkstraße", type: "property", color: "dark-blue", price: 400 }
    ];
  }

  // Toast-Nachrichten
  showError(message) {
    // Audio-Feedback für Fehler-Nachrichten
    if (this.audioManager && this.audioEnabled) {
      this.audioManager.playError();
    }
    this.showToast(this.errorToast, message);
  }

  showSuccess(message) {
    // Audio-Feedback für Erfolgs-Nachrichten
    if (this.audioManager && this.audioEnabled) {
      this.audioManager.playSuccess();
    }
    this.showToast(this.successToast, message);
  }

  showInfo(message) {
    this.showToast(this.successToast, message);
  }

  showToast(toastElement, message) {
    const messageElement = toastElement.querySelector('span');
    messageElement.textContent = message;
    toastElement.classList.add('show');
    
    setTimeout(() => {
      toastElement.classList.remove('show');
    }, 4000);
  }

  closeToast(toastElement) {
    toastElement.classList.remove('show');
  }

  // Property Management System

  // Property Management Modal anzeigen
  showPropertyManagement(field) {
    console.log('DEBUG: showPropertyManagement aufgerufen für:', field.name);
    console.log('- Field Position:', field.position);
    console.log('- Field Object:', field);
    console.log('- Field hat rent?', !!field.rent);
    console.log('- BoardConfig verfügbar?', !!this.boardConfig);
    console.log('- BoardConfig.fields verfügbar?', !!this.boardConfig?.fields);
    
    let property = field;
    
    // IMMER aus boardConfig holen, da server field-objekte unvollständig sind
    if (this.boardConfig && this.boardConfig.fields && this.boardConfig.fields[field.position]) {
      console.log('Hole Property Daten aus boardConfig für Position', field.position);
      property = this.boardConfig.fields[field.position];
      console.log('- Property aus boardConfig:', property);
    } else {
      console.error('BoardConfig nicht verfügbar oder Position nicht gefunden:', field.position);
      return;
    }
    
    if (!property || !property.rent) {
      console.error('Property hat immer noch keine rent Array:', property);
      return;
    }
    
    console.log('DEBUG: Verwende Property:', property);
    
    const buildings = this.currentGameState.buildingsOnProperties[property.position] || { houses: 0, hotel: false };
    const isMortgaged = this.currentGameState.mortgagedProperties?.includes(property.position);
    const title = document.getElementById('property-management-title');
    const details = document.getElementById('property-management-details');
    const buttons = document.getElementById('property-management-buttons');

    console.log('- Modal Elemente gefunden:', {
      title: !!title,
      details: !!details, 
      buttons: !!buttons,
      modal: !!this.propertyManagementModal
    });

    title.textContent = `${property.name} verwalten`;

    details.innerHTML = `
      <div class="property-info">
        <h3>${property.name}</h3>
        <div class="property-stats">
          <p><strong>Preis:</strong> ${property.price}M</p>
          <p><strong>Grundmiete:</strong> ${property.rent[0]}M</p>
          <p><strong>Hauspreis:</strong> ${property.houseCost}M</p>
          <p><strong>Häuser:</strong> ${buildings.houses}/4 ${this.getBuildingDisplay(buildings.houses, 'house')}</p>
          <p><strong>Hotel:</strong> ${buildings.hotel ? 'Ja' : 'Nein'} ${buildings.hotel ? this.getBuildingDisplay(1, 'hotel') : ''}</p>
          <p><strong>Hypothek:</strong> ${isMortgaged ? '🏦 Ja (keine Miete)' : 'Nein'}</p>
          ${isMortgaged ? `<p class="mortgage-info"><strong>Rückkaufpreis:</strong> ${Math.floor(property.price * 0.5 * 1.1)}M</p>` : ''}
        </div>
        <div class="rent-table">
          <h4>Miettabelle:</h4>
          <ul>
            <li>Grundstück allein: ${property.rent[0]}M</li>
            <li>Mit 1 Haus: ${property.rent[1]}M</li>
            <li>Mit 2 Häusern: ${property.rent[2]}M</li>
            <li>Mit 3 Häusern: ${property.rent[3]}M</li>
            <li>Mit 4 Häusern: ${property.rent[4]}M</li>
            <li>Mit Hotel: ${property.rent[5]}M</li>
          </ul>
        </div>
      </div>
    `;

    // Buttons generieren
    const canBuildHouse = this.canBuildHouse(property, buildings);
    const canBuildHotel = this.canBuildHotel(property, buildings);
    const canSellHouse = buildings.houses > 0;
    const canSellHotel = buildings.hotel;

    buttons.innerHTML = '';

    if (canBuildHouse) {
      const buildHouseBtn = document.createElement('button');
      const willBecome4th = buildings.houses === 3;
      if (willBecome4th) {
        buildHouseBtn.textContent = `Hotel bauen (${property.houseCost}M) ← 4. Haus wird Hotel`;
        buildHouseBtn.title = '4 Häuser werden automatisch zu 1 Hotel';
      } else {
        buildHouseBtn.textContent = `Haus bauen (${property.houseCost}M)`;
        buildHouseBtn.title = 'Ein Haus bauen';
      }
      buildHouseBtn.className = 'btn btn-primary';
      buildHouseBtn.addEventListener('click', () => this.buildHouse(property.position));
      buttons.appendChild(buildHouseBtn);
    }

    if (canBuildHotel) {
      const buildHotelBtn = document.createElement('button');
      buildHotelBtn.textContent = `Hotel bauen (${property.houseCost}M)`;
      buildHotelBtn.className = 'btn btn-primary';
      buildHotelBtn.addEventListener('click', () => this.buildHotel(property.position));
      buttons.appendChild(buildHotelBtn);
    }

    if (canSellHouse) {
      const sellHouseBtn = document.createElement('button');
      sellHouseBtn.textContent = `Haus verkaufen (${Math.floor(property.houseCost / 2)}M)`;
      sellHouseBtn.className = 'btn btn-warning';
      sellHouseBtn.addEventListener('click', () => this.sellHouse(property.position));
      buttons.appendChild(sellHouseBtn);
    }

    if (canSellHotel) {
      const sellHotelBtn = document.createElement('button');
      sellHotelBtn.textContent = `Hotel verkaufen → 3 Häuser (${Math.floor(property.houseCost / 2)}M)`;
      sellHotelBtn.className = 'btn btn-warning';
      sellHotelBtn.title = 'Hotel verkaufen - wird zu 3 Häusern';
      sellHotelBtn.addEventListener('click', () => this.sellHotel(property.position));
      buttons.appendChild(sellHotelBtn);
    }

    // Hypotheken-Buttons
    const canMortgage = !isMortgaged && buildings.houses === 0 && !buildings.hotel;
    const canUnmortgage = isMortgaged;

    if (canMortgage) {
      const mortgageBtn = document.createElement('button');
      const mortgageValue = Math.floor(property.price * 0.5);
      mortgageBtn.textContent = `🏦 Hypothek aufnehmen (${mortgageValue}M)`;
      mortgageBtn.className = 'btn btn-secondary';
      mortgageBtn.addEventListener('click', () => this.mortgageProperty(property.position));
      buttons.appendChild(mortgageBtn);
    }

    if (canUnmortgage) {
      const unmortgageBtn = document.createElement('button');
      const mortgageValue = Math.floor(property.price * 0.5);
      const unmortgagePrice = Math.floor(mortgageValue * 1.1);
      unmortgageBtn.textContent = `🏦 Hypothek zurückkaufen (${unmortgagePrice}M)`;
      unmortgageBtn.className = 'btn btn-success';
      unmortgageBtn.addEventListener('click', () => this.unmortgageProperty(property.position));
      buttons.appendChild(unmortgageBtn);
    }

    this.propertyManagementModal.classList.add('active');
    console.log('DEBUG: Property Management Modal angezeigt');
    console.log('- Modal classList:', this.propertyManagementModal.classList.toString());
  }

  // Prüfen ob Haus gebaut werden kann
  canBuildHouse(property, buildings) {
    const myPlayer = this.currentGameState.players.find(p => p.id === this.playerId);
    if (!myPlayer || myPlayer.money < property.houseCost) return false;
    if (buildings.hotel || buildings.houses >= 4) return false;
    if (this.currentGameState.houses <= 0) return false;
    return true;
  }

  // Prüfen ob Hotel gebaut werden kann
  canBuildHotel(property, buildings) {
    const myPlayer = this.currentGameState.players.find(p => p.id === this.playerId);
    if (!myPlayer || myPlayer.money < property.houseCost) return false;
    if (buildings.hotel || buildings.houses !== 4) return false;
    if (this.currentGameState.hotels <= 0) return false;
    return true;
  }

  // Haus bauen
  buildHouse(position) {
    this.socket.emit('build_house', { position });
    this.closePropertyManagement();
  }

  // Hotel bauen
  buildHotel(position) {
    this.socket.emit('build_hotel', { position });
    this.closePropertyManagement();
  }

  // Haus verkaufen
  sellHouse(position) {
    this.socket.emit('sell_house', { position });
    this.closePropertyManagement();
  }

  // Hotel verkaufen
  sellHotel(position) {
    this.socket.emit('sell_hotel', { position });
    this.closePropertyManagement();
  }

  // Property Management Modal schließen
  closePropertyManagement() {
    this.propertyManagementModal.classList.remove('active');
  }

  // === HANDELSSYSTEM METHODEN ===

  // Handels-Modal öffnen
  openTradeModal() {
    if (!this.currentGameState) return;

    // Spielerliste aufbauen (außer sich selbst)
    const playerSelect = document.getElementById('trade-target-player');
    playerSelect.innerHTML = '<option value="">Spieler auswählen...</option>';

    Array.from(this.currentGameState.players.values()).forEach(player => {
      if (player.id !== this.playerId) {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = player.name;
        playerSelect.appendChild(option);
      }
    });

    // Eigene Grundstücke auflisten
    this.updateTradeProperties();

    // Event-Handler für Spieler-Auswahl hinzufügen
    playerSelect.addEventListener('change', (e) => {
      this.updateTargetTradeProperties(e.target.value);
    });

    // Ziel-Spieler Grundstücke zurücksetzen
    this.updateTargetTradeProperties(null);

    // Modal anzeigen
    this.tradeModal.classList.add('active');
  }

  // Handels-Modal schließen
  closeTradeModal() {
    this.tradeModal.classList.remove('active');
    // Formular zurücksetzen
    document.getElementById('trade-target-player').value = '';
    document.getElementById('trade-money-offer').value = '0';
    document.getElementById('trade-money-request').value = '0';
    document.querySelectorAll('.trade-property-checkbox-own, .trade-property-checkbox-target').forEach(cb => cb.checked = false);
  }

  // Eigene Grundstücke für Handel aktualisieren
  updateTradeProperties() {
    const container = document.getElementById('trade-properties-own');
    container.innerHTML = '';

    if (!this.currentGameState || !this.boardConfig) return;

    // Durch alle eigenen Grundstücke iterieren
    Object.entries(this.currentGameState.propertyOwnership).forEach(([position, ownerId]) => {
      if (ownerId === this.playerId) {
        const property = this.boardConfig.fields[position];
        if (property && ['property', 'railroad', 'utility'].includes(property.type)) {
          const div = document.createElement('div');
          div.className = 'trade-property-item';
          div.innerHTML = `
            <label>
              <input type="checkbox" class="trade-property-checkbox-own" value="${position}">
              ${property.name} (${property.price}M)
            </label>
          `;
          container.appendChild(div);
        }
      }
    });

    if (container.children.length === 0) {
      container.innerHTML = '<p class="no-properties">Du besitzt keine Grundstücke</p>';
    }
  }

  // Grundstücke des Ziel-Spielers für Handel aktualisieren
  updateTargetTradeProperties(targetPlayerId) {
    const container = document.getElementById('trade-properties-target');
    container.innerHTML = '';

    if (!this.currentGameState || !this.boardConfig || !targetPlayerId) {
      container.innerHTML = '<p class="no-selection">Wähle zuerst einen Spieler aus</p>';
      return;
    }

    // Durch alle Grundstücke des Ziel-Spielers iterieren
    Object.entries(this.currentGameState.propertyOwnership).forEach(([position, ownerId]) => {
      if (ownerId === targetPlayerId) {
        const property = this.boardConfig.fields[position];
        if (property && ['property', 'railroad', 'utility'].includes(property.type)) {
          const div = document.createElement('div');
          div.className = 'trade-property-item';
          div.innerHTML = `
            <label>
              <input type="checkbox" class="trade-property-checkbox-target" value="${position}">
              ${property.name} (${property.price}M)
            </label>
          `;
          container.appendChild(div);
        }
      }
    });

    if (container.children.length === 0) {
      const targetPlayer = this.currentGameState.players.get(targetPlayerId);
      const playerName = targetPlayer ? targetPlayer.name : 'Der Spieler';
      container.innerHTML = `<p class="no-properties">${playerName} besitzt keine Grundstücke</p>`;
    }
  }

  // Handelsangebot senden
  sendTradeOffer() {
    const targetId = document.getElementById('trade-target-player').value;
    const moneyOffer = parseInt(document.getElementById('trade-money-offer').value) || 0;
    const moneyRequest = parseInt(document.getElementById('trade-money-request').value) || 0;

    if (!targetId) {
      this.showError('Bitte wähle einen Zielspieler aus');
      return;
    }

    // Ausgewählte eigene Grundstücke sammeln
    const propertiesOffered = [];
    document.querySelectorAll('.trade-property-checkbox-own:checked').forEach(checkbox => {
      propertiesOffered.push(parseInt(checkbox.value));
    });

    // Ausgewählte Grundstücke des anderen Spielers sammeln
    const propertiesRequested = [];
    document.querySelectorAll('.trade-property-checkbox-target:checked').forEach(checkbox => {
      propertiesRequested.push(parseInt(checkbox.value));
    });

    // Validierung
    if (moneyOffer === 0 && propertiesOffered.length === 0 && moneyRequest === 0 && propertiesRequested.length === 0) {
      this.showError('Du musst etwas anbieten oder anfordern');
      return;
    }

    const offer = {
      initiatorMoney: moneyOffer,
      initiatorProperties: propertiesOffered,
      targetMoney: moneyRequest,
      targetProperties: propertiesRequested
    };

    // Angebot senden
    this.socket.emit('initiate_trade', {
      targetId: targetId,
      offer: offer
    });

    console.log('Handelsangebot gesendet:', offer);
  }

  // Handelsangebot erhalten anzeigen
  showTradeOfferReceived(data) {
    // Modal-Inhalt befüllen
    document.getElementById('trade-offer-initiator').textContent = data.initiator;
    
    // Angebot-Details anzeigen
    let offerText = 'Angebot:\n';
    
    if (data.offer.initiatorMoney > 0) {
      offerText += `💰 ${data.offer.initiatorMoney}M Geld\n`;
    }
    
    if (data.offer.initiatorProperties.length > 0) {
      offerText += '🏠 Grundstücke:\n';
      data.offer.initiatorProperties.forEach(position => {
        const property = this.boardConfig.fields[position];
        if (property) {
          offerText += `   - ${property.name}\n`;
        }
      });
    }

    if (data.offer.targetMoney > 0 || data.offer.targetProperties.length > 0) {
      offerText += '\nGegen:\n';
      
      if (data.offer.targetMoney > 0) {
        offerText += `💰 ${data.offer.targetMoney}M von dir\n`;
      }
      
      if (data.offer.targetProperties.length > 0) {
        offerText += '🏠 Deine Grundstücke:\n';
        data.offer.targetProperties.forEach(position => {
          const property = this.boardConfig.fields[position];
          if (property) {
            offerText += `   - ${property.name}\n`;
          }
        });
      }
    }

    document.getElementById('trade-offer-details').textContent = offerText;

    // Handels-ID speichern
    this.currentTradeId = data.tradeId;

    // Modal anzeigen
    this.tradeOfferModal.classList.add('active');
  }

  // Handelsangebot annehmen
  acceptTradeOffer() {
    if (!this.currentTradeId) return;

    this.socket.emit('accept_trade', {
      tradeId: this.currentTradeId
    });

    this.tradeOfferModal.classList.remove('active');
    this.currentTradeId = null;
  }

  // Handelsangebot ablehnen
  rejectTradeOffer() {
    if (!this.currentTradeId) return;

    this.socket.emit('reject_trade', {
      tradeId: this.currentTradeId
    });

    this.tradeOfferModal.classList.remove('active');
    this.currentTradeId = null;
  }

  // === ENDE HANDELSSYSTEM ===

  // === HYPOTHEKEN-SYSTEM ===

  // Grundstück hypothekarisieren
  mortgageProperty(position) {
    this.socket.emit('mortgage_property', { position });
    this.closePropertyManagement();
  }

  // Hypothek zurückkaufen
  unmortgageProperty(position) {
    this.socket.emit('unmortgage_property', { position });
    this.closePropertyManagement();
  }

  // === ENDE HYPOTHEKEN-SYSTEM ===

  // Gebäude-Display für Modal erstellen
  getBuildingDisplay(count, type) {
    if (count === 0) return '';
    
    let display = '<span class="building-count">';
    for (let i = 0; i < count; i++) {
      if (type === 'house') {
        display += '<span class="house-icon"></span>';
      } else if (type === 'hotel') {
        display += '<span class="hotel-icon"></span>';
      }
    }
    display += '</span>';
    return display;
  }

  // Häuser und Hotels auf dem Spielbrett aktualisieren
  updateBuildings() {
    // Alle bestehenden Gebäude entfernen
    document.querySelectorAll('.field-buildings').forEach(container => {
      container.innerHTML = '';
    });

    // Nur weitermachen wenn buildingsOnProperties vorhanden ist
    if (!this.currentGameState.buildingsOnProperties) return;

    // Durch alle Gebäude iterieren
    Object.entries(this.currentGameState.buildingsOnProperties).forEach(([position, buildings]) => {
      const fieldElement = this.monopolyBoard.querySelector(`[data-position="${position}"]`);
      if (!fieldElement) return;

      const buildingsContainer = fieldElement.querySelector('.field-buildings');
      if (!buildingsContainer) return;

      // Hotel anzeigen
      if (buildings.hotel) {
        const hotelElement = document.createElement('div');
        hotelElement.className = 'hotel';
        hotelElement.title = 'Hotel';
        buildingsContainer.appendChild(hotelElement);
      } else {
        // Häuser anzeigen
        for (let i = 0; i < buildings.houses; i++) {
          const houseElement = document.createElement('div');
          houseElement.className = 'house';
          houseElement.title = `Haus ${i + 1}`;
          buildingsContainer.appendChild(houseElement);
        }
      }
    });
  }

  // Frei-Parken-Topf aktualisieren
  updateFreeParkingPot() {
    const potAmountElement = document.getElementById('pot-amount');
    if (!potAmountElement) return;

    const potAmount = this.currentGameState?.freeParkingPot || 0;
    potAmountElement.textContent = `${potAmount}M`;

    // Visueller Effekt bei Änderung
    if (this.lastFreeParkingAmount !== undefined && this.lastFreeParkingAmount !== potAmount) {
      potAmountElement.style.transform = 'scale(1.2)';
      potAmountElement.style.color = '#ff6b35';
      setTimeout(() => {
        potAmountElement.style.transform = '';
        potAmountElement.style.color = '';
      }, 300);
    }
    
    this.lastFreeParkingAmount = potAmount;
  }

  // === AUKTIONS-SYSTEM METHODEN ===

  // Auktions-Modal anzeigen
  showAuctionModal(auction) {
    console.log('Zeige Auktions-Modal für:', auction.property.name);
    
    // Modal-Inhalte aktualisieren
    document.getElementById('auction-property-name').textContent = auction.property.name;
    document.getElementById('auction-list-price').textContent = `${auction.property.price}M`;
    
    this.updateAuctionDisplay(auction);
    this.updateAuctionParticipants(auction);

    // Event Listeners für Buttons
    const placeBidBtn = document.getElementById('place-bid-btn');
    const passBidBtn = document.getElementById('pass-bid-btn');
    const bidAmountInput = document.getElementById('bid-amount');

    // Alte Event Listeners entfernen
    placeBidBtn.replaceWith(placeBidBtn.cloneNode(true));
    passBidBtn.replaceWith(passBidBtn.cloneNode(true));

    // Neue Event Listeners hinzufügen
    document.getElementById('place-bid-btn').addEventListener('click', () => {
      const bidAmount = parseInt(bidAmountInput.value);
      this.placeBid(bidAmount);
    });

    document.getElementById('pass-bid-btn').addEventListener('click', () => {
      this.passAuction();
    });

    // Eingabefeld bei Enter-Taste
    bidAmountInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const bidAmount = parseInt(bidAmountInput.value);
        this.placeBid(bidAmount);
      }
    });

    // Mindestgebot setzen
    bidAmountInput.min = auction.currentBid + 1;
    bidAmountInput.placeholder = `Mindestens ${auction.currentBid + 1}M`;

    // Modal anzeigen
    this.auctionModal.classList.add('active');
  }

  // Auktions-Anzeige aktualisieren
  updateAuctionDisplay(auction) {
    document.getElementById('auction-current-bid').textContent = `${auction.currentBid}M`;
    
    const highestBidderSpan = document.getElementById('auction-highest-bidder');
    if (auction.highestBidder) {
      const bidderName = this.getPlayerName(auction.highestBidder);
      highestBidderSpan.textContent = bidderName;
      highestBidderSpan.style.color = 'var(--warning-color)';
    } else {
      highestBidderSpan.textContent = 'Keiner';
      highestBidderSpan.style.color = 'var(--text-secondary)';
    }

    // Mindestgebot für Input aktualisieren
    const bidAmountInput = document.getElementById('bid-amount');
    bidAmountInput.min = auction.currentBid + 1;
    bidAmountInput.placeholder = `Mindestens ${auction.currentBid + 1}M`;

    // Teilnehmer aktualisieren
    this.updateAuctionParticipants(auction);
  }

  // Auktions-Teilnehmer anzeigen
  updateAuctionParticipants(auction) {
    const participantsList = document.getElementById('participants-list');
    participantsList.innerHTML = '';

    auction.participants.forEach(playerId => {
      const player = this.currentGameState.players.find(p => p.id === playerId);
      if (!player || player.isBankrupt) return;

      const chip = document.createElement('div');
      chip.className = 'participant-chip';
      chip.textContent = player.name;

      // Status-spezifische Styling
      if (auction.hasPassedThisRound.includes && auction.hasPassedThisRound.includes(playerId)) {
        chip.classList.add('passed');
      } else if (auction.highestBidder === playerId) {
        chip.classList.add('highest-bidder');
      }

      participantsList.appendChild(chip);
    });
  }

  // Gebot abgeben
  placeBid(bidAmount) {
    if (!bidAmount || isNaN(bidAmount) || bidAmount <= 0) {
      this.showError('Bitte gib einen gültigen Betrag ein');
      return;
    }

    // Validierungen
    const auction = this.currentGameState.currentAuction;
    if (!auction) {
      this.showError('Keine aktive Auktion');
      return;
    }

    if (bidAmount <= auction.currentBid) {
      this.showError(`Gebot muss höher als ${auction.currentBid}M sein`);
      return;
    }

    const myPlayer = this.currentGameState.players.find(p => p.id === this.playerId);
    if (!myPlayer || myPlayer.money < bidAmount) {
      this.showError('Nicht genug Geld für dieses Gebot');
      return;
    }

    // Gebot senden
    this.socket.emit('place_bid', { bidAmount });
    console.log(`Gebot abgegeben: ${bidAmount}M`);

    // Input leeren
    document.getElementById('bid-amount').value = '';
  }

  // In Auktion passen
  passAuction() {
    const auction = this.currentGameState.currentAuction;
    if (!auction) {
      this.showError('Keine aktive Auktion');
      return;
    }

    this.socket.emit('pass_auction');
    console.log('Passe in der Auktion');
  }

  // Auktions-Modal schließen
  closeAuctionModal() {
    this.auctionModal.classList.remove('active');
    console.log('Auktions-Modal geschlossen');
  }

  // Prüfen ob Spieler an Auktion teilnehmen kann
  canParticipateInAuction() {
    const auction = this.currentGameState.currentAuction;
    if (!auction) return false;

    const myPlayer = this.currentGameState.players.find(p => p.id === this.playerId);
    return myPlayer && 
           !myPlayer.isBankrupt && 
           auction.participants.includes(this.playerId) &&
           (!auction.hasPassedThisRound.includes || !auction.hasPassedThisRound.includes(this.playerId));
  }

  // === ENDE AUKTIONS-SYSTEM ===

  // === CHAT SYSTEM ===

  // Chat-Nachricht senden
  sendChatMessage() {
    const message = this.chatInput.value.trim();
    
    if (!message || message.length === 0) {
      return;
    }
    
    if (message.length > 200) {
      this.showError('Nachricht zu lang (max. 200 Zeichen)');
      return;
    }
    
    this.socket.emit('chat_message', { message });
    this.chatInput.value = '';
  }

  // Chat-Nachricht zur Anzeige hinzufügen
  addChatMessage(sender, message, timestamp, isOwnMessage = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isOwnMessage ? 'own-message' : ''}`;
    
    const time = new Date(timestamp).toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
      <div class="chat-message-header">
        <span class="chat-message-sender" style="color: ${this.getPlayerColor(sender)}">${sender}</span>
        <span class="chat-message-time">${time}</span>
      </div>
      <div class="chat-message-text">${this.escapeHtml(message)}</div>
    `;
    
    this.chatMessages.appendChild(messageDiv);
    
    // Automatisch nach unten scrollen
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    
    // Begrenze die Anzahl der Nachrichten (max 100)
    const messages = this.chatMessages.children;
    if (messages.length > 100) {
      this.chatMessages.removeChild(messages[0]);
    }
  }

  // Spielerfarbe ermitteln
  getPlayerColor(playerName) {
    if (!this.currentGameState || !this.currentGameState.players) {
      return 'var(--text-primary)';
    }
    
    const player = this.currentGameState.players.find(p => p.name === playerName);
    return player ? `var(--${player.color})` : 'var(--text-primary)';
  }

  // HTML escapen für Sicherheit
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // === ENDE CHAT SYSTEM ===

  // === LIQUIDATIONS-SYSTEM METHODEN ===

  // Liquidations-Modal anzeigen
  showLiquidationModal(data) {
    this.currentLiquidationData = data;
    this.selectedLiquidations = { houses: [], hotels: [], properties: [] };

    // Basis-Informationen setzen
    document.getElementById('liquidation-required').textContent = `${data.requiredAmount}M`;
    document.getElementById('liquidation-available').textContent = `${data.availableMoney}M`;
    document.getElementById('liquidation-needed').textContent = `${data.shortfall}M`;
    document.getElementById('liquidation-selected').textContent = '0M';

    // Verfügbare Liquidations-Optionen aufbauen
    this.populateLiquidationOptions(data);

    // Modal anzeigen
    this.liquidationModal.classList.add('active');
  }

  // Verfügbare Liquidations-Optionen befüllen
  populateLiquidationOptions(data) {
    // Häuser
    const housesContainer = document.getElementById('liquidation-houses');
    if (data.availableHouses.length > 0) {
      housesContainer.innerHTML = '';
      data.availableHouses.forEach(house => {
        const houseItem = this.createLiquidationItem(
          house.id, 
          house.propertyName, 
          `Haus verkaufen (Verkaufspreis: ${house.salePrice}M)`,
          house.salePrice, 
          'house'
        );
        housesContainer.appendChild(houseItem);
      });
    } else {
      housesContainer.innerHTML = '<p class="no-items">Keine Häuser zum Verkauf verfügbar</p>';
    }

    // Hotels
    const hotelsContainer = document.getElementById('liquidation-hotels');
    if (data.availableHotels.length > 0) {
      hotelsContainer.innerHTML = '';
      data.availableHotels.forEach(hotel => {
        const hotelItem = this.createLiquidationItem(
          hotel.id,
          hotel.propertyName,
          `Hotel verkaufen (wird zu 3 Häusern, Verkaufspreis: ${hotel.salePrice}M)`,
          hotel.salePrice,
          'hotel'
        );
        hotelsContainer.appendChild(hotelItem);
      });
    } else {
      hotelsContainer.innerHTML = '<p class="no-items">Keine Hotels zum Verkauf verfügbar</p>';
    }

    // Grundstücke
    const propertiesContainer = document.getElementById('liquidation-properties');
    if (data.availableProperties.length > 0) {
      propertiesContainer.innerHTML = '';
      data.availableProperties.forEach(property => {
        const propertyItem = this.createLiquidationItem(
          property.id,
          property.name,
          `Hypothek aufnehmen (${property.mortgageValue}M)`,
          property.mortgageValue,
          'property'
        );
        propertiesContainer.appendChild(propertyItem);
      });
    } else {
      propertiesContainer.innerHTML = '<p class="no-items">Keine Grundstücke für Hypotheken verfügbar</p>';
    }
  }

  // Liquidations-Item erstellen
  createLiquidationItem(id, name, description, value, type) {
    const item = document.createElement('div');
    item.className = 'liquidation-item';
    item.innerHTML = `
      <div class="liquidation-item-info">
        <input type="checkbox" class="liquidation-checkbox" data-id="${id}" data-type="${type}" data-value="${value}">
        <div class="liquidation-item-details">
          <div class="liquidation-item-name">${name}</div>
          <div class="liquidation-item-description">${description}</div>
        </div>
      </div>
      <div class="liquidation-item-value">+${value}M</div>
    `;

    // Event-Listener für Checkbox
    const checkbox = item.querySelector('.liquidation-checkbox');
    checkbox.addEventListener('change', () => this.updateLiquidationSelection());

    return item;
  }

  // Liquidations-Auswahl aktualisieren
  updateLiquidationSelection() {
    let totalSelected = 0;
    this.selectedLiquidations = { houses: [], hotels: [], properties: [] };

    // Alle ausgewählten Checkboxen durchgehen
    document.querySelectorAll('.liquidation-checkbox:checked').forEach(checkbox => {
      const id = parseInt(checkbox.dataset.id);
      const type = checkbox.dataset.type;
      const value = parseInt(checkbox.dataset.value);

      this.selectedLiquidations[type + 's'].push(id);
      totalSelected += value;
    });

    // Anzeige aktualisieren
    document.getElementById('liquidation-selected').textContent = `${totalSelected}M`;

    const stillNeeded = this.currentLiquidationData.shortfall - totalSelected;
    document.getElementById('liquidation-needed').textContent = `${Math.max(0, stillNeeded)}M`;

    // Button aktivieren/deaktivieren
    const confirmBtn = document.getElementById('confirm-liquidation');
    confirmBtn.disabled = totalSelected < this.currentLiquidationData.shortfall;
  }

  // Liquidation bestätigen
  confirmLiquidation() {
    if (!this.currentLiquidationData) return;

    this.socket.emit('perform_liquidation', {
      liquidationId: this.currentLiquidationData.id,
      selections: this.selectedLiquidations
    });
  }

  // Bankrott erklären
  declareBankruptcy() {
    if (!this.currentLiquidationData) return;

    this.socket.emit('declare_bankruptcy', {
      liquidationId: this.currentLiquidationData.id
    });

    this.closeLiquidationModal();
  }

  // Liquidations-Modal schließen
  closeLiquidationModal() {
    this.liquidationModal.classList.remove('active');
    this.currentLiquidationData = null;
    this.selectedLiquidations = { houses: [], hotels: [], properties: [] };
  }

  // === ENDE LIQUIDATIONS-SYSTEM ===

  // === GAME OVER SYSTEM ===

  // Prüfe auf Spielende
  checkGameOver() {
    if (!this.currentGameState) return;

    // Prüfe ob das Spiel beendet ist
    if (this.currentGameState.gamePhase === 'finished') {
      // Finde den Gewinner (der einzige nicht-bankrotte Spieler)
      const activePlayers = this.currentGameState.players.filter(p => !p.isBankrupt);
      if (activePlayers.length === 1) {
        this.showGameOverModal(activePlayers[0]);
      } else if (activePlayers.length === 0) {
        // Unentschieden (sollte eigentlich nicht passieren)
        this.showGameOverModal(null);
      }
    }
  }

  // Game-Over-Modal anzeigen
  showGameOverModal(winner) {
    const modal = document.getElementById('gameOverModal');
    const titleElement = document.getElementById('gameOverTitle');
    const winnerElement = document.getElementById('gameOverWinner');
    const messageElement = document.getElementById('gameOverMessage');

    if (winner) {
      // Audio-Feedback für Gewinner-Fanfare
      if (this.audioManager && this.audioEnabled) {
        this.audioManager.playWinnerFanfare();
      }
      titleElement.textContent = '🎉 Spiel Beendet! 🎉';
      winnerElement.textContent = `${winner.name} gewinnt!`;
      
      // Erstelle Statistik-Nachricht
      const totalMoney = winner.money;
      const propertyCount = winner.properties.length + winner.railroads.length + winner.utilities.length;
      const buildingCount = winner.houses + winner.hotels;
      
      let message = `Gewinner mit ${totalMoney}M Vermögen!`;
      if (propertyCount > 0) {
        message += `\n${propertyCount} Grundstücke besessen`;
      }
      if (buildingCount > 0) {
        message += `\n${winner.houses} Häuser, ${winner.hotels} Hotels gebaut`;
      }
      
      messageElement.textContent = message;
    } else {
      // Unentschieden
      titleElement.textContent = '🤝 Unentschieden! 🤝';
      winnerElement.textContent = 'Alle Spieler sind bankrott';
      messageElement.textContent = 'Das Spiel endet ohne Gewinner.';
    }

    // Event-Listener für Buttons
    this.setupGameOverButtons();

    // Modal anzeigen
    modal.style.display = 'flex';
    
    // Animation nach kurzer Verzögerung starten
    setTimeout(() => {
      modal.classList.add('active');
    }, 100);

    // Konfetti-Effekt (optional)
    if (winner) {
      this.startConfettiEffect();
    }
  }

  // Button-Event-Listener für Game-Over-Modal einrichten
  setupGameOverButtons() {
    const backToLobbyBtn = document.getElementById('backToLobbyBtn');
    const newGameBtn = document.getElementById('newGameBtn');

    // Entferne alte Event-Listener
    const newBackBtn = backToLobbyBtn.cloneNode(true);
    const newGameBtnNew = newGameBtn.cloneNode(true);
    backToLobbyBtn.parentNode.replaceChild(newBackBtn, backToLobbyBtn);
    newGameBtn.parentNode.replaceChild(newGameBtnNew, newGameBtn);

    // Zurück zur Lobby
    newBackBtn.addEventListener('click', () => {
      window.location.reload(); // Seite neu laden = Zurück zur Startseite
    });

    // Neues Spiel
    newGameBtnNew.addEventListener('click', () => {
      // Schließe Modal und gehe zur Spielerstellung
      document.getElementById('gameOverModal').style.display = 'none';
      this.showGameCreation();
      // Eventuell Socket disconnect und neu verbinden
      if (this.socket) {
        this.socket.disconnect();
        this.connectToServer();
      }
    });
  }

  // Konfetti-Effekt starten (visueller Bonus)
  startConfettiEffect() {
    // Einfacher Konfetti-Effekt mit Emojis
    const confettiChars = ['🎉', '🎊', '✨', '🌟', '💫', '🏆', '👑', '💰'];
    const container = document.body;

    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.textContent = confettiChars[Math.floor(Math.random() * confettiChars.length)];
        confetti.style.position = 'fixed';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-50px';
        confetti.style.fontSize = (Math.random() * 20 + 20) + 'px';
        confetti.style.zIndex = '20000';
        confetti.style.pointerEvents = 'none';
        confetti.style.animation = `confettiFall ${Math.random() * 3 + 2}s linear forwards`;
        
        container.appendChild(confetti);
        
        // Nach Animation entfernen
        setTimeout(() => {
          if (confetti.parentNode) {
            confetti.parentNode.removeChild(confetti);
          }
        }, 5000);
      }, Math.random() * 3000);
    }
  }

  // === FARBAUSWAHL SYSTEM ===
  
  setupColorSelectionEvents() {
    if (this.colorSelection) {
      this.colorSelection.addEventListener('click', (e) => {
        const colorOption = e.target.closest('.color-option');
        if (colorOption && !colorOption.classList.contains('disabled')) {
          const color = colorOption.dataset.color;
          this.selectColor(color);
        }
      });
    }
  }

  selectColor(color) {
    if (this.selectedColor === color) return; // Bereits ausgewählt
    
    console.log('Wähle Farbe:', color);
    this.socket.emit('change_color', { color: color });
  }

  updateColorSelection(availableColors, currentPlayerColor = null) {
    const colorOptions = this.colorSelection.querySelectorAll('.color-option');
    
    colorOptions.forEach(option => {
      const color = option.dataset.color;
      const isAvailable = availableColors.includes(color);
      const isCurrent = color === currentPlayerColor;
      
      // Reset classes
      option.classList.remove('selected', 'disabled');
      
      if (isCurrent) {
        option.classList.add('selected');
        this.selectedColor = color;
      } else if (!isAvailable) {
        option.classList.add('disabled');
      }
    });
  }

  requestAvailableColors() {
    this.socket.emit('get_available_colors');
  }

  getColorName(color) {
    const colorNames = {
      red: 'Rot',
      blue: 'Blau', 
      green: 'Grün',
      yellow: 'Gelb',
      purple: 'Lila',
      orange: 'Orange',
      pink: 'Pink',
      cyan: 'Türkis'
    };
    return colorNames[color] || color;
  }

  // === FIGURENAUSWAHL SYSTEM ===
  
  setupPieceSelectionEvents() {
    if (this.pieceSelection) {
      this.pieceSelection.addEventListener('click', (e) => {
        const pieceOption = e.target.closest('.piece-option');
        if (pieceOption && !pieceOption.classList.contains('disabled')) {
          const piece = pieceOption.dataset.piece;
          this.selectPiece(piece);
        }
      });
    }
  }

  selectPiece(piece) {
    if (this.selectedPiece === piece) return; // Bereits ausgewählt
    
    console.log('Wähle Figur:', piece);
    this.socket.emit('change_piece', { piece: piece });
  }

  updatePieceSelection(availablePieces, currentPlayerPiece = null) {
    if (!this.pieceSelection) return;
    
    const pieceOptions = this.pieceSelection.querySelectorAll('.piece-option');
    
    pieceOptions.forEach(option => {
      const piece = option.dataset.piece;
      const isAvailable = availablePieces.includes(piece);
      const isCurrent = piece === currentPlayerPiece;
      
      // Reset classes
      option.classList.remove('selected', 'disabled');
      
      if (isCurrent) {
        option.classList.add('selected');
        this.selectedPiece = piece;
      } else if (!isAvailable) {
        option.classList.add('disabled');
      }
    });
  }

  requestAvailablePieces() {
    this.socket.emit('get_available_pieces');
  }

  // === ENDE FARBAUSWAHL SYSTEM ===
  
  // === ENDE GAME OVER SYSTEM ===
}

// Client beim Laden der Seite initialisieren
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded - Initialisiere Monopoly Client');
  try {
    new MonopolyClient();
    console.log('MonopolyClient erfolgreich erstellt');
  } catch (error) {
    console.error('Fehler beim Erstellen des MonopolyClient:', error);
  }
});