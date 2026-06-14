const MAX_LP = 500;
const BERSERKER_THRESHOLD = 200;
const IRON_GUARD_REFLECT = 30;
const PERFECT_HIT_VALUE = 9;
const MYSTIC_HEAL_AMOUNT = 50;
const DMG_MULTIPLIER = 10;

// Avatar passive base constants
const WARRIOR_MAX_LP    = 600;
const MAGE_SPELLPOWER   = 20;
const PALADIN_SHIELD    = 20;
const WAR_CRY_BONUS     = 10;
const HEALER_REJUV      = 30;
const NECRO_DRAIN_PCT   = 0.30;

// Scaling passive constants (passive grows each round)
const WARRIOR_LP_SCALE     = 25;
const PALADIN_SHIELD_SCALE = 5;
const HEALER_REJUV_SCALE   = 5;
const NECRO_DRAIN_SCALE    = 0.05;
const NECRO_DRAIN_CAP      = 0.50;

// Stance constants
const ASSAULT_BONUS = 20;
const COUNTER_DMG   = 30;

// Ultimate constants
const ULT_HEAL_AMOUNT    = 200;
const ULT_PALADIN_DMG    = 100;
const ULT_SOUL_STEAL_PCT = 0.30;

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
    description: `Start at ${WARRIOR_MAX_LP} LP. Gain +${WARRIOR_LP_SCALE} max LP per round won.`,
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
    description: "First attack roll of 6 this round bypasses the defender's coin flip.",
    type: 'once_round',
  },
  paladin: {
    name: 'Holy Shield',
    icon: '🛡️',
    color: '#facc15',
    description: `Incoming damage reduced by ${PALADIN_SHIELD} (+ ${PALADIN_SHIELD_SCALE}/round played).`,
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
    description: `Recover ${HEALER_REJUV} LP at start of your first attack turn each round (+ ${HEALER_REJUV_SCALE}/round).`,
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
    description: `First hit each round heals ${Math.round(NECRO_DRAIN_PCT * 100)}% of damage dealt (+ ${Math.round(NECRO_DRAIN_SCALE * 100)}%/round, max ${Math.round(NECRO_DRAIN_CAP * 100)}%).`,
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

const STANCES = {
  assault:  { id: 'assault',  icon: '⚔️', name: 'Assault',  color: '#f87171', desc: `Deal +${ASSAULT_BONUS} bonus damage on all hits this round.` },
  counter:  { id: 'counter',  icon: '🛡️', name: 'Counter',  color: '#60a5fa', desc: `On a successful block, deal ${COUNTER_DMG} counter-damage to attacker.` },
  balanced: { id: 'balanced', icon: '⚖️', name: 'Balanced', color: '#9ca3af', desc: 'Recover 30 LP at the start of your attack turn. Defense coins cannot be forced TAILS by abilities.' },
};

const STANCE_IDS = Object.keys(STANCES);

// Save / PVE storage keys
const SAVE_KEY     = 'aoo_save';
const PVE_SAVE_KEY = 'aoo_pve';

// PVE Campaign stages
const PVE_STAGES = [
  { id: 'goblin',   name: 'Goblin Scout',  avatar: 'rogue',       skill: 'gamblers_edge', icon: '👺', lore: 'Slippery and unpredictable.',   creditReward: 100 },
  { id: 'troll',    name: 'Cave Troll',    avatar: 'warrior',     skill: 'iron_guard',    icon: '🧌', lore: 'Tough hide, slow mind.',        creditReward: 125 },
  { id: 'witch',    name: 'Swamp Witch',   avatar: 'mage',        skill: 'mystic_heal',   icon: '🧙', lore: 'Magic flows through her veins.', creditReward: 150 },
  { id: 'warlord',  name: 'Orc Warlord',   avatar: 'berserker',   skill: 'double_strike', icon: '🗡️', lore: 'Fury incarnate.',               creditReward: 175 },
  { id: 'lichking', name: 'The Lich King', avatar: 'necromancer', skill: 'perfect_hit',   icon: '💀', lore: 'Death itself walks the arena.',  creditReward: 200 },
];

// PVE Shop items
const PVE_SHOP_ITEMS = [
  { id: 'hp_boost',     name: '+100 Max LP',    icon: '❤️',  cost: 150, type: 'permanent', desc: 'Increase max LP by 100 for this run.' },
  { id: 'dmg_boost',    name: 'Power Stone',    icon: '💪',  cost: 175, type: 'permanent', desc: 'Deal +20 flat bonus damage on every hit.' },
  { id: 'dual_wield',   name: 'Dual Wield',     icon: '⚡',  cost: 250, type: 'permanent', desc: 'Gain a second skill that activates alongside your first.' },
  { id: 'monster_intel',name: 'Monster Intel',  icon: '🔍',  cost: 75,  type: 'run',       desc: "Reveal next boss's passive and skill before the fight." },
  { id: 'revive',       name: 'Phoenix Feather',icon: '🔥',  cost: 200, type: 'run',       desc: 'If you lose a round this match, restore to full LP once.' },
];

const ULTIMATES = {
  warrior: {
    name: 'Last Stand',
    icon: '🗿',
    color: '#f97316',
    desc: 'Activate an immunity shield — the next hit you take this round deals 0 damage.',
    timing: 'Turn Enhancement',
  },
  mage: {
    name: 'Arcane Surge',
    icon: '🌟',
    color: '#818cf8',
    desc: 'Roll your attack die 3 times this turn and take the highest result.',
    timing: 'Turn Enhancement',
  },
  rogue: {
    name: 'Shadow Blitz',
    icon: '🌑',
    color: '#f43f5e',
    desc: "Skip both coin flips — your coin auto-HEADS, defender's auto-TAILS.",
    timing: 'Turn Enhancement',
  },
  paladin: {
    name: 'Divine Strike',
    icon: '⚜️',
    color: '#facc15',
    desc: `Deal ${ULT_PALADIN_DMG} direct damage instantly, bypassing all defenses. Turn ends after.`,
    timing: 'Instant Attack',
  },
  berserker: {
    name: 'Blood Rage',
    icon: '💢',
    color: '#fb923c',
    desc: 'Every hit you land this round deals +80 bonus damage (flat, not multiplicative).',
    timing: 'Round Enhancement',
  },
  healer: {
    name: 'Revitalize',
    icon: '💖',
    color: '#34d399',
    desc: `Recover ${ULT_HEAL_AMOUNT} LP immediately, then continue your attack.`,
    timing: 'Instant',
  },
  archer: {
    name: 'Eagle Eye',
    icon: '🦅',
    color: '#38bdf8',
    desc: "Roll attack die twice this turn, take higher. Defender's defense coin forced TAILS.",
    timing: 'Turn Enhancement',
  },
  necromancer: {
    name: 'Soul Steal',
    icon: '☠️',
    color: '#c084fc',
    desc: `Steal ${Math.round(ULT_SOUL_STEAL_PCT * 100)}% of opponent's current LP directly. Turn ends after.`,
    timing: 'Instant Attack',
  },
};
