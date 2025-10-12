const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const Game = require('./Game');

class GameServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server);
    
    this.games = new Map();
    this.playerGames = new Map();
    
    this.setupServer();
    this.setupSocketHandlers();
  }

  setupServer() {
    this.app.use(express.static(path.join(__dirname, '../client')));
    
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/index.html'));
    });
    
    this.app.get('/config', (req, res) => {
      const game = new Game();
      res.json({ fields: game.board });
    });
    
    this.app.get('/games', (req, res) => {
      const availableGames = Array.from(this.games.entries()).map(([id, game]) => {
        const hostPlayer = game.players.get(game.hostPlayerId);
        return {
          id,
          hostName: hostPlayer ? hostPlayer.name : 'Unbekannt',
          playerCount: game.players.size,
          maxPlayers: game.maxPlayers,
          gamePhase: game.gamePhase,
          status: game.gamePhase === 'playing' ? 'running' : 'waiting'
        };
      });
      
      res.json(availableGames);
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client ${socket.id} verbunden`);

      // Spiel erstellen
      socket.on('create_game', (data) => {
        console.log('create_game Event empfangen von', socket.id, 'mit Daten:', data);
        
        const gameId = this.generateGameId();
        console.log('Generierte Game-ID:', gameId);
        
        const game = new Game(gameId, socket.id);
        console.log('Game-Objekt erstellt');
        
        // Host-Spieler zum Spiel hinzufügen
        game.addPlayer(socket.id, data.playerName);
        console.log('Host-Spieler hinzugefügt');
        
        this.games.set(gameId, game);
        this.playerGames.set(socket.id, gameId);
        
        socket.join(gameId);
        console.log('Socket zu Raum hinzugefügt');
        
        console.log(`Spiel ${gameId} erstellt von ${data.playerName}`);
        
        socket.emit('game_created', {
          gameId,
          isHost: true,
          gameState: game.getGameState()
        });
        
        console.log('game_created Event gesendet');
      });

      // Spiel beitreten per ID
      socket.on('join_game', (data) => {
        const game = this.games.get(data.gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Spiel nicht gefunden' });
          return;
        }
        
        if (game.players.size >= game.maxPlayers) {
          socket.emit('error', { message: 'Spiel ist voll' });
          return;
        }
        
        if (game.gameStarted) {
          socket.emit('error', { message: 'Spiel hat bereits begonnen' });
          return;
        }
        
        game.addPlayer(socket.id, data.playerName);
        this.playerGames.set(socket.id, data.gameId);
        
        socket.join(data.gameId);
        
        socket.emit('game_joined', {
          gameId: data.gameId,
          isHost: false,
          gameState: game.getGameState()
        });
        
        this.io.to(data.gameId).emit('game_state_update', game.getGameState());
      });

      // Farbe wechseln
      socket.on('change_color', (data) => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Spiel nicht gefunden' });
          return;
        }

        const result = game.changePlayerColor(socket.id, data.color);
        
        if (result.success) {
          // Erfolgreich: Allen Spielern die Änderung mitteilen
          this.io.to(gameId).emit('color_changed', {
            playerId: socket.id,
            newColor: data.color,
            gameState: game.getGameState(),
            availableColors: game.getAvailableColors()
          });
        } else {
          // Fehler: Nur dem anfragenden Spieler mitteilen
          socket.emit('color_change_error', { 
            message: result.error 
          });
        }
      });

      // Verfügbare Farben abrufen
      socket.on('get_available_colors', () => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (game) {
          socket.emit('available_colors', {
            colors: game.getAvailableColors(),
            allColors: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']
          });
        }
      });

      // Figur wechseln
      socket.on('change_piece', (data) => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Spiel nicht gefunden' });
          return;
        }

        const result = game.changePlayerPiece(socket.id, data.piece);
        
        if (result.success) {
          // Erfolgreich: Allen Spielern die Änderung mitteilen
          this.io.to(gameId).emit('piece_changed', {
            playerId: socket.id,
            newPiece: data.piece,
            gameState: game.getGameState(),
            availablePieces: game.getAvailablePieces()
          });
        } else {
          // Fehler: Nur dem anfragenden Spieler mitteilen
          socket.emit('piece_change_error', { 
            message: result.error 
          });
        }
      });

      // Verfügbare Figuren abrufen
      socket.on('get_available_pieces', () => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (game) {
          socket.emit('available_pieces', {
            pieces: game.getAvailablePieces(),
            allPieces: ['🎩', '🦄', '🐕', '🚗', '⛵', '✈️', '🍕', '👑']
          });
        }
      });

      // Spiel starten
      socket.on('start_game', () => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game || game.hostPlayerId !== socket.id) {
          socket.emit('error', { message: 'Nur der Host kann das Spiel starten' });
          return;
        }
        
        if (game.players.size < 2) {
          socket.emit('error', { message: 'Mindestens 2 Spieler erforderlich' });
          return;
        }
        
        game.startGame();
        
        this.io.to(gameId).emit('game_started', game.getGameState());
      });

      // Helper Funktion für sicheren Spielerwechsel
      const safeTurnTransition = (game, socket, delayMs = 2000) => {
        setTimeout(() => {
          const currentPlayer = game.getCurrentPlayer();
          if (currentPlayer.id === socket.id && currentPlayer.hasRolled && !game.turnInProgress) {
            console.log('Führe sicheren automatischen Spielerwechsel durch');
            const success = game.nextPlayer();
            if (success) {
              this.io.to(this.playerGames.get(socket.id)).emit('turn_ended', {
                nextPlayer: game.getCurrentPlayer().getPublicData(),
                gameState: game.getGameState()
              });
            }
          } else {
            console.log('Spielerwechsel übersprungen - Bedingungen nicht erfüllt:', {
              isCurrentPlayer: currentPlayer.id === socket.id,
              hasRolled: currentPlayer.hasRolled,
              turnInProgress: game.turnInProgress
            });
          }
        }, delayMs);
      };

      // Würfeln
      socket.on('roll_dice', () => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Spiel nicht gefunden' });
          return;
        }

        // Prüfe ob Spiel bereits beendet ist
        if (game.gamePhase === 'finished') {
          socket.emit('error', { message: 'Das Spiel ist bereits beendet' });
          return;
        }
        
        const currentPlayer = game.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.id !== socket.id) {
          socket.emit('error', { message: 'Du bist nicht am Zug' });
          return;
        }

        if (currentPlayer.hasRolled && !game.lastDiceRoll?.isDouble) {
          socket.emit('error', { message: 'Du hast bereits gewürfelt' });
          return;
        }

        // Anti-Spam Schutz: Verhindere mehrfache Requests in kurzer Zeit
        const now = Date.now();
        if (currentPlayer.lastRollTime && (now - currentPlayer.lastRollTime) < 1000) {
          socket.emit('error', { message: 'Bitte warte einen Moment zwischen Würfelwürfen' });
          return;
        }
        currentPlayer.lastRollTime = now;

        // Gefängnis-Logik
        if (currentPlayer.inJail) {
          console.log(`${currentPlayer.name} ist im Gefängnis (${currentPlayer.jailTurns} Runden, ${currentPlayer.jailFreeCards} Freibriefe)`);
          
          const diceResult = game.rollDice();
          
          // Pasch im Gefängnis = Freilassung
          if (diceResult.isDouble) {
            currentPlayer.inJail = false;
            currentPlayer.jailTurns = 0;
            console.log(`${currentPlayer.name} würfelt Pasch und verlässt das Gefängnis!`);
            
            this.broadcastGameEvent(gameId, `${currentPlayer.name} würfelt Pasch und verlässt das Gefängnis!`);
            
            const moveResult = game.movePlayer(socket.id, diceResult.sum);
            const fieldActions = this.handleFieldAction(game, currentPlayer);
            
            if (moveResult.passedGo) {
              this.broadcastGameEvent(gameId, `${currentPlayer.name} kommt über Los und erhält 200M`);
            }
            
            this.io.to(gameId).emit('dice_rolled', {
              playerId: socket.id,
              dice: diceResult,
              moveResult: moveResult,
              fieldAction: fieldActions,
              gameState: game.getGameState()
            });
            
            // Bei Pasch darf nochmal gewürfelt werden
            currentPlayer.hasRolled = false;
            
          } else {
            // Keine Bewegung, Runden im Gefängnis erhöhen
            currentPlayer.jailTurns++;
            
            if (currentPlayer.jailTurns >= 3) {
              // Nach 3 Runden: Zwangsweise Bezahlung und Freilassung
              console.log(`${currentPlayer.name} zahlt 50M und verlässt das Gefängnis nach 3 Runden`);
              currentPlayer.money -= 50;
              this.broadcastGameEvent(gameId, `${currentPlayer.name} zahlt 50M und verlässt das Gefängnis nach 3 Runden`);
              
              currentPlayer.inJail = false;
              currentPlayer.jailTurns = 0;
              
              const moveResult = game.movePlayer(socket.id, diceResult.sum);
              const fieldActions = this.handleFieldAction(game, currentPlayer);
              
              if (moveResult.passedGo) {
                this.broadcastGameEvent(gameId, `${currentPlayer.name} kommt über Los und erhält 200M`);
              }
              
              this.io.to(gameId).emit('dice_rolled', {
                playerId: socket.id,
                dice: diceResult,
                moveResult: moveResult,
                fieldAction: fieldActions,
                gameState: game.getGameState()
              });
              
              // Nach Zwangsbefreiung: Spielerwechsel prüfen
              if (fieldActions.every(action => !['buy_offer', 'draw_card_required'].includes(action.type))) {
                // Kein Kaufangebot oder Karte - normaler Spielerwechsel
                currentPlayer.hasRolled = true;
                console.log('hasRolled auf true gesetzt nach Gefängnis-Befreiung (keine interaktive Aktion)');
                
                safeTurnTransition(game, socket, 2000);
              } else {
                // Interaktive Aktion - Spielerwechsel wird später durch Aktion ausgelöst
                console.log('Keine sofortige Spielerwechsel nach Gefängnis-Befreiung (interaktive Aktion folgt)');
              }
              
            } else {
              // Bleibt im Gefängnis
              this.io.to(gameId).emit('dice_rolled', {
                playerId: socket.id,
                dice: diceResult,
                moveResult: null,
                fieldAction: [],
                gameState: game.getGameState()
              });
              
              this.broadcastGameEvent(gameId, `${currentPlayer.name} bleibt im Gefängnis (${currentPlayer.jailTurns}/3 Runden)`);
              
              // SOFORT hasRolled setzen um weiteres Würfeln zu verhindern  
              currentPlayer.hasRolled = true;
              console.log('hasRolled auf true gesetzt nach Gefängnis-Wurf (kein Pasch)');
              
              // Spielerwechsel nach kurzer Verzögerung (vermeidet turnInProgress Konflikte)
              setTimeout(() => {
                if (game.getCurrentPlayer().id === socket.id && !game.turnInProgress) {
                  console.log('Führe Spielerwechsel nach Gefängnis durch');
                  const success = game.nextPlayer();
                  if (success) {
                    this.io.to(gameId).emit('turn_ended', {
                      nextPlayer: game.getCurrentPlayer().getPublicData(),
                      gameState: game.getGameState()
                    });
                  }
                }
              }, 2000);
            }
          }
          return;
        }

        // Normale Bewegung (nicht im Gefängnis)
        const diceResult = game.rollDice();
        
        // Prüfe auf 3 Pासchen (Gefängnis)
        if (diceResult.goToJail) {
          if (diceResult.usedJailFreeCard) {
            this.broadcastGameEvent(gameId, `${currentPlayer.name} würfelt den 3. Pasch, aber verwendet automatisch einen Freibrief! (${diceResult.remainingJailFreeCards} übrig)`);
            console.log(`${currentPlayer.name} verwendet automatisch Freibrief bei 3. Pasch`);
          } else {
            this.broadcastGameEvent(gameId, `${currentPlayer.name} würfelt den 3. Pasch und muss ins Gefängnis!`);
            console.log(`${currentPlayer.name} muss nach 3. Pasch ins Gefängnis`);
          }
          
          // Verwende movePlayer für korrekte Animation-Daten (Trick: 0 Schritte + direkte Position)
          const oldPos = currentPlayer.position;
          currentPlayer.setPosition(10); // Ins Gefängnis setzen
          
          this.io.to(gameId).emit('dice_rolled', {
            playerId: socket.id,
            dice: diceResult,
            moveResult: { 
              success: true,
              moved: true, 
              oldPosition: oldPos, 
              newPosition: 10, 
              passedGo: false 
            },
            fieldAction: [],
            gameState: game.getGameState()
          });
          
          // SOFORT hasRolled setzen um weiteres Würfeln zu verhindern
          currentPlayer.hasRolled = true;
          console.log('hasRolled auf true gesetzt nach 3. Pasch → Gefängnis');
          
          // Spielerwechsel nach Gefängnis
          setTimeout(() => {
            if (game.getCurrentPlayer().id === socket.id && !game.turnInProgress) {
              console.log('Führe Spielerwechsel nach Gefängnis durch');
              const success = game.nextPlayer();
              if (success) {
                this.io.to(gameId).emit('turn_ended', {
                  nextPlayer: game.getCurrentPlayer().getPublicData(),
                  gameState: game.getGameState()
                });
              }
            }
          }, 2000);
          return;
        }
        
        // Spieler bewegen (wichtig!)
        const moveResult = game.movePlayer(socket.id, diceResult.sum);
        
        const fieldActions = this.handleFieldAction(game, currentPlayer);
        
        this.io.to(gameId).emit('dice_rolled', {
          playerId: socket.id,
          dice: diceResult,
          moveResult: moveResult,
          fieldAction: fieldActions, // Feldaktionen direkt im dice_rolled Event
          gameState: game.getGameState()
        });

        console.log(`${currentPlayer.name} würfelt: ${diceResult.dice1} + ${diceResult.dice2} = ${diceResult.sum}, Pasch: ${diceResult.isDouble}`);
        console.log(`Spieler ${currentPlayer.name} landet auf Feld ${currentPlayer.position}: ${game.board[currentPlayer.position]?.name || 'Unbekannt'}`);
        console.log(`${currentPlayer.name} steht auf ${game.board[currentPlayer.position]?.name || 'Unbekannt'}`);

        // Pasch-Logik: Bei Pasch darf nochmal gewürfelt werden
        if (diceResult.isDouble) {
          currentPlayer.hasRolled = false;
          console.log(`Pasch gewürfelt! ${currentPlayer.name} darf nochmal würfeln.`);
        } else if (fieldActions.every(action => !['buy_offer', 'draw_card_required'].includes(action.type))) {
          // SOFORT hasRolled setzen um weiteres Würfeln zu verhindern
          currentPlayer.hasRolled = true;
          console.log('hasRolled auf true gesetzt nach normalem Wurf (kein Pasch, keine interaktive Aktion)');
          
          safeTurnTransition(game, socket, 2000);
        }
      });

      // Grundstück kaufen
      socket.on('buy_property', (data) => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Spiel nicht gefunden' });
          return;
        }
        
        // Validierung: Nur aktueller Spieler kann kaufen
        const currentPlayer = game.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.id !== socket.id) {
          socket.emit('error', { message: 'Du bist nicht am Zug' });
          return;
        }
        
        const result = game.buyProperty(socket.id, data.position);
        
        if (result.success) {
          const property = game.board[data.position];
          this.io.to(gameId).emit('property_bought', {
            playerId: socket.id,
            position: data.position,
            gameState: game.getGameState()
          });
          
          // Broadcast Grundstückskauf
          this.broadcastGameEvent(gameId, `${game.getPlayerName(socket.id)} kauft ${property.name} für ${property.price}M`);
          console.log(`Grundstück gekauft an Position ${data.position}`);
          
          const currentPlayer = game.getCurrentPlayer();
          if (!game.lastDiceRoll?.isDouble) {
            // SOFORT hasRolled setzen um weiteres Würfeln zu verhindern
            currentPlayer.hasRolled = true;
            console.log('hasRolled auf true gesetzt nach Grundstückskauf (kein Pasch)');
            
            setTimeout(() => {
              if (game.getCurrentPlayer().id === socket.id && !game.turnInProgress) {
                console.log('Führe Spielerwechsel nach Grundstückskauf durch');
                const success = game.nextPlayer();
                if (success) {
                  this.io.to(gameId).emit('turn_ended', {
                    nextPlayer: game.getCurrentPlayer().getPublicData(),
                    gameState: game.getGameState()
                  });
                }
              }
            }, 3000);
          }
        } else {
          socket.emit('error', { message: result.error });
        }
      });

      // Grundstück ablehnen
      socket.on('decline_property', () => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) return;
        
        const currentPlayer = game.getCurrentPlayer();
        const position = currentPlayer.position;
        const property = game.board[position];
        
        // Prüfe ob es ein kaufbares Grundstück ist (Grundstück, Bahnhof oder Versorgungswerk)
        if (property && ['property', 'railroad', 'utility'].includes(property.type) && !game.propertyOwnership.has(position)) {
          // Starte Auktion für das Grundstück
          const auctionResult = game.startPropertyAuction(position);
          
          if (auctionResult.success) {
            this.io.to(gameId).emit('auction_started', {
              auction: auctionResult.auction,
              gameState: game.getGameState()
            });
            
            this.broadcastGameEvent(gameId, 
              `🔨 Auktion für ${property.name} gestartet! Startgebot: ${auctionResult.auction.currentBid}M`
            );
            
            console.log(`Auktion für ${property.name} gestartet nach Ablehnung durch ${currentPlayer.name}`);
          } else {
            // Fallback zum alten Verhalten wenn Auktion nicht möglich
            if (!game.lastDiceRoll?.isDouble) {
              // SOFORT hasRolled setzen um weiteres Würfeln zu verhindern
              currentPlayer.hasRolled = true;
              console.log('hasRolled auf true gesetzt nach Grundstücksablehnung (kein Pasch)');
              
              setTimeout(() => {
                if (game.getCurrentPlayer().id === socket.id && !game.turnInProgress) {
                  console.log('Führe Spielerwechsel nach Grundstücksablehnung durch');
                  const success = game.nextPlayer();
                  if (success) {
                    this.io.to(gameId).emit('turn_ended', {
                      nextPlayer: game.getCurrentPlayer().getPublicData(),
                      gameState: game.getGameState()
                    });
                  }
                }
              }, 1000);
            }
          }
        } else {
          // Kein kaufbares Grundstück - normaler Spielerwechsel
          if (!game.lastDiceRoll?.isDouble) {
            // SOFORT hasRolled setzen um weiteres Würfeln zu verhindern
            currentPlayer.hasRolled = true;
            console.log('hasRolled auf true gesetzt nach Ablehnung (kein Pasch)');
            
            setTimeout(() => {
              if (game.getCurrentPlayer().id === socket.id && !game.turnInProgress) {
                console.log('Führe Spielerwechsel nach Ablehnung durch');
                const success = game.nextPlayer();
                if (success) {
                  this.io.to(gameId).emit('turn_ended', {
                    nextPlayer: game.getCurrentPlayer().getPublicData(),
                    gameState: game.getGameState()
                  });
                }
              }
            }, 1000);
          }
        }
      });

      // === AUKTIONS-SYSTEM SOCKET HANDLERS ===

      // Gebot in Auktion abgeben
      socket.on('place_bid', (data) => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Spiel nicht gefunden' });
          return;
        }

        const result = game.placeBid(socket.id, data.bidAmount);
        
        if (result.success) {
          this.io.to(gameId).emit('bid_placed', {
            auction: result.auction,
            bidder: result.bidder,
            bidAmount: data.bidAmount,
            gameState: game.getGameState()
          });
          
          this.broadcastGameEvent(gameId, 
            `💰 ${result.bidder} bietet ${data.bidAmount}M für ${result.auction.property.name}`
          );
          
          console.log(`Gebot von ${result.bidder}: ${data.bidAmount}M für ${result.auction.property.name}`);
        } else {
          socket.emit('error', { message: result.error });
        }
      });

      // In Auktion passen
      socket.on('pass_auction', () => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Spiel nicht gefunden' });
          return;
        }

        const player = game.players.get(socket.id);
        const result = game.passAuction(socket.id);
        
        if (result.success) {
          if (result.winner !== undefined) {
            // Auktion beendet
            this.io.to(gameId).emit('auction_ended', {
              result: result,
              gameState: game.getGameState()
            });
            
            if (result.sold && result.winner) {
              this.broadcastGameEvent(gameId, 
                `🎉 ${result.winnerName} gewinnt ${result.property.name} für ${result.finalPrice}M!`
              );
            } else {
              this.broadcastGameEvent(gameId, 
                `🔨 Auktion für ${result.property.name} beendet - kein Verkauf`
              );
            }
            
            // Nach Auktion Spielerwechsel wenn nötig
            const currentPlayer = game.getCurrentPlayer();
            if (!game.lastDiceRoll?.isDouble) {
              // SOFORT hasRolled setzen um weiteres Würfeln zu verhindern
              currentPlayer.hasRolled = true;
              console.log('hasRolled auf true gesetzt nach Auktion (kein Pasch)');
              
              setTimeout(() => {
                if (game.getCurrentPlayer().id === currentPlayer.id && !game.turnInProgress) {
                  console.log('Führe Spielerwechsel nach Auktion durch');
                  const success = game.nextPlayer();
                  if (success) {
                    this.io.to(gameId).emit('turn_ended', {
                      nextPlayer: game.getCurrentPlayer().getPublicData(),
                      gameState: game.getGameState()
                    });
                  }
                }
              }, 3000);
            }
          } else {
            // Spieler hat gepasst, Auktion geht weiter
            this.io.to(gameId).emit('player_passed_auction', {
              auction: result.auction,
              player: player.name,
              gameState: game.getGameState()
            });
            
            this.broadcastGameEvent(gameId, `${player.name} passt in der Auktion`);
          }
        } else {
          socket.emit('error', { message: result.error });
        }
      });

      // === ENDE AUKTIONS-SYSTEM ===

      // Karte ziehen
      socket.on('draw_card', (data) => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) return;
        
        const card = game.drawCard(data.cardType);
        
        if (!card) {
          console.error(`Keine Karte gefunden für cardType: ${data.cardType}`);
          socket.emit('error', { message: 'Karte konnte nicht gezogen werden' });
          return;
        }
        
        socket.emit('card_drawn', {
          card: card,
          cardType: data.cardType
        });
        
        console.log(`${game.getCurrentPlayer().name} zieht ${data.cardType === 'chance' ? 'Ereignis' : 'Gemeinschafts'}karte: ${card.text}`);
        this.broadcastGameEvent(gameId, `${game.getCurrentPlayer().name} zieht eine ${data.cardType === 'chance' ? 'Ereignis' : 'Gemeinschafts'}karte: ${card.text}`);
      });

      // Kartenaktion ausführen
      socket.on('execute_card_action', (data) => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) return;
        
        const result = game.executeCardAction(socket.id, data.action);
        
        // Prüfe auf Bankrott-Ereignisse in den Ergebnissen
        if (result.success && result.results) {
          result.results.forEach(actionResult => {
            if (actionResult.type === 'player_bankrupt') {
              const player = game.players.get(socket.id);
              this.broadcastGameEvent(gameId, `${player.name} ist bankrott! Liquidiert ${actionResult.amountRaised}M, aber benötigt ${actionResult.requiredAmount}M`);
              
              // Zeige Liquidations-Details
              if (actionResult.liquidationLog) {
                actionResult.liquidationLog.forEach(entry => {
                  this.broadcastGameEvent(gameId, `💸 ${player.name}: ${entry}`);
                });
              }
              
              // Prüfe Spielende
              const activePlayers = Array.from(game.players.values()).filter(p => !p.isBankrupt);
              if (activePlayers.length <= 1 && activePlayers.length > 0) {
                this.broadcastGameEvent(gameId, `🎉 ${activePlayers[0].name} gewinnt das Spiel!`);
                game.gamePhase = 'finished';
              }
            } else if (actionResult.type === 'automatic_liquidation') {
              const player = game.players.get(socket.id);
              this.broadcastGameEvent(gameId, `${player.name} musste automatisch Vermögen liquidieren: ${actionResult.amountRaised}M`);
              
              // Zeige Liquidations-Details
              if (actionResult.liquidationLog) {
                actionResult.liquidationLog.forEach(entry => {
                  this.broadcastGameEvent(gameId, `💸 ${player.name}: ${entry}`);
                });
              }
            } else if (actionResult.type === 'jail_free_card_used') {
              const player = game.players.get(socket.id);
              this.broadcastGameEvent(gameId, `${player.name} würde ins Gefängnis müssen, aber verwendet automatisch einen Freibrief! (${actionResult.remainingJailFreeCards} übrig)`);
              console.log(`${player.name} verwendet automatisch Freibrief durch Karte`);
            }
          });
        }
        
        this.io.to(gameId).emit('card_action_executed', {
          playerId: socket.id,
          action: data.action,
          result: result,
          gameState: game.getGameState()
        });

        const currentPlayer = game.getCurrentPlayer();
        
        // Prüfe ob Bewegung stattgefunden hat und führe Feldaktionen aus
        let shouldCheckFieldActions = false;
        if (result.success && result.results) {
          result.results.forEach(actionResult => {
            if (actionResult.type === 'move' && actionResult.success) {
              shouldCheckFieldActions = true;
              
              // Prüfe Los-Passierung bei Kartenbewegung
              if (actionResult.passedGo) {
                this.broadcastGameEvent(gameId, `${currentPlayer.name} kommt über Los und erhält 200M`);
              }
            }
          });
        }
        
        if (shouldCheckFieldActions) {
          console.log(`Prüfe Feldaktionen nach Kartenbewegung für ${currentPlayer.name} auf Position ${currentPlayer.position}`);
          const fieldActions = this.handleFieldAction(game, currentPlayer);
          
          if (fieldActions.length > 0) {
            this.io.to(gameId).emit('field_actions', {
              playerId: socket.id,
              actions: fieldActions,
              gameState: game.getGameState()
            });
            
            // Wenn buy_offer dabei ist, nicht weitermachen
            const hasBuyOffer = fieldActions.some(action => action.type === 'buy_offer');
            if (hasBuyOffer) {
              return; // Warten auf Kaufentscheidung
            }
          }
        }
        
        if (data.action.action === 'go_to_jail') {
          // SOFORT hasRolled setzen um weiteres Würfeln zu verhindern
          currentPlayer.hasRolled = true;
          console.log('hasRolled auf true gesetzt nach Gefängnis (kein Pasch)');
          
          setTimeout(() => {
            if (game.getCurrentPlayer().id === socket.id && !game.turnInProgress) {
              console.log('Führe Spielerwechsel nach Gefängnis durch');
              const success = game.nextPlayer();
              if (success) {
                this.io.to(gameId).emit('turn_ended', {
                  nextPlayer: game.getCurrentPlayer().getPublicData(),
                  gameState: game.getGameState()
                });
              }
            }
          }, 2000);
          return;
        }

        if (data.action.action === 'buy_offer') {
          socket.emit('buy_offer', {
            property: game.board[currentPlayer.position]
          });
          return;
        }

        // Nur Spielerwechsel wenn kein Kaufangebot angezeigt wird
        const lastRoll = game.lastDiceRoll;
        if (!lastRoll || !lastRoll.isDouble) {
          // SOFORT hasRolled setzen um weiteres Würfeln zu verhindern
          currentPlayer.hasRolled = true;
          console.log('hasRolled auf true gesetzt nach automatischem Spielerwechsel (kein Pasch)');
          
          setTimeout(() => {
            if (game.getCurrentPlayer().id === socket.id && !game.turnInProgress) {
              console.log('Führe automatischen Spielerwechsel durch');
              const success = game.nextPlayer();
              if (success) {
                this.io.to(gameId).emit('turn_ended', {
                  nextPlayer: game.getCurrentPlayer().getPublicData(),
                  gameState: game.getGameState()
                });
              }
            }
          }, 3000);
        }
      });

      // Haus bauen
      socket.on('build_house', (data) => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) return;
        
        // Prüfe ob Spieler am Zug ist
        const currentPlayer = game.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.id !== socket.id) {
          socket.emit('error', { message: 'Du kannst nur während deines Zuges bauen' });
          return;
        }
        
        const result = game.buildHouse(socket.id, data.position);
        
        if (result.success) {
          if (result.autoHotel) {
            // Automatische Hotel-Erstellung
            this.io.to(gameId).emit('hotel_built', {
              playerId: socket.id,
              position: data.position,
              gameState: game.getGameState(),
              autoConverted: true
            });
            
            this.broadcastGameEvent(gameId, `${game.getPlayerName(socket.id)} baut das 4. Haus auf ${game.board[data.position].name} → Automatisch zu Hotel umgewandelt! 🏨`);
          } else {
            // Normaler Hausbau
            this.io.to(gameId).emit('house_built', {
              playerId: socket.id,
              position: data.position,
              gameState: game.getGameState()
            });
            
            this.broadcastGameEvent(gameId, `${game.getPlayerName(socket.id)} baut ein Haus auf ${game.board[data.position].name}`);
          }
        } else {
          socket.emit('error', { message: result.error });
        }
      });

      // Hotel bauen
      socket.on('build_hotel', (data) => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) return;
        
        // Prüfe ob Spieler am Zug ist
        const currentPlayer = game.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.id !== socket.id) {
          socket.emit('error', { message: 'Du kannst nur während deines Zuges bauen' });
          return;
        }
        
        const result = game.buildHotel(socket.id, data.position);
        
        if (result.success) {
          this.io.to(gameId).emit('hotel_built', {
            playerId: socket.id,
            position: data.position,
            gameState: game.getGameState()
          });
          
          this.broadcastGameEvent(gameId, `${game.getPlayerName(socket.id)} baut ein Hotel auf ${game.board[data.position].name}`);
        } else {
          socket.emit('error', { message: result.error });
        }
      });

      // Haus verkaufen
      socket.on('sell_house', (data) => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) return;
        
        // Prüfe ob Spieler am Zug ist
        const currentPlayer = game.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.id !== socket.id) {
          socket.emit('error', { message: 'Du kannst nur während deines Zuges verkaufen' });
          return;
        }
        
        const result = game.sellHouse(socket.id, data.position);
        
        if (result.success) {
          this.io.to(gameId).emit('house_sold', {
            playerId: socket.id,
            position: data.position,
            gameState: game.getGameState()
          });
          
          this.broadcastGameEvent(gameId, `${game.getPlayerName(socket.id)} verkauft ein Haus auf ${game.board[data.position].name}`);
        } else {
          socket.emit('error', { message: result.error });
        }
      });

      // Hotel verkaufen
      socket.on('sell_hotel', (data) => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) return;
        
        // Prüfe ob Spieler am Zug ist
        const currentPlayer = game.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.id !== socket.id) {
          socket.emit('error', { message: 'Du kannst nur während deines Zuges verkaufen' });
          return;
        }
        
        const result = game.sellHotel(socket.id, data.position);
        
        if (result.success) {
          this.io.to(gameId).emit('hotel_sold', {
            playerId: socket.id,
            position: data.position,
            gameState: game.getGameState()
          });
          
          this.broadcastGameEvent(gameId, `${game.getPlayerName(socket.id)} verkauft ein Hotel auf ${game.board[data.position].name}`);
        } else {
          socket.emit('error', { message: result.error });
        }
      });

      // Freibrief verwenden
      socket.on('use_jail_free_card', () => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) return;
        
        const currentPlayer = game.getPlayer(socket.id);
        if (!currentPlayer || !currentPlayer.inJail || currentPlayer.jailFreeCards <= 0) {
          socket.emit('error', { message: 'Kann Freibrief nicht verwenden' });
          return;
        }

        currentPlayer.jailFreeCards--;
        currentPlayer.inJail = false;
        currentPlayer.jailTurns = 0;

        this.io.to(gameId).emit('jail_free_card_used', {
          playerId: socket.id,
          gameState: game.getGameState()
        });

        this.broadcastGameEvent(gameId, `${currentPlayer.name} verwendet Freibrief und verlässt das Gefängnis`);
        console.log(`${currentPlayer.name} verwendet Freibrief und verlässt das Gefängnis`);
      });

            // === ENDE HANDELSSYSTEM ===

      // === HYPOTHEKEN-SYSTEM ===

      // Grundstück hypothekarisieren
      socket.on('mortgage_property', (data) => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Spiel nicht gefunden' });
          return;
        }

        // Prüfe ob Spieler am Zug ist
        const currentPlayer = game.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.id !== socket.id) {
          socket.emit('error', { message: 'Du kannst nur während deines Zuges Hypotheken aufnehmen' });
          return;
        }

        const result = game.mortgageProperty(socket.id, data.position);
        
        if (result.success) {
          this.io.to(gameId).emit('property_mortgaged', {
            playerId: socket.id,
            position: data.position,
            mortgageValue: result.mortgageValue,
            gameState: game.getGameState()
          });
          
          this.broadcastGameEvent(gameId, `${game.getPlayerName(socket.id)} nimmt Hypothek auf ${result.propertyName} für ${result.mortgageValue}M auf`);
        } else {
          socket.emit('error', { message: result.error });
        }
      });

      // Hypothek zurückkaufen
      socket.on('unmortgage_property', (data) => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Spiel nicht gefunden' });
          return;
        }

        // Prüfe ob Spieler am Zug ist
        const currentPlayer = game.getCurrentPlayer();
        if (!currentPlayer || currentPlayer.id !== socket.id) {
          socket.emit('error', { message: 'Du kannst nur während deines Zuges Hypotheken zurückkaufen' });
          return;
        }

        const result = game.unmortgageProperty(socket.id, data.position);
        
        if (result.success) {
          this.io.to(gameId).emit('property_unmortgaged', {
            playerId: socket.id,
            position: data.position,
            unmortgagePrice: result.unmortgagePrice,
            gameState: game.getGameState()
          });
          
          this.broadcastGameEvent(gameId, `${game.getPlayerName(socket.id)} löst Hypothek auf ${result.propertyName} für ${result.unmortgagePrice}M`);
        } else {
          socket.emit('error', { message: result.error });
        }
      });

      // === ENDE HYPOTHEKEN-SYSTEM ===

      // === LIQUIDATIONS-SYSTEM ===

      // Liquidation durchführen
      socket.on('perform_liquidation', (data) => {
        const gameId = this.getGameIdByPlayerId(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Spiel nicht gefunden' });
          return;
        }

        const result = game.performSelectedLiquidations(data.liquidationId, data.selections);
        
        if (result.success) {
          // Zeige Liquidations-Details im Chat
          result.liquidationLog.forEach(entry => {
            this.broadcastGameEvent(gameId, `💸 ${game.getPlayerName(socket.id)}: ${entry}`);
          });
          
          // Hole Liquidations-Daten für ursprünglichen Zahlungsgrund
          const liquidation = game.activeLiquidations?.get(data.liquidationId);
          if (liquidation) {
            // Versuche die ursprüngliche Zahlung nochmals
            if (liquidation.reason.includes('Miete')) {
              // Führe Mieten-Zahlung durch
              const player = game.players.get(socket.id);
              const rentResult = game.payRent(socket.id, player.position);
              
              if (rentResult.success) {
                const ownerName = game.getPlayerName(rentResult.ownerId);
                this.broadcastGameEvent(gameId, `${player.name} zahlt ${rentResult.rent}M Miete an ${ownerName} nach Liquidation`);
                
                this.io.to(gameId).emit('liquidation_completed', {
                  playerId: socket.id,
                  amountRaised: result.amountRaised,
                  liquidationLog: result.liquidationLog,
                  paymentCompleted: true,
                  gameState: game.getGameState()
                });
              }
            } else {
              // Andere Zahlungstypen (Steuern, Karten, etc.)
              this.io.to(gameId).emit('liquidation_completed', {
                playerId: socket.id,
                amountRaised: result.amountRaised,
                liquidationLog: result.liquidationLog,
                gameState: game.getGameState()
              });
            }
          }
          
          console.log(`Liquidation abgeschlossen: ${result.amountRaised}M aufgebracht`);
        } else {
          socket.emit('error', { message: result.error });
        }
      });

      // Bankrott erklären
      socket.on('declare_bankruptcy', (data) => {
        const gameId = this.getGameIdByPlayerId(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Spiel nicht gefunden' });
          return;
        }

        // Spieler als bankrott markieren
        game.handlePlayerBankruptcy(socket.id);
        
        this.io.to(gameId).emit('player_bankrupt', {
          playerId: socket.id,
          playerName: game.getPlayerName(socket.id),
          gameState: game.getGameState()
        });
        
        this.broadcastGameEvent(gameId, `💀 ${game.getPlayerName(socket.id)} ist bankrott und scheidet aus dem Spiel aus!`);
        
        // Prüfe Spielende
        const activePlayers = Array.from(game.players.values()).filter(p => !p.isBankrupt);
        if (activePlayers.length <= 1 && activePlayers.length > 0) {
          this.broadcastGameEvent(gameId, `🎉 ${activePlayers[0].name} gewinnt das Spiel!`);
          game.gamePhase = 'finished';
        }
      });

      // === ENDE LIQUIDATIONS-SYSTEM ===

      // Handelsangebot senden
      socket.on('initiate_trade', (data) => {
        const gameId = this.getGameIdByPlayerId(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Spiel nicht gefunden' });
          return;
        }

        const result = game.initiateTradeOffer(socket.id, data.targetId, data.offer);
        
        if (result.success) {
          // Angebot an Zielspieler senden
          const targetSocket = this.getSocketByPlayerId(data.targetId);
          if (targetSocket) {
            targetSocket.emit('trade_offer_received', {
              tradeId: result.tradeId,
              initiator: game.getPlayerName(socket.id),
              offer: data.offer
            });
          }

          // Bestätigung an Initiator
          socket.emit('trade_offer_sent', {
            tradeId: result.tradeId,
            target: game.getPlayerName(data.targetId)
          });

          console.log(`Handelsangebot ${result.tradeId} von ${game.getPlayerName(socket.id)} an ${game.getPlayerName(data.targetId)}`);
        } else {
          socket.emit('error', { message: result.error });
        }
      });

      // Handelsangebot annehmen
      socket.on('accept_trade', (data) => {
        const gameId = this.getGameIdByPlayerId(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Spiel nicht gefunden' });
          return;
        }

        const result = game.acceptTradeOffer(data.tradeId, socket.id);
        
        if (result.success) {
          this.io.to(gameId).emit('trade_completed', {
            tradeId: data.tradeId,
            trade: result.trade,
            gameState: game.getGameState()
          });

          this.broadcastGameEvent(gameId, 
            `🤝 Handel abgeschlossen: ${result.trade.initiator} ⟷ ${result.trade.target}`
          );

          console.log(`Handel ${data.tradeId} abgeschlossen zwischen ${result.trade.initiator} und ${result.trade.target}`);
        } else {
          socket.emit('error', { message: result.error });
        }
      });

      // Handelsangebot ablehnen
      socket.on('reject_trade', (data) => {
        const gameId = this.getGameIdByPlayerId(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Spiel nicht gefunden' });
          return;
        }

        const result = game.rejectTradeOffer(data.tradeId, socket.id);
        
        if (result.success) {
          console.log(`Handelsangebot ${data.tradeId} abgelehnt von ${game.getPlayerName(socket.id)}`);
        } else {
          socket.emit('error', { message: result.error });
        }
      });

      // Handelsangebot abbrechen
      socket.on('cancel_trade', (data) => {
        const gameId = this.getGameIdByPlayerId(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) {
          socket.emit('error', { message: 'Spiel nicht gefunden' });
          return;
        }

        const result = game.cancelTradeOffer(data.tradeId, socket.id);
        
        if (result.success) {
          console.log(`Handelsangebot ${data.tradeId} abgebrochen von ${game.getPlayerName(socket.id)}`);
        } else {
          socket.emit('error', { message: result.error });
        }
      });

      // === CHAT SYSTEM ===
      
      // Chat-Nachricht
      socket.on('chat_message', (data) => {
        const gameId = this.playerGames.get(socket.id);
        const game = this.games.get(gameId);
        
        if (!game) return;
        
        const player = game.players.get(socket.id);
        if (!player) return;
        
        const message = data.message?.trim();
        if (!message || message.length === 0 || message.length > 200) {
          return;
        }
        
        // Nachricht an alle Spieler im Spiel senden
        this.io.to(gameId).emit('chat_message', {
          sender: player.name,
          senderId: socket.id,
          message: message,
          timestamp: Date.now()
        });
        
        console.log(`Chat [${gameId}] ${player.name}: ${message}`);
      });

      // Client trennen
      socket.on('disconnect', () => {
        console.log(`Client ${socket.id} getrennt`);
        
        const gameId = this.playerGames.get(socket.id);
        if (gameId) {
          const game = this.games.get(gameId);
          if (game) {
            game.removePlayer(socket.id);
            
            if (game.players.size === 0) {
              this.games.delete(gameId);
            } else {
              this.io.to(gameId).emit('player_left', {
                playerId: socket.id,
                gameState: game.getGameState()
              });
            }
          }
          
          this.playerGames.delete(socket.id);
        }
      });
    });
  }

  // Hilfsmethode für Socket-Suche
  getSocketByPlayerId(playerId) {
    for (const socket of this.io.sockets.sockets.values()) {
      if (socket.id === playerId) {
        return socket;
      }
    }
    return null;
  }

  // Spielereignis an alle Clients senden
  broadcastGameEvent(gameId, message) {
    this.io.to(gameId).emit('game_event', { message });
    console.log(`Broadcast: ${message}`);
  }

  // Game-ID anhand Spieler-ID finden
  getGameIdByPlayerId(playerId) {
    return this.playerGames.get(playerId);
  }

  handleFieldAction(game, player) {
    const gameId = this.getGameIdByPlayerId(player.id);
    const field = game.board[player.position];
    const actions = [];

    console.log(`Spieler ${player.name} landet auf Feld ${player.position}: ${field.name}`);

    switch (field.type) {
      case 'property':
      case 'railroad':
      case 'utility':
        const ownerId = game.propertyOwnership.get(player.position);
        if (ownerId && ownerId !== player.id) {
          const rentResult = game.payRent(player.id, player.position);
          
          if (rentResult.requiresLiquidation) {
            // Spieler muss liquidieren - sende Liquidations-Modal
            this.io.to(player.id).emit('liquidation_required', rentResult.liquidationData);
            
            // Temporär keine weiteren Aktionen - warten auf Liquidation
            actions.push({
              type: 'waiting_for_liquidation',
              message: `${player.name} muss Vermögen liquidieren für Miete`
            });
            
            this.broadcastGameEvent(gameId, `${player.name} muss Vermögen liquidieren um Miete zu zahlen`);
          } else if (rentResult.success && rentResult.rent > 0) {
            const ownerName = game.getPlayerName(rentResult.ownerId);
            actions.push({
              type: 'rent_paid',
              amount: rentResult.rent,
              ownerId: rentResult.ownerId,
              playerBankrupt: rentResult.playerBankrupt || false
            });
            
            if (rentResult.playerBankrupt) {
              this.broadcastGameEvent(gameId, `${player.name} ist bankrott! Zahlt ${rentResult.rent}M Miete an ${ownerName} für ${field.name}`);
              
              // Prüfe Spielende
              const activePlayers = Array.from(game.players.values()).filter(p => !p.isBankrupt);
              if (activePlayers.length <= 1 && activePlayers.length > 0) {
                this.broadcastGameEvent(gameId, `🎉 ${activePlayers[0].name} gewinnt das Spiel!`);
                game.gamePhase = 'finished';
              }
            } else {
              this.broadcastGameEvent(gameId, `${player.name} zahlt ${rentResult.rent}M Miete an ${ownerName} für ${field.name}`);
            }
            
            console.log(`Miete von ${rentResult.rent}M an ${ownerName} gezahlt`);
          }
        } else if (!ownerId) {
          actions.push({
            type: 'buy_offer',
            property: field
          });
          console.log(`Kaufangebot für ${field.name} (${field.price}M)`);
        }
        break;

      case 'tax':
        const taxAmount = field.rent[0];
        if (player.money >= taxAmount) {
          // Spieler hat genug Bargeld
          player.removeMoney(taxAmount);
          // Steuer zum Frei-Parken-Topf hinzufügen
          game.addToFreeParkingPot(taxAmount);
          actions.push({
            type: 'tax_paid',
            amount: taxAmount,
            freeParkingPot: game.getFreeParkingPot()
          });
          this.broadcastGameEvent(gameId, `${player.name} zahlt ${taxAmount}M ${field.name}`);
          console.log(`Steuer von ${taxAmount}M gezahlt`);
        } else {
          // Automatische Liquidation versuchen
          const bankruptcyCheck = game.checkBankruptcy(player.id, taxAmount);
          
          if (bankruptcyCheck.isBankrupt) {
            // Spieler ist wirklich bankrott nach Liquidation
            actions.push({
              type: 'player_bankrupt',
              amount: bankruptcyCheck.amountRaised,
              requiredAmount: taxAmount,
              liquidationLog: bankruptcyCheck.liquidationLog
            });
            this.broadcastGameEvent(gameId, `${player.name} ist bankrott! Liquidiert ${bankruptcyCheck.amountRaised}M, aber benötigt ${taxAmount}M für ${field.name}`);
            
            // Zeige Liquidations-Details
            bankruptcyCheck.liquidationLog.forEach(entry => {
              this.broadcastGameEvent(gameId, `💸 ${player.name}: ${entry}`);
            });
            
            console.log(`${player.name} ist bankrott bei ${field.name}! Liquidiert: ${bankruptcyCheck.amountRaised}M, benötigt: ${taxAmount}M`);
            
            // Prüfe Spielende
            const activePlayers = Array.from(game.players.values()).filter(p => !p.isBankrupt);
            if (activePlayers.length <= 1 && activePlayers.length > 0) {
              this.broadcastGameEvent(gameId, `🎉 ${activePlayers[0].name} gewinnt das Spiel!`);
              game.gamePhase = 'finished';
            }
          } else if (bankruptcyCheck.canPay) {
            // Spieler kann zahlen nach automatischer Liquidation
            const totalAvailable = player.money + bankruptcyCheck.amountRaised;
            player.removeMoney(taxAmount);
            // Steuer zum Frei-Parken-Topf hinzufügen
            game.addToFreeParkingPot(taxAmount);
            
            actions.push({
              type: 'tax_paid',
              amount: taxAmount,
              liquidated: true,
              liquidationLog: bankruptcyCheck.liquidationLog,
              freeParkingPot: game.getFreeParkingPot()
            });
            
            this.broadcastGameEvent(gameId, `${player.name} liquidiert Vermögen und zahlt ${taxAmount}M ${field.name}`);
            
            // Zeige Liquidations-Details
            bankruptcyCheck.liquidationLog.forEach(entry => {
              this.broadcastGameEvent(gameId, `💰 ${player.name}: ${entry}`);
            });
            
            console.log(`${player.name} zahlt ${taxAmount}M nach Liquidation von ${bankruptcyCheck.amountRaised}M`);
          }
        }
        break;

      case 'go-to-jail':
        // Pasch-Counter zurücksetzen bei Gefängnis durch Feld
        game.consecutiveDoubles = 0;
        const jailResult = player.goToJail();
        if (jailResult.usedJailFreeCard) {
          actions.push({ 
            type: 'jail_free_card_used_automatically',
            remainingJailFreeCards: jailResult.remainingJailFreeCards
          });
          this.broadcastGameEvent(gameId, `${player.name} würde ins Gefängnis müssen, aber verwendet automatisch einen Freibrief!`);
          console.log(`${player.name} verwendet automatisch Freibrief statt ins Gefängnis zu gehen`);
        } else {
          actions.push({ type: 'sent_to_jail' });
          this.broadcastGameEvent(gameId, `${player.name} muss ins Gefängnis!`);
          console.log(`${player.name} muss ins Gefängnis!`);
        }
        break;

      case 'chance':
      case 'community':
        actions.push({
          type: 'draw_card_required',
          cardType: field.type,
          playerId: player.id  // Wichtig: Welcher Spieler die Karte ziehen soll
        });
        console.log(`${player.name} muss eine ${field.type === 'chance' ? 'Ereignis' : 'Gemeinschafts'}karte ziehen`);
        break;

      case 'start':
        console.log(`${player.name} steht auf Los`);
        break;

      case 'jail':
        console.log(`${player.name} besucht das Gefängnis`);
        break;

      case 'free-parking':
        const potAmount = game.collectFreeParkingPot(player.id);
        if (potAmount > 0) {
          actions.push({
            type: 'free_parking_collected',
            playerId: player.id,
            amount: potAmount,
            freeParkingPot: game.getFreeParkingPot()
          });
          this.broadcastGameEvent(gameId, `🎉 ${player.name} sammelt ${potAmount}M aus dem Frei-Parken-Topf!`);
        } else {
          console.log(`${player.name} parkt frei - Topf ist leer`);
        }
        break;

      default:
        console.log(`${player.name} landet auf einem Spezialfeld: ${field.name}`);
        break;
    }

    return actions;
  }

  generateGameId() {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  start(port = 3000) {
    const tryPort = (currentPort) => {
      this.server.listen(currentPort, () => {
        console.log(`Monopoly Server läuft auf Port ${currentPort}`);
        console.log(`Öffne http://localhost:${currentPort} im Browser`);
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${currentPort} ist belegt, versuche Port ${currentPort + 1}`);
          tryPort(currentPort + 1);
        } else {
          console.error('Server-Fehler:', err);
        }
      });
    };
    
    tryPort(port);
  }
}

module.exports = GameServer;

// Server starten wenn direkt ausgeführt
if (require.main === module) {
  const server = new GameServer();
  server.start();
}