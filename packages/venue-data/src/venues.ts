import type { Venue } from './types';

export const stockholmVenues: Venue[] = [
  // Södermalm
  { id: 'urban-deli-nytorget', name: 'Urban Deli Nytorget', lat: 59.3148, lng: 18.0754, type: 'restaurant', neighborhood: 'Södermalm', address: 'Nytorget 4', openingHours: '08:00–23:00' },
  { id: 'kvarnen', name: 'Kvarnen', lat: 59.3139, lng: 18.0729, type: 'pub', neighborhood: 'Södermalm', address: 'Tjärhovsgatan 4', openingHours: '11:00–01:00' },
  { id: 'akkurat', name: 'Akkurat', lat: 59.3202, lng: 18.0634, type: 'bar', neighborhood: 'Södermalm', address: 'Hornsgatan 18', openingHours: '15:00–01:00' },
  { id: 'gondolen', name: 'Eriks Gondolen', lat: 59.3196, lng: 18.0646, type: 'restaurant', neighborhood: 'Södermalm', address: 'Stadsgården 6', openingHours: '11:30–01:00' },
  { id: 'mosebacke', name: 'Mosebacke Etablissement', lat: 59.3183, lng: 18.0726, type: 'bar', neighborhood: 'Södermalm', address: 'Mosebacke torg 3', openingHours: '11:00–01:00' },
  { id: 'marie-laveau', name: 'Marie Laveau', lat: 59.3168, lng: 18.0608, type: 'bar', neighborhood: 'Södermalm', address: 'Hornsgatan 66', openingHours: '16:00–01:00' },
  { id: 'morfar-ginko', name: 'Morfar Ginko', lat: 59.3139, lng: 18.0664, type: 'bar', neighborhood: 'Södermalm', address: 'Swedenborgsgatan 13', openingHours: '16:00–01:00' },
  { id: 'mellqvist', name: 'Mellqvist Kaffebar', lat: 59.3173, lng: 18.0608, type: 'cafe', neighborhood: 'Södermalm', address: 'Hornsgatan 78', openingHours: '07:00–19:00' },
  { id: 'pelikan', name: 'Pelikan', lat: 59.3132, lng: 18.0770, type: 'restaurant', neighborhood: 'Södermalm', address: 'Blekingegatan 40', openingHours: '16:00–23:00' },
  { id: 'bar-centro', name: 'Bar Centro', lat: 59.3148, lng: 18.0740, type: 'bar', neighborhood: 'Södermalm', address: 'Skånegatan 79', openingHours: '16:00–00:00' },

  // Gamla Stan
  { id: 'wirstroms', name: 'Wirströms Pub', lat: 59.3228, lng: 18.0706, type: 'pub', neighborhood: 'Gamla Stan', address: 'Stora Nygatan 13', openingHours: '11:00–01:00' },
  { id: 'zum-franziskaner', name: 'Zum Franziskaner', lat: 59.3233, lng: 18.0720, type: 'restaurant', neighborhood: 'Gamla Stan', address: 'Skeppsbron 44', openingHours: '11:00–23:00' },
  { id: 'stampen', name: 'Stampen', lat: 59.3240, lng: 18.0712, type: 'bar', neighborhood: 'Gamla Stan', address: 'Stora Nygatan 5', openingHours: '17:00–01:00' },

  // Östermalm
  { id: 'riche', name: 'Riche', lat: 59.3356, lng: 18.0764, type: 'restaurant', neighborhood: 'Östermalm', address: 'Birger Jarlsgatan 4', openingHours: '07:30–01:00' },
  { id: 'sturehof', name: 'Sturehof', lat: 59.3358, lng: 18.0736, type: 'restaurant', neighborhood: 'Östermalm', address: 'Stureplan 2', openingHours: '11:00–02:00' },
  { id: 'oxen-krog', name: 'Oxen Krog', lat: 59.3297, lng: 18.0911, type: 'restaurant', neighborhood: 'Östermalm', address: 'Beckholmsvägen 26', openingHours: '18:00–00:00' },
  { id: 'brasserie-astoria', name: 'Brasserie Astoria', lat: 59.3340, lng: 18.0755, type: 'restaurant', neighborhood: 'Östermalm', address: 'Nybrogatan 9', openingHours: '11:30–00:00' },
  { id: 'vete-katten', name: 'Vete-Katten', lat: 59.3371, lng: 18.0643, type: 'cafe', neighborhood: 'Östermalm', address: 'Kungsgatan 55', openingHours: '07:30–20:00' },

  // Vasastan
  { id: 'orangeriet', name: 'Orangeriet', lat: 59.3410, lng: 18.0489, type: 'cafe', neighborhood: 'Vasastan', address: 'Norr Mälarstrand, Karlbergs Slott', openingHours: '11:00–22:00' },
  { id: 'pilen', name: 'Pilen', lat: 59.3434, lng: 18.0522, type: 'bar', neighborhood: 'Vasastan', address: 'Norrtullsgatan 21', openingHours: '16:00–01:00' },
  { id: 'cafe-pascal', name: 'Café Pascal', lat: 59.3414, lng: 18.0560, type: 'cafe', neighborhood: 'Vasastan', address: 'Norrtullsgatan 4', openingHours: '07:00–18:00' },

  // Kungsholmen
  { id: 'malarpaviljongen', name: 'Mälarpaviljongen', lat: 59.3306, lng: 18.0221, type: 'bar', neighborhood: 'Kungsholmen', address: 'Norr Mälarstrand 64', openingHours: '11:00–23:00', sunHoursNote: 'Kvällssol mot vattnet' },
  { id: 'cafe-rival', name: 'Rival', lat: 59.3174, lng: 18.0636, type: 'restaurant', neighborhood: 'Södermalm', address: 'Mariatorget 3', openingHours: '07:00–00:00' },
  { id: 'la-colline', name: 'La Colline', lat: 59.3335, lng: 18.0302, type: 'restaurant', neighborhood: 'Kungsholmen', address: 'Hantverkargatan 68', openingHours: '17:00–23:00' },

  // Djurgården
  { id: 'rosendals', name: 'Rosendals Trädgård', lat: 59.3276, lng: 18.1040, type: 'cafe', neighborhood: 'Djurgården', address: 'Rosendalsterrassen 12', openingHours: '09:00–17:00', sunHoursNote: 'Öppet läge, sol hela dagen' },
  { id: 'solliden', name: 'Solliden', lat: 59.3261, lng: 18.0980, type: 'restaurant', neighborhood: 'Djurgården', address: 'Djurgårdsvägen 68', openingHours: '11:30–22:00' },
  { id: 'blå-porten', name: 'Blå Porten', lat: 59.3265, lng: 18.0953, type: 'cafe', neighborhood: 'Djurgården', address: 'Djurgårdsvägen 64', openingHours: '10:00–20:00' },

  // Norrmalm / City
  { id: 'operakallaren', name: 'Operakällaren', lat: 59.3308, lng: 18.0719, type: 'restaurant', neighborhood: 'Norrmalm', address: 'Karl XII:s Torg', openingHours: '11:30–01:00' },
  { id: 'tradgarn', name: 'Trädgårn', lat: 59.3314, lng: 18.0655, type: 'bar', neighborhood: 'Norrmalm', address: 'Hamngatan 2', openingHours: '11:00–01:00' },
  { id: 'restaurang-volt', name: 'Restaurang Volt', lat: 59.3310, lng: 18.0580, type: 'restaurant', neighborhood: 'Norrmalm', address: 'Kommendörsgatan 16', openingHours: '17:00–00:00' },
  { id: 'josefina', name: 'Josefina', lat: 59.3255, lng: 18.0905, type: 'bar', neighborhood: 'Djurgården', address: 'Galärvarvsvägen 10', openingHours: '11:00–23:00', sunHoursNote: 'Utsikt och sol till sent' },
  { id: 'strandvagen-1', name: 'Strandvägen 1', lat: 59.3318, lng: 18.0812, type: 'restaurant', neighborhood: 'Östermalm', address: 'Strandvägen 1', openingHours: '11:00–00:00' },
];
