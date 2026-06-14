const MAX_LP = 500;
const BERSERKER_THRESHOLD = 200;
const IRON_GUARD_REFLECT = 30;
const PERFECT_HIT_VALUE = 9;
const MYSTIC_HEAL_AMOUNT = 50;
const DMG_MULTIPLIER = 10;

// Avatar passive constants
const WARRIOR_MAX_LP    = 600;
const MAGE_SPELLPOWER   = 20;   // flat bonus damage (once/round, roll ≥ 5)
const PALADIN_SHIELD    = 20;   // damage reduction (always-on)
const WAR_CRY_BONUS     = 10;   // bonus damage per round already won (always-on)
const HEALER_REJUV      = 30;   // LP recovered at start of first attack turn (once/round)
const NECRO_DRAIN_PCT   = 0.30; // fraction of damage dealt healed back (once/round)

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

const AVATAR_PASSIVES = {
  warrior: {
    name: 'Battle Hardened',
    icon: '💪',
    color: '#f97316',
    description: `Start each round with ${WARRIOR_MAX_LP} LP instead of ${MAX_LP}.`,
    type: 'always',
  },
  mage: {
    name: 'Spellpower',
    icon: '✨',
    color: '#818cf8',
    description: `First attack roll ≥5 this round adds +${MAGE_SPELLPOWER} bonus damage.`,
    type: 'once_round',
  },
  rogue: {
    name: 'Assassination',
    icon: '🗡️',
    color: '#f43f5e',
    description: 'First attack roll of 6 this round bypasses the defender\'s coin flip.',
    type: 'once_round',
  },
  paladin: {
    name: 'Holy Shield',
    icon: '🛡️',
    color: '#facc15',
    description: `All incoming damage reduced by ${PALADIN_SHIELD} (minimum 0).`,
    type: 'always',
  },
  berserker: {
    name: 'War Cry',
    icon: '⚡',
    color: '#fb923c',
    description: `Deal +${WAR_CRY_BONUS} bonus damage for each round already won this match.`,
    type: 'always',
  },
  healer: {
    name: 'Rejuvenation',
    icon: '💊',
    color: '#34d399',
    description: `Recover ${HEALER_REJUV} LP at the start of your first attack turn each round.`,
    type: 'once_round',
  },
  archer: {
    name: 'Precision',
    icon: '🎯',
    color: '#38bdf8',
    description: 'Attack dice rolls of 1 or 2 are treated as 3.',
    type: 'always',
  },
  necromancer: {
    name: 'Life Drain',
    icon: '💉',
    color: '#c084fc',
    description: `First hit each round heals you for ${Math.round(NECRO_DRAIN_PCT * 100)}% of damage dealt.`,
    type: 'once_round',
  },
};

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
    description: 'Roll a 6 on defense — negate the attack and deal 30 damage to the attacker.',
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
    description: 'After taking damage — recover 50 LP (once per round).',
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
