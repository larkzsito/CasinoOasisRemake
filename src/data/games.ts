export interface Game {
  id: string;
  name: string;
  icon: string;
  cats: string[];
  badge: string | null;
  bg: string;
  game: 'blackjack' | 'roulette' | 'slots' | 'mines' | 'poker' | 'chests' | 'crash' | 'plinko' | 'chicken';
  slotThemeId?: string;
  img: string;
}

export const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
});

export const chips = [10000, 25000, 100000, 500000];

export interface VipRank {
  name: string;
  min: number;
  icon: string;
  badge: string;
  accentColor: string;
  isVipUnlock?: boolean;
  benefits: string[];
}

export const VIP_RANKS: VipRank[] = [
  {
    name: 'Bronce',
    min: 0,
    icon: '🥉',
    badge: 'Nivel Inicial',
    accentColor: '#cd7f32',
    benefits: [
      'Acceso completo a todos los juegos estándar y tragamonedas',
      'Acceso al Chat en Vivo general de la comunidad',
      'Bono de bienvenida del 200% y recargas',
      'Soporte al cliente estándar 24/7'
    ]
  },
  {
    name: 'Plata',
    min: 5000000,
    icon: '🥈',
    badge: 'Jugador Frecuente',
    accentColor: '#94a3b8',
    benefits: [
      '5% de Cashback diario sobre apuestas',
      '10 Giros gratis semanales en tragamonedas seleccionadas',
      'Límites de retiro acelerados',
      'Soporte prioritario por chat'
    ]
  },
  {
    name: 'Oro',
    min: 20000000,
    icon: '🥇',
    badge: 'High Roller',
    accentColor: '#f59e0b',
    benefits: [
      '10% de Cashback diario automático',
      'Multiplicadores mejorados en juegos arcade y slots',
      'Límites de apuesta duplicados en todas las mesas',
      'Bono sorpresa de fidelidad mensual'
    ]
  },
  {
    name: 'Platino VIP',
    min: 50000000,
    icon: '👑',
    badge: 'ENTRADA A SALAS VIP',
    accentColor: '#a855f7',
    isVipUnlock: true,
    benefits: [
      '🔓 DESBLOQUEO TOTAL de Salas VIP (Blackjack VIP y Ruleta VIP)',
      '💬 Acceso exclusivo al Chat Privado VIP en tiempo real',
      '15% de Cashback VIP semanal sin límite de reintegro',
      'Límites de apuesta ilimitados en mesas de juego',
      'Retiros prioritarios procesados en minutos'
    ]
  },
  {
    name: 'Diamante',
    min: 400000000,
    icon: '💎',
    badge: 'ÉLITE SUPREMA OASIS',
    accentColor: '#38bdf8',
    benefits: [
      'Rango Diamante Máximo del Casino Oasis ($400M gastados)',
      '20% de Cashback VIP supremo en todas las apuestas',
      'Anfitrión VIP personal privado asignado 24/7',
      'Retiros instantáneos ilimitados sin ninguna comisión',
      'Invitaciones a torneos privados de alto nivel y viajes VIP'
    ]
  }
];



export const GAMES: Game[] = [
  {
    "id": "bj1",
    "name": "Blackjack Real",
    "icon": "🃏",
    "cats": [
      "Mesa",
      "En Vivo",
      "Populares"
    ],
    "badge": "EN VIVO",
    "bg": "linear-gradient(135deg,#123d2b,#0c2a1e)",
    "game": "blackjack",
    "img": "/src/assets/bj1.jpg"
  },
  {
    "id": "vp1",
    "name": "Mega Póker",
    "icon": "♠️",
    "cats": [
      "Mesa",
      "Populares"
    ],
    "badge": null,
    "bg": "linear-gradient(135deg,#241847,#171028)",
    "game": "poker",
    "img": "/src/assets/vp1.jpg"
  },
  {
    "id": "sl1",
    "name": "Dulce Fortuna",
    "icon": "🍬",
    "cats": [
      "Slots",
      "Nuevos"
    ],
    "badge": "NUEVO",
    "bg": "linear-gradient(135deg,#3a0f3a,#1a0a1a)",
    "game": "slots",
    "slotThemeId": "sl1",
    "img": "/src/assets/sl1.jpg"
  },
  {
    "id": "rl1",
    "name": "Ruleta Relámpago",
    "icon": "🎡",
    "cats": [
      "Mesa",
      "En Vivo",
      "Populares"
    ],
    "badge": "EN VIVO",
    "bg": "linear-gradient(135deg,#3a0f14,#1a0a0c)",
    "game": "roulette",
    "img": "/src/assets/rl1.jpg"
  },
  {
    "id": "mn1",
    "name": "Minas de Oro",
    "icon": "💣",
    "cats": [
      "Arcade",
      "Populares"
    ],
    "badge": null,
    "bg": "linear-gradient(135deg,#3a2a08,#1a1408)",
    "game": "mines",
    "img": "/src/assets/mn1.jpg"
  },
  {
    "id": "sl2",
    "name": "Tesoro Azteca",
    "icon": "🗿",
    "cats": [
      "Slots"
    ],
    "badge": null,
    "bg": "linear-gradient(135deg,#123a1a,#0a1a0e)",
    "game": "slots",
    "slotThemeId": "sl2",
    "img": "/src/assets/sl2.jpg"
  },
  {
    "id": "sl3",
    "name": "Dragón Dorado",
    "icon": "🐉",
    "cats": [
      "Slots",
      "Nuevos"
    ],
    "badge": "NUEVO",
    "bg": "linear-gradient(135deg,#3a1408,#1a0a08)",
    "game": "slots",
    "slotThemeId": "sl3",
    "img": "/src/assets/sl3.jpg"
  },
  {
    "id": "sl4",
    "name": "Jackpot Imperial",
    "icon": "👑",
    "cats": [
      "Slots",
      "Populares"
    ],
    "badge": "JACKPOT",
    "bg": "linear-gradient(135deg,#3a2a6a,#1a1030)",
    "game": "slots",
    "slotThemeId": "sl4",
    "img": "/src/assets/sl4.jpg"
  },
  {
    "id": "sl5",
    "name": "Frutas Explosivas",
    "icon": "🍉",
    "cats": [
      "Slots"
    ],
    "badge": null,
    "bg": "linear-gradient(135deg,#123a12,#0a1a0a)",
    "game": "slots",
    "slotThemeId": "sl5",
    "img": "/src/assets/sl5.jpg"
  },
  {
    "id": "sl6",
    "name": "Siete Dorado",
    "icon": "7️⃣",
    "cats": [
      "Slots",
      "Populares"
    ],
    "badge": null,
    "bg": "linear-gradient(135deg,#1a1a3a,#0a0a1a)",
    "game": "slots",
    "slotThemeId": "sl6",
    "img": "/src/assets/sl6.jpg"
  },
  {
    "id": "rl2",
    "name": "Ruleta VIP",
    "icon": "🎯",
    "cats": [
      "Mesa",
      "Populares"
    ],
    "badge": null,
    "bg": "linear-gradient(135deg,#3a0f14,#1a0a0c)",
    "game": "roulette",
    "img": "/src/assets/rl2.jpg"
  },
  {
    "id": "bj2",
    "name": "Blackjack VIP",
    "icon": "♣️",
    "cats": [
      "Mesa",
      "Nuevos"
    ],
    "badge": "NUEVO",
    "bg": "linear-gradient(135deg,#123d2b,#0c2a1e)",
    "game": "blackjack",
    "img": "/src/assets/bj2.jpg"
  },
  {
    "id": "ch1",
    "name": "Cofres del Oasis",
    "icon": "📦",
    "cats": [
      "Arcade",
      "Nuevos",
      "Populares"
    ],
    "badge": "PACKDRAW",
    "bg": "linear-gradient(135deg,#3c1b6a,#1f0c3d)",
    "game": "chests",
    "img": "/src/assets/cofres.jpg"
  },
  {
    "id": "crash1",
    "name": "Crash Aéreo",
    "icon": "✈️",
    "cats": [
      "Arcade",
      "Populares",
      "Nuevos"
    ],
    "badge": "CRASH",
    "bg": "linear-gradient(135deg,#0a1628,#081020)",
    "game": "crash",
    "img": "/src/assets/plane.jpg"
  },
  {
    "id": "plk1",
    "name": "Plinko Oasis",
    "icon": "🔴",
    "cats": [
      "Arcade",
      "Populares",
      "Nuevos"
    ],
    "badge": "NUEVO",
    "bg": "linear-gradient(135deg,#24103a,#120824)",
    "game": "plinko",
    "img": "/src/assets/plinko.jpg"
  },
  {
    "id": "chicken1",
    "name": "Chicken Road",
    "icon": "🐔",
    "cats": [
      "Arcade",
      "Populares",
      "Nuevos"
    ],
    "badge": "NUEVO",
    "bg": "linear-gradient(135deg,#1a3a0a,#0a1f05)",
    "game": "chicken",
    "img": "/src/assets/chicken.jpg"
  }
];
