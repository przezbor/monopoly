/**
 * Monopoly Game Utils
 * Hilfsfunktionen für das Monopoly-Spiel
 */

class GameUtils {
  // Farben für Spieler
  static PLAYER_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

  // Formatiere Geldbeträge
  static formatMoney(amount) {
    return `${amount}M`;
  }

  // Validiere Spielernamen
  static validatePlayerName(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Name ist erforderlich' };
    }
    
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Name darf nicht leer sein' };
    }
    
    if (trimmed.length > 20) {
      return { valid: false, error: 'Name zu lang (max. 20 Zeichen)' };
    }
    
    if (!/^[a-zA-Z0-9äöüßÄÖÜ\s_-]+$/.test(trimmed)) {
      return { valid: false, error: 'Name enthält ungültige Zeichen' };
    }
    
    return { valid: true, name: trimmed };
  }

  // Validiere Game-ID
  static validateGameId(gameId) {
    if (!gameId || typeof gameId !== 'string') {
      return { valid: false, error: 'Spiel-ID ist erforderlich' };
    }
    
    const trimmed = gameId.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Spiel-ID darf nicht leer sein' };
    }
    
    return { valid: true, gameId: trimmed };
  }

  // Berechne Würfelwahrscheinlichkeiten
  static getDicePercentage(sum) {
    const combinations = {
      2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6,
      8: 5, 9: 4, 10: 3, 11: 2, 12: 1
    };
    
    const total = 36;
    const count = combinations[sum] || 0;
    return Math.round((count / total) * 100);
  }

  // Debug-Logging
  static log(message, type = 'info') {
    if (process.env.NODE_ENV !== 'production') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    }
  }

  // Sichere JSON-Parsing
  static safeJsonParse(str, fallback = null) {
    try {
      return JSON.parse(str);
    } catch (e) {
      this.log(`JSON Parse Error: ${e.message}`, 'error');
      return fallback;
    }
  }

  // Sichere Array-Suche
  static findInArray(array, predicate, fallback = null) {
    try {
      const result = array.find(predicate);
      return result !== undefined ? result : fallback;
    } catch (e) {
      this.log(`Array Find Error: ${e.message}`, 'error');
      return fallback;
    }
  }

  // Zufällige Spiel-ID generieren (fallback)
  static generateGameId() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }
}

// Für Node.js Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameUtils;
}

// Für Browser Global
if (typeof window !== 'undefined') {
  window.GameUtils = GameUtils;
}