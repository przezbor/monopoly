/**
 * Audio Manager für Monopoly
 * Generiert Sounds mit der Web Audio API ohne externe Audio-Dateien
 */
class AudioManager {
  constructor() {
    this.audioContext = null;
    this.isEnabled = true;
    this.masterVolume = 0.3; // 30% Lautstärke als Standard
    
    // Initialisiere Audio Context beim ersten User-Interaction
    this.initialized = false;
    
    console.log('AudioManager erstellt - bereit für Initialisierung');
  }

  // Audio Context initialisieren (benötigt User-Interaction)
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Moderne Browser
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Falls der Browser den Context in suspended state startet
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.initialized = true;
      console.log('Audio-System erfolgreich initialisiert');
    } catch (error) {
      console.warn('Audio-System konnte nicht initialisiert werden:', error);
      this.isEnabled = false;
    }
  }

  // Lautstärke setzen (0.0 - 1.0)
  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  // Audio ein-/ausschalten
  toggleAudio() {
    this.isEnabled = !this.isEnabled;
    return this.isEnabled;
  }

  // Basis-Oszillator erstellen
  createOscillator(frequency, type = 'sine') {
    if (!this.isEnabled || !this.initialized) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = type;
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    
    return { oscillator, gainNode };
  }

  // === SPIEL-SOUNDS ===

  // Würfel-Roll-Sound
  playDiceRoll() {
    if (!this.initialized) return;
    
    try {
      // Rasselnder Würfel-Sound mit mehreren kurzen Tönen
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          const sound = this.createOscillator(200 + Math.random() * 300, 'square');
          if (!sound) return;
          
          const { oscillator, gainNode } = sound;
          
          // Kurzer, knackiger Ton
          const now = this.audioContext.currentTime;
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.1, now + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          
          oscillator.start(now);
          oscillator.stop(now + 0.05);
        }, i * 20);
      }
    } catch (error) {
      console.warn('Dice roll sound error:', error);
    }
  }

  // Geld-Sound (Kassa)
  playMoneySound(isReceive = true) {
    if (!this.initialized) return;
    
    try {
      const frequency = isReceive ? 800 : 400; // Höher für Geld erhalten, tiefer für bezahlen
      const sound = this.createOscillator(frequency, 'triangle');
      if (!sound) return;
      
      const { oscillator, gainNode } = sound;
      
      // Angenehmer Geld-Ping
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.15, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      // Frequenz-Modulation für "Klingeln"
      oscillator.frequency.linearRampToValueAtTime(frequency * 1.2, now + 0.1);
      oscillator.frequency.linearRampToValueAtTime(frequency, now + 0.2);
      
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch (error) {
      console.warn('Money sound error:', error);
    }
  }

  // Karten-Zieh-Sound
  playCardDraw() {
    if (!this.initialized) return;
    
    try {
      // "Whoosh" Sound für Karte ziehen
      const sound = this.createOscillator(600, 'sawtooth');
      if (!sound) return;
      
      const { oscillator, gainNode } = sound;
      
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.08, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      // Fallende Frequenz für "Whoosh"
      oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.15);
      
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch (error) {
      console.warn('Card draw sound error:', error);
    }
  }

  // Button-Click-Sound
  playButtonClick() {
    if (!this.initialized) return;
    
    try {
      const sound = this.createOscillator(1000, 'square');
      if (!sound) return;
      
      const { oscillator, gainNode } = sound;
      
      // Kurzer Click
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.05, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      
      oscillator.start(now);
      oscillator.stop(now + 0.03);
    } catch (error) {
      console.warn('Button click sound error:', error);
    }
  }

  // Erfolg-Sound (z.B. Grundstück gekauft)
  playSuccess() {
    if (!this.initialized) return;
    
    try {
      // Aufsteigende Akkord-Folge
      const frequencies = [523, 659, 784]; // C, E, G
      
      frequencies.forEach((freq, index) => {
        setTimeout(() => {
          const sound = this.createOscillator(freq, 'sine');
          if (!sound) return;
          
          const { oscillator, gainNode } = sound;
          
          const now = this.audioContext.currentTime;
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.1, now + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          
          oscillator.start(now);
          oscillator.stop(now + 0.3);
        }, index * 100);
      });
    } catch (error) {
      console.warn('Success sound error:', error);
    }
  }

  // Fehler-Sound
  playError() {
    if (!this.initialized) return;
    
    try {
      // Tiefer, unangenehmer Ton
      const sound = this.createOscillator(150, 'sawtooth');
      if (!sound) return;
      
      const { oscillator, gainNode } = sound;
      
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.1, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      
      oscillator.start(now);
      oscillator.stop(now + 0.2);
    } catch (error) {
      console.warn('Error sound error:', error);
    }
  }

  // Gewinner-Fanfare
  playWinnerFanfare() {
    if (!this.initialized) return;
    
    try {
      // Triumphale Melodie
      const melody = [
        { freq: 523, duration: 0.2 }, // C
        { freq: 659, duration: 0.2 }, // E
        { freq: 784, duration: 0.2 }, // G
        { freq: 1047, duration: 0.4 }, // C (höher)
        { freq: 784, duration: 0.2 }, // G
        { freq: 1047, duration: 0.6 }  // C (finale)
      ];
      
      let currentTime = 0;
      melody.forEach(note => {
        setTimeout(() => {
          const sound = this.createOscillator(note.freq, 'sine');
          if (!sound) return;
          
          const { oscillator, gainNode } = sound;
          
          const now = this.audioContext.currentTime;
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.15, now + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + note.duration);
          
          oscillator.start(now);
          oscillator.stop(now + note.duration);
        }, currentTime * 1000);
        
        currentTime += note.duration;
      });
    } catch (error) {
      console.warn('Winner fanfare sound error:', error);
    }
  }

  // Auktions-Gong
  playAuctionGong() {
    if (!this.initialized) return;
    
    try {
      const sound = this.createOscillator(200, 'sine');
      if (!sound) return;
      
      const { oscillator, gainNode } = sound;
      
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.2, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      
      // Vibrierende Frequenz für Gong-Effekt
      oscillator.frequency.setValueAtTime(200, now);
      oscillator.frequency.linearRampToValueAtTime(180, now + 0.5);
      oscillator.frequency.linearRampToValueAtTime(160, now + 1.5);
      
      oscillator.start(now);
      oscillator.stop(now + 1.5);
    } catch (error) {
      console.warn('Auction gong sound error:', error);
    }
  }

  // Gefängnis-Sound (Metall-Klirren)
  playJailSound() {
    if (!this.initialized) return;
    
    try {
      // Mehrere metallische Töne für "Gitterstäbe"
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const sound = this.createOscillator(300 + i * 100, 'square');
          if (!sound) return;
          
          const { oscillator, gainNode } = sound;
          
          const now = this.audioContext.currentTime;
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.08, now + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          
          oscillator.start(now);
          oscillator.stop(now + 0.1);
        }, i * 50);
      }
    } catch (error) {
      console.warn('Jail sound error:', error);
    }
  }
}

// Globale Audio-Manager Instanz
let audioManager = null;

// Audio-Manager initialisieren und zurückgeben
function getAudioManager() {
  if (!audioManager) {
    audioManager = new AudioManager();
  }
  return audioManager;
}

// Für Browser Export
if (typeof window !== 'undefined') {
  window.AudioManager = AudioManager;
  window.getAudioManager = getAudioManager;
}

// Für Node.js Export (falls nötig)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AudioManager, getAudioManager };
}