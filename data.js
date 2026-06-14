const MAX_LP = 500;
const BERSERKER_THRESHOLD = 200;
const IRON_GUARD_REFLECT = 30;
const PERFECT_HIT_VALUE = 9;
const MYSTIC_HEAL_AMOUNT = 50;
const DMG_MULTIPLIER = 10;

const AVATARS = [
  { id: 'warrior',     icon: '⚔️',  label: 'Warrior'     },
  { id: 'mage',        icon: '🔮',  label: 'Mage'        },
  { id: 'rogue',       icon: '🗡️',  label: 'Rogue'       },
  { id: 'paladin',     icon: '🛡️',  label: 'Paladin'     },
  { id: 'berserker',   icon: '🪓',  label: 'Berserker'   },
  { id: 'healer',      icon: '✨',  label: 'Healer'      },
  { id: 'archer',      icon: '🏹',  label: 'Archer'      },
  { id: 'necromancer', icon: '💀',  label: 'Necromancer' },
];

const SKILLS = {
  double_strike: {
    id: 'double_strike',
    name: 'Double Strike',
    icon: '⚡',
    color: '#ff8c00',
    glow: '#ff8c0088',
    description: 'Roll a 6 on attack — deal double the final damage.',
  },
  perfect_hit: {
    id: 'perfect_hit',
    name: 'Perfect Hit',
    icon: '🎯',
    color: '#00d4ff',
    glow: '#00d4ff88',
    description: 'Roll a 3 on attack — attack value becomes a fixed 9.',
  },
  iron_guard: {
    id: 'iron_guard',
    name: 'Iron Guard',
    icon: '🛡️',
    color: '#4ecdc4',
    glow: '#4ecdc488',
    description: 'Roll a 6 on defense — negate the attack and deal 3 damage to the attacker.',
  },
  gamblers_edge: {
    id: 'gamblers_edge',
    name: "Gambler's Edge",
    icon: '🎲',
    color: '#a855f7',
    glow: '#a855f788',
    description: 'Attack coin lands TAILS — reroll it once per round.',
  },
  mystic_heal: {
    id: 'mystic_heal',
    name: 'Mystic Heal',
    icon: '💚',
    color: '#22c55e',
    glow: '#22c55e88',
    description: 'After taking damage — recover 10 LP (once per round).',
  },
  berserker: {
    id: 'berserker',
    name: 'Berserker',
    icon: '🔥',
    color: '#ef4444',
    glow: '#ef444488',
    description: 'Below 200 LP — all damage dealt AND received is doubled.',
  },
};

const SKILL_IDS = Object.keys(SKILLS);
