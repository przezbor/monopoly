/**
 * Monopoly Spielbrett-Definitionen
 * Alle 40 Felder des originalen Monopoly-Spiels
 */

const BOARD_FIELDS = [
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
  
  // Ereignisfeld
  { position: 36, name: "Ereignisfeld", type: "chance", color: null, price: 0, rent: [0], mortgage: 0 },
  
  // Dunkelblaue Gruppe
  { position: 37, name: "Schlossallee", type: "property", color: "dark-blue", price: 350, rent: [35, 175, 500, 1100, 1300, 1500], mortgage: 175, houseCost: 200 },
  { position: 38, name: "Zusatzsteuer", type: "tax", color: null, price: 0, rent: [100], mortgage: 0 },
  { position: 39, name: "Parkstraße", type: "property", color: "dark-blue", price: 400, rent: [50, 200, 600, 1400, 1700, 2000], mortgage: 200, houseCost: 200 }
];

// Kartendecks
const CHANCE_CARDS = [
  { id: 1, text: "Rücke vor bis auf Los", action: "move_to", target: 0 },
  { id: 2, text: "Rücke vor bis zur Chausseestraße", action: "move_to", target: 8 },
  { id: 3, text: "Rücke vor bis zum Opernplatz", action: "move_to", target: 14 },
  { id: 4, text: "Rücke vor bis zum nächsten Bahnhof", action: "move_to_nearest", target: "railroad" },
  { id: 5, text: "Rücke vor bis zum nächsten Werk", action: "move_to_nearest", target: "utility" },
  { id: 6, text: "Die Bank zahlt Ihnen 50 M", action: "receive_money", amount: 50 },
  { id: 7, text: "Du erhältst einen Freibrief", action: "jail_free_card" },
  { id: 8, text: "Gehe 3 Felder zurück", action: "move_relative", steps: -3 },
  { id: 9, text: "Gehe ins Gefängnis", action: "go_to_jail" },
  { id: 10, text: "Zahle 15 M Strafe", action: "pay_money", amount: 15 },
  { id: 11, text: "Zahle jedem Spieler 50 M", action: "pay_all_players", amount: 50 },
  { id: 12, text: "Du wirst zum Vorsitzenden des Aufsichtsrates gewählt - zahle jedem Spieler 50 M", action: "pay_all_players", amount: 50 },
  { id: 13, text: "Lasse alle deine Häuser reparieren - zahle 25 M je Haus und 100 M je Hotel", action: "repair_buildings", house_cost: 25, hotel_cost: 100 },
  { id: 14, text: "Gehe zum Südbahnhof", action: "move_to", target: 25 },
  { id: 15, text: "Du erbst 100 M", action: "receive_money", amount: 100 },
  { id: 16, text: "Verkaufserlös einer Lebensversicherung - erhalte 100 M", action: "receive_money", amount: 100 }
];

const COMMUNITY_CARDS = [
  { id: 1, text: "Rücke vor bis auf Los", action: "move_to", target: 0 },
  { id: 2, text: "Die Bank zahlt dir einen Fehler aus - erhalte 200 M", action: "receive_money", amount: 200 },
  { id: 3, text: "Arztkosten - zahle 50 M", action: "pay_money", amount: 50 },
  { id: 4, text: "Erhalte 25 M Aktienertrag", action: "receive_money", amount: 25 },
  { id: 5, text: "Du erhältst einen Freibrief", action: "jail_free_card" },
  { id: 6, text: "Gehe ins Gefängnis", action: "go_to_jail" },
  { id: 7, text: "Nachzahlung der Einkommensteuer - erhalte 20 M", action: "receive_money", amount: 20 },
  { id: 8, text: "Du hast Geburtstag - jeder Spieler schenkt dir 10 M", action: "receive_from_all", amount: 10 },
  { id: 9, text: "Lebensversicherung wird fällig - erhalte 100 M", action: "receive_money", amount: 100 },
  { id: 10, text: "Krankenhaus-Gebühren - zahle 100 M", action: "pay_money", amount: 100 },
  { id: 11, text: "Schulgebühren - zahle 50 M", action: "pay_money", amount: 50 },
  { id: 12, text: "Erhalte 100 M Beratungshonorar", action: "receive_money", amount: 100 },
  { id: 13, text: "Du wirst zu Straßenausbesserungsarbeiten herangezogen - zahle 40 M je Haus und 115 M je Hotel", action: "repair_buildings", house_cost: 40, hotel_cost: 115 },
  { id: 14, text: "Du wirst Zweiter in einem Schönheitswettbewerb - erhalte 10 M", action: "receive_money", amount: 10 },
  { id: 15, text: "Du erbst 100 M", action: "receive_money", amount: 100 },
  { id: 16, text: "Verkaufserlös einer Lebensversicherung - erhalte 100 M", action: "receive_money", amount: 100 }
];

module.exports = {
  BOARD_FIELDS,
  CHANCE_CARDS,
  COMMUNITY_CARDS
};