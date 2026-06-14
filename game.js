// game.js — Core engine: state, combat mechanics, tournament logic

let gameState = {
  phase: 'menu',
  mode: null,
  fighters: [],
  currentMatch: null,
  leagueTable: {},
  cupBracket: null,
  schedule: [],
  scheduleIndex: 0,
  leagueFinalDone: false,
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function uid() {
  return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function flipCoin() { return Math.random() < 0.5 ? 'heads' : 'tails'; }
function rand(n)    { return Math.floor(Math.random() * n) + 1; }
function rollDice() { return rand(6); }

// ─── Scaling passive helpers ──────────────────────────────────────────────────

function getPaladinShield(m) {
  return PALADIN_SHIELD + (m.round - 1) * PALADIN_SHIELD_SCALE;
}

function getHealerRejuv(m) {
  return HEALER_REJUV + (m.round - 1) * HEALER_REJUV_SCALE;
}

function getNecroDrain(m) {
  return Math.min(NECRO_DRAIN_CAP, NECRO_DRAIN_PCT + (m.round - 1) * NECRO_DRAIN_SCALE);
}

// ─── Fighters ────────────────────────────────────────────────────────────────

function createFighter(name, avatarId, skillId) {
  return {
    id: uid(), name, avatar: avatarId, skill: skillId,
    lp: MAX_LP, maxLp: MAX_LP, roundWins: 0,
  };
}

function getFighter(id)  { return gameState.fighters.find(f => f.id === id); }
function getAttacker()   { return getFighter(gameState.currentMatch.attackerId); }
function getDefender()   {
  const m = gameState.currentMatch;
  return getFighter(m.attackerId === m.fighter1Id ? m.fighter2Id : m.fighter1Id);
}

// ─── League ──────────────────────────────────────────────────────────────────

function initLeagueTable() {
  gameState.leagueTable = {};
  gameState.fighters.forEach(f => {
    gameState.leagueTable[f.id] = {
      played: 0, won: 0, drawn: 0, lost: 0,
      points: 0, roundsWon: 0, roundsLost: 0, lpTotal: 0,
    };
  });
}

function generateRoundRobin() {
  const fs = gameState.fighters;
  const schedule = [];
  for (let i = 0; i < fs.length; i++)
    for (let j = i + 1; j < fs.length; j++)
      schedule.push({ fighter1Id: fs[i].id, fighter2Id: fs[j].id });
  for (let i = schedule.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [schedule[i], schedule[j]] = [schedule[j], schedule[i]];
  }
  return schedule;
}

function getLeagueStandings() {
  return gameState.fighters
    .map(f => ({ fighter: f, stats: gameState.leagueTable[f.id] }))
    .sort((a, b) => {
      if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
      const ard = a.stats.roundsWon - a.stats.roundsLost;
      const brd = b.stats.roundsWon - b.stats.roundsLost;
      if (brd !== ard) return brd - ard;
      return b.stats.lpTotal - a.stats.lpTotal;
    });
}

function recordLeagueResult() {
  const m = gameState.currentMatch;
  const f1 = getFighter(m.fighter1Id);
  const f2 = getFighter(m.fighter2Id);
  const lt = gameState.leagueTable;
  const res = getMatchResult();
  const f1rw = m.roundResults.filter(r => r === 'f1').length;
  const f2rw = m.roundResults.filter(r => r === 'f2').length;

  lt[f1.id].played++; lt[f2.id].played++;
  lt[f1.id].roundsWon += f1rw; lt[f1.id].roundsLost += f2rw;
  lt[f2.id].roundsWon += f2rw; lt[f2.id].roundsLost += f1rw;
  lt[f1.id].lpTotal  += f1.lp; lt[f2.id].lpTotal  += f2.lp;

  if (res === 'f1') {
    lt[f1.id].won++; lt[f1.id].points += 3; lt[f2.id].lost++;
  } else if (res === 'f2') {
    lt[f2.id].won++; lt[f2.id].points += 3; lt[f1.id].lost++;
  } else {
    lt[f1.id].drawn++; lt[f1.id].points++;
    lt[f2.id].drawn++; lt[f2.id].points++;
  }
}

// ─── Cup ─────────────────────────────────────────────────────────────────────

function generateCupBracket() {
  const shuffled = [...gameState.fighters].sort(() => Math.random() - 0.5);
  const n = shuffled.length;
  let rounds;
  if (n === 4) {
    rounds = [
      { name: 'Semi-Finals', matches: [
        { fighter1Id: shuffled[0].id, fighter2Id: shuffled[1].id, winnerId: null },
        { fighter1Id: shuffled[2].id, fighter2Id: shuffled[3].id, winnerId: null },
      ]},
      { name: 'Final', matches: [
        { fighter1Id: null, fighter2Id: null, winnerId: null },
      ]},
    ];
  } else {
    rounds = [
      { name: 'Quarter-Finals', matches: [
        { fighter1Id: shuffled[0].id, fighter2Id: shuffled[1].id, winnerId: null },
        { fighter1Id: shuffled[2].id, fighter2Id: shuffled[3].id, winnerId: null },
        { fighter1Id: shuffled[4].id, fighter2Id: shuffled[5].id, winnerId: null },
        { fighter1Id: shuffled[6].id, fighter2Id: shuffled[7].id, winnerId: null },
      ]},
      { name: 'Semi-Finals', matches: [
        { fighter1Id: null, fighter2Id: null, winnerId: null },
        { fighter1Id: null, fighter2Id: null, winnerId: null },
      ]},
      { name: 'Final', matches: [
        { fighter1Id: null, fighter2Id: null, winnerId: null },
      ]},
    ];
  }
  return { rounds, currentRound: 0, currentMatchIdx: 0 };
}

function advanceCupBracket(winnerId) {
  const b = gameState.cupBracket;
  const cr = b.currentRound;
  const cm = b.currentMatchIdx;
  b.rounds[cr].matches[cm].winnerId = winnerId;

  if (cm + 1 < b.rounds[cr].matches.length) {
    b.currentMatchIdx = cm + 1;
    return 'next_match';
  }
  const nextRound = cr + 1;
  if (nextRound >= b.rounds.length) return 'tournament_over';

  const winners = b.rounds[cr].matches.map(m => m.winnerId);
  const nextMatches = b.rounds[nextRound].matches;
  for (let i = 0; i < nextMatches.length; i++) {
    nextMatches[i].fighter1Id = winners[i * 2];
    nextMatches[i].fighter2Id = winners[i * 2 + 1];
  }
  b.currentRound = nextRound;
  b.currentMatchIdx = 0;
  return 'next_round';
}

// ─── Match ────────────────────────────────────────────────────────────────────

function startMatch(fighter1Id, fighter2Id, maxRounds) {
  const f1 = getFighter(fighter1Id);
  const f2 = getFighter(fighter2Id);

  f1.maxLp = f1.avatar === 'warrior' ? WARRIOR_MAX_LP : MAX_LP;
  f2.maxLp = f2.avatar === 'warrior' ? WARRIOR_MAX_LP : MAX_LP;
  f1.lp = f1.maxLp; f1.roundWins = 0;
  f2.lp = f2.maxLp; f2.roundWins = 0;

  gameState.currentMatch = {
    fighter1Id, fighter2Id,
    round: 1, maxRounds,
    roundResults: [],
    attackerId: fighter1Id,
    phase: 'declare_1',
    gamblerUsed: {},
    mysticUsed: {},
    passiveUsed: {},
    passiveBonus: 0,
    assassinActive: false,
    attackValue: 0,
    attackRoll: 0,
    log: [],
    stances: {},
    ultUsed: {},
    ultFlags: {},
    warriorLpBonus: {},
  };
}

function addLog(text, type = 'normal') {
  const m = gameState.currentMatch;
  m.log.unshift({ text, type });
  if (m.log.length > 50) m.log.pop();
}

// ─── Declare phase ────────────────────────────────────────────────────────────

function doStanceDeclare(stanceId) {
  const m = gameState.currentMatch;
  if (m.phase === 'declare_1') {
    m.stances[m.fighter1Id] = stanceId;
    m.phase = 'declare_2';
  } else if (m.phase === 'declare_2') {
    m.stances[m.fighter2Id] = stanceId;
    m.phase = 'declare_reveal';
  }
}

function doStanceReveal() {
  const m = gameState.currentMatch;
  const f1 = getFighter(m.fighter1Id);
  const f2 = getFighter(m.fighter2Id);
  const s1 = STANCES[m.stances[m.fighter1Id]];
  const s2 = STANCES[m.stances[m.fighter2Id]];
  addLog(`⚔️  Round ${m.round} — BEGIN!`, 'system');
  addLog(`${f1.name} → ${s1.icon} ${s1.name}  |  ${f2.name} → ${s2.icon} ${s2.name}`, 'stance');
  m.phase = 'attack_coin';
}

// ─── Ultimate ─────────────────────────────────────────────────────────────────

function doUltimate() {
  const m = gameState.currentMatch;
  const attacker = getAttacker();
  const defender = getDefender();
  const av = attacker.avatar;
  const ult = ULTIMATES[av];

  m.ultUsed[attacker.id] = true;
  addLog(`💥 ${attacker.name} unleashes ${ult.icon} ${ult.name}!`, 'ultimate');

  switch (av) {
    case 'warrior':
      m.ultFlags[attacker.id + '_laststand'] = true;
      addLog(`🗿 Last Stand! Next hit on ${attacker.name} is nullified.`, 'ultimate');
      break;

    case 'mage':
      m.ultFlags[attacker.id + '_surge'] = true;
      addLog(`🌟 Arcane Surge! Attack die will roll 3× this turn.`, 'ultimate');
      break;

    case 'rogue':
      m.ultFlags[attacker.id + '_shadowblitz'] = true;
      addLog(`🌑 Shadow Blitz! Both coin flips bypassed this turn.`, 'ultimate');
      break;

    case 'paladin': {
      let dmg = ULT_PALADIN_DMG;
      if (defender.avatar === 'paladin') {
        const shield = getPaladinShield(m);
        const absorbed = Math.min(dmg, shield);
        dmg = Math.max(0, dmg - shield);
        if (absorbed > 0) addLog(`🛡️ Holy Shield absorbs ${absorbed}.`, 'passive');
      }
      defender.lp = Math.max(0, defender.lp - dmg);
      addLog(`⚜️ Divine Strike! ${dmg} direct damage → ${defender.name} LP: ${defender.lp}`, 'damage');
      const endedP = checkRoundEnd();
      if (!endedP) passTurn();
      break;
    }

    case 'berserker':
      m.ultFlags[attacker.id + '_bloodrage'] = true;
      addLog(`💢 Blood Rage! All your damage this round is doubled.`, 'ultimate');
      break;

    case 'healer': {
      const healed = Math.min(ULT_HEAL_AMOUNT, attacker.maxLp - attacker.lp);
      attacker.lp = Math.min(attacker.maxLp, attacker.lp + ULT_HEAL_AMOUNT);
      addLog(`💖 Revitalize! +${healed} LP → ${attacker.name} LP: ${attacker.lp}`, 'heal');
      break;
    }

    case 'archer':
      m.ultFlags[attacker.id + '_eagleeye_dice'] = true;
      m.ultFlags[attacker.id + '_eagleeye_tails'] = true;
      addLog(`🦅 Eagle Eye! Attack die rolls 2× (best), ${defender.name}'s defense coin forced TAILS.`, 'ultimate');
      break;

    case 'necromancer': {
      const steal = Math.floor(defender.lp * ULT_SOUL_STEAL_PCT);
      defender.lp = Math.max(0, defender.lp - steal);
      attacker.lp = Math.min(attacker.maxLp, attacker.lp + steal);
      addLog(`☠️ Soul Steal! Drained ${steal} LP → ${defender.name}: ${defender.lp} | ${attacker.name}: ${attacker.lp}`, 'damage');
      const endedN = checkRoundEnd();
      if (!endedN) passTurn();
      break;
    }
  }
}

// ─── Combat phases ───────────────────────────────────────────────────────────

function doAttackCoin() {
  const attacker = getAttacker();
  const m = gameState.currentMatch;

  // Balanced stance: recover 30 LP at attack turn start (once per round per fighter)
  const balancedKey = attacker.id + '_balanced_heal';
  if (m.stances[attacker.id] === 'balanced' && !m.passiveUsed[balancedKey]) {
    m.passiveUsed[balancedKey] = true;
    const healed = Math.min(30, attacker.maxLp - attacker.lp);
    if (healed > 0) {
      attacker.lp += healed;
      addLog(`⚖️ Balanced! ${attacker.name} recovers ${healed} LP → ${attacker.lp}`, 'stance');
    }
  }

  // Healer Rejuvenation: scale with round number
  const rejuvKey = attacker.id + '_rejuv';
  if (attacker.avatar === 'healer' && !m.passiveUsed[rejuvKey]) {
    m.passiveUsed[rejuvKey] = true;
    const rejuvAmt = getHealerRejuv(m);
    const healed = Math.min(rejuvAmt, attacker.maxLp - attacker.lp);
    if (healed > 0) {
      attacker.lp += healed;
      addLog(`💊 Rejuvenation! ${attacker.name} recovers ${healed} LP → ${attacker.lp} (Rnd ${m.round}: ${rejuvAmt} max)`, 'passive');
    }
  }

  // Shadow Blitz: skip attack coin
  const shadowKey = attacker.id + '_shadowblitz';
  if (m.ultFlags[shadowKey]) {
    addLog(`🌑 ${attacker.name}'s attack coin bypassed (Shadow Blitz)!`, 'ultimate');
    m.phase = 'attack_roll';
    return { coin: 'heads', shadowBlitz: true };
  }

  const coin = flipCoin();

  if (coin === 'heads') {
    addLog(`${attacker.name} flips — HEADS! Attack proceeds.`, 'heads');
    m.phase = 'attack_roll';
    return { coin };
  }

  if (attacker.skill === 'gamblers_edge' && !m.gamblerUsed[attacker.id]) {
    m.gamblerUsed[attacker.id] = true;
    const reroll = flipCoin();
    addLog(`${attacker.name} flips — TAILS! 🎲 Gambler's Edge — rerolling...`, 'skill');
    if (reroll === 'heads') {
      addLog(`Reroll: HEADS! Attack proceeds.`, 'heads');
      m.phase = 'attack_roll';
    } else {
      addLog(`Reroll: TAILS. Attack fails — turn passes.`, 'tails');
      passTurn();
    }
    return { coin, reroll };
  }

  addLog(`${attacker.name} flips — TAILS. Attack fails — turn passes.`, 'tails');
  passTurn();
  return { coin };
}

function doAttackRoll() {
  const attacker = getAttacker();
  const defender = getDefender();
  const m = gameState.currentMatch;

  // Determine dice count (Arcane Surge or Eagle Eye)
  const surgeKey = attacker.id + '_surge';
  const eagleKey = attacker.id + '_eagleeye_dice';
  let diceCount = 1;
  let multLabel = '';
  if (m.ultFlags[surgeKey]) {
    diceCount = 3;
    multLabel = '🌟 Arcane Surge';
    delete m.ultFlags[surgeKey];
  } else if (m.ultFlags[eagleKey]) {
    diceCount = 2;
    multLabel = '🦅 Eagle Eye';
    delete m.ultFlags[eagleKey];
  }

  const rolls = Array.from({ length: diceCount }, rollDice);
  const baseRoll = Math.max(...rolls);

  if (diceCount > 1) {
    addLog(`${multLabel}! Rolled [${rolls.join(', ')}] → kept ${baseRoll}.`, 'ultimate');
  }

  // Explosive dice: natural 6 adds a bonus roll
  let roll = baseRoll;
  let explosionBonus = 0;
  if (baseRoll === 6) {
    explosionBonus = rollDice();
    roll = baseRoll + explosionBonus;
    addLog(`💥 Explosive! 6 + ${explosionBonus} = ${roll} total attack value!`, 'passive');
  }

  m.attackRoll = baseRoll;
  m.passiveBonus = 0;
  let attackValue = roll;

  // Skill checks on base roll
  if (attacker.skill === 'perfect_hit' && baseRoll === 3) {
    attackValue = PERFECT_HIT_VALUE;
    addLog(`${attacker.name} rolls 3 — 🎯 Perfect Hit! Attack value: ${PERFECT_HIT_VALUE}.`, 'skill');
  } else if (attacker.skill === 'double_strike' && baseRoll === 6) {
    if (diceCount === 1 && !explosionBonus) addLog(`${attacker.name} rolls ${baseRoll} — ⚡ Double Strike primed!`, 'skill');
    else addLog(`⚡ Double Strike primed!`, 'skill');
  } else if (diceCount === 1 && !explosionBonus) {
    addLog(`${attacker.name} rolls ${baseRoll}.`, 'normal');
  }

  // Archer Precision: raise low rolls
  if (attacker.avatar === 'archer' && attackValue < 3) {
    addLog(`🏹 Precision! ${attacker.name}'s roll raised to 3.`, 'passive');
    attackValue = 3;
  }

  // Mage Spellpower: first roll ≥5 this round
  const spellKey = attacker.id + '_spellpower';
  if (attacker.avatar === 'mage' && baseRoll >= 5 && !m.passiveUsed[spellKey]) {
    m.passiveUsed[spellKey] = true;
    m.passiveBonus = MAGE_SPELLPOWER;
    addLog(`✨ Spellpower! +${MAGE_SPELLPOWER} bonus damage.`, 'passive');
  }

  // Rogue Assassination: first roll 6 bypasses defender coin (Balanced stance resists)
  const assKey = attacker.id + '_assassination';
  if (attacker.avatar === 'rogue' && baseRoll === 6 && !m.passiveUsed[assKey]) {
    if (m.stances[defender.id] === 'balanced') {
      m.passiveUsed[assKey] = true; // mark used so it doesn't retry
      addLog(`⚖️ Balanced! ${defender.name} resists Assassination — defense coin proceeds normally.`, 'stance');
    } else {
      m.passiveUsed[assKey] = true;
      addLog(`🗡️ Assassination! ${defender.name}'s defense coin bypassed!`, 'passive');
      m.attackValue = attackValue;
      m.phase = 'defend_roll';
      return { roll: baseRoll, attackValue, assassination: true, explosionBonus };
    }
  }

  m.attackValue = attackValue;
  m.phase = 'defend_coin';
  return { roll: baseRoll, attackValue, explosionBonus };
}

function doDefendCoin() {
  const defender = getDefender();
  const attacker = getAttacker();
  const m = gameState.currentMatch;
  const defenderBalanced = m.stances[defender.id] === 'balanced';

  // Eagle Eye: force TAILS on defender's coin (Balanced resists)
  const eagleTailsKey = attacker.id + '_eagleeye_tails';
  if (m.ultFlags[eagleTailsKey]) {
    delete m.ultFlags[eagleTailsKey];
    if (defenderBalanced) {
      addLog(`⚖️ Balanced! ${defender.name} resists Eagle Eye — coin flips normally.`, 'stance');
    } else {
      addLog(`🦅 Eagle Eye! ${defender.name}'s defense coin forced TAILS!`, 'ultimate');
      let dmg = m.attackValue * DMG_MULTIPLIER;
      dmg = applyDmgMods(dmg, attacker, defender, m);
      dealDamage(defender, attacker, dmg, m);
      return { coin: 'tails', eagleEye: true };
    }
  }

  // Shadow Blitz: force TAILS on defender's coin (Balanced resists)
  const shadowKey = attacker.id + '_shadowblitz';
  if (m.ultFlags[shadowKey]) {
    delete m.ultFlags[shadowKey];
    if (defenderBalanced) {
      addLog(`⚖️ Balanced! ${defender.name} resists Shadow Blitz — coin flips normally.`, 'stance');
    } else {
      addLog(`🌑 Shadow Blitz! ${defender.name}'s defense coin forced TAILS!`, 'ultimate');
      let dmg = m.attackValue * DMG_MULTIPLIER;
      dmg = applyDmgMods(dmg, attacker, defender, m);
      dealDamage(defender, attacker, dmg, m);
      return { coin: 'tails', shadowBlitz: true };
    }
  }

  const coin = flipCoin();

  if (coin === 'tails') {
    addLog(`${defender.name} defends — TAILS! Defense fails.`, 'tails');
    let dmg = m.attackValue * DMG_MULTIPLIER;
    dmg = applyDmgMods(dmg, attacker, defender, m);
    dealDamage(defender, attacker, dmg, m);
    return { coin };
  }

  addLog(`${defender.name} defends — HEADS! Rolling to block.`, 'heads');
  m.phase = 'defend_roll';
  return { coin };
}

function doDefendRoll() {
  const defender = getDefender();
  const attacker = getAttacker();
  const m = gameState.currentMatch;
  const roll = rollDice();

  // Iron Guard
  if (defender.skill === 'iron_guard' && roll === 6) {
    addLog(`${defender.name} rolls 6 — 🛡️ Iron Guard! Attack negated!`, 'skill');
    let reflectDmg = IRON_GUARD_REFLECT;
    if (attacker.avatar === 'paladin') {
      const shield = getPaladinShield(m);
      const absorbed = Math.min(reflectDmg, shield);
      reflectDmg = Math.max(0, reflectDmg - shield);
      if (absorbed > 0) addLog(`🛡️ Holy Shield absorbs ${absorbed} reflect damage.`, 'passive');
    }
    if (reflectDmg > 0) {
      // Last Stand check for reflected damage hitting attacker
      const lastStandKey = attacker.id + '_laststand';
      if (m.ultFlags[lastStandKey]) {
        delete m.ultFlags[lastStandKey];
        addLog(`🗿 Last Stand! ${attacker.name} is immune to the reflect!`, 'ultimate');
      } else {
        attacker.lp = Math.max(0, attacker.lp - reflectDmg);
        addLog(`${attacker.name} takes ${reflectDmg} reflected damage → LP: ${attacker.lp}`, 'damage');
      }
    }
    const ended = checkRoundEnd();
    if (!ended) passTurn();
    return { roll, ironGuard: true };
  }

  if (roll >= m.attackValue) {
    addLog(`${defender.name} rolls ${roll} — BLOCKED! (${roll} ≥ ${m.attackValue})`, 'block');

    // Counter stance: deal damage on block
    if (m.stances[defender.id] === 'counter') {
      let counterDmg = COUNTER_DMG;
      if (attacker.avatar === 'paladin') {
        const shield = getPaladinShield(m);
        const absorbed = Math.min(counterDmg, shield);
        counterDmg = Math.max(0, counterDmg - shield);
        if (absorbed > 0) addLog(`🛡️ Holy Shield absorbs ${absorbed} counter-damage.`, 'passive');
      }
      const lastStandKey = attacker.id + '_laststand';
      if (counterDmg > 0 && m.ultFlags[lastStandKey]) {
        delete m.ultFlags[lastStandKey];
        addLog(`🗿 Last Stand! ${attacker.name} blocks counter-damage!`, 'ultimate');
      } else if (counterDmg > 0) {
        attacker.lp = Math.max(0, attacker.lp - counterDmg);
        addLog(`🛡️ Counter! ${attacker.name} takes ${counterDmg} damage → LP: ${attacker.lp}`, 'stance');
      }
      const endedC = checkRoundEnd();
      if (endedC) return { roll, blocked: true, counter: counterDmg };
    }

    passTurn();
    return { roll, blocked: true };
  }

  const base = (m.attackValue - roll) * DMG_MULTIPLIER;
  addLog(`${defender.name} rolls ${roll} — hit! (${m.attackValue} − ${roll}) × ${DMG_MULTIPLIER} = ${base} base.`, 'normal');
  let dmg = applyDmgMods(base, attacker, defender, m);
  dealDamage(defender, attacker, dmg, m);
  return { roll, damage: dmg };
}

function applyDmgMods(dmg, attacker, defender, m) {
  if (dmg <= 0) return 0;

  // Skill: Double Strike
  if (attacker.skill === 'double_strike' && m.attackRoll === 6) {
    dmg *= 2;
    addLog(`⚡ Double Strike! Damage ×2 → ${dmg}`, 'skill');
  }
  // Skill: Berserker (attacker)
  if (attacker.skill === 'berserker' && attacker.lp < BERSERKER_THRESHOLD) {
    dmg *= 2;
    addLog(`🔥 Berserker Rage! Damage ×2 → ${dmg}`, 'skill');
  }
  // Skill: Berserker (defender vulnerability)
  if (defender.skill === 'berserker' && defender.lp < BERSERKER_THRESHOLD) {
    dmg *= 2;
    addLog(`🔥 Berserker Vulnerability! Damage ×2 → ${dmg}`, 'skill');
  }

  // Avatar: Mage Spellpower bonus
  if (m.passiveBonus > 0) {
    dmg += m.passiveBonus;
    m.passiveBonus = 0;
  }

  // Avatar: Berserker War Cry
  if (attacker.avatar === 'berserker' && attacker.roundWins > 0) {
    const wc = attacker.roundWins * WAR_CRY_BONUS;
    dmg += wc;
    addLog(`⚡ War Cry! +${wc} damage (${attacker.roundWins} rounds won)`, 'passive');
  }

  // Stance: Assault bonus
  if (m.stances[attacker.id] === 'assault') {
    dmg += ASSAULT_BONUS;
    addLog(`⚔️ Assault! +${ASSAULT_BONUS} bonus damage → ${dmg}`, 'stance');
  }

  // Ultimate: Blood Rage — flat bonus, does not multiply (prevents stacking with Double Strike)
  const rageKey = attacker.id + '_bloodrage';
  if (m.ultFlags[rageKey]) {
    dmg += 80;
    addLog(`💢 Blood Rage! +80 damage → ${dmg}`, 'ultimate');
  }

  return dmg;
}

function dealDamage(defender, attacker, dmg, m) {
  if (dmg <= 0) { const r = checkRoundEnd(); if (!r) passTurn(); return; }

  // Ultimate: Last Stand — nullify next hit
  const lastStandKey = defender.id + '_laststand';
  if (m.ultFlags[lastStandKey]) {
    delete m.ultFlags[lastStandKey];
    addLog(`🗿 Last Stand! ${defender.name} is immune — ${dmg} damage nullified!`, 'ultimate');
    const rLS = checkRoundEnd();
    if (!rLS) passTurn();
    return;
  }

  // Avatar: Paladin Holy Shield (scales with round)
  if (defender.avatar === 'paladin') {
    const shield = getPaladinShield(m);
    if (shield > 0) {
      const absorbed = Math.min(dmg, shield);
      dmg = Math.max(0, dmg - shield);
      addLog(`🛡️ Holy Shield! ${absorbed} absorbed (shield: ${shield}) → ${dmg} net damage.`, 'passive');
      if (dmg <= 0) { const r = checkRoundEnd(); if (!r) passTurn(); return; }
    }
  }

  defender.lp = Math.max(0, defender.lp - dmg);
  addLog(`${defender.name} takes ${dmg} damage! LP: ${defender.lp}`, 'damage');

  // Skill: Mystic Heal
  if (defender.skill === 'mystic_heal' && !m.mysticUsed[defender.id] && defender.lp > 0) {
    m.mysticUsed[defender.id] = true;
    const healed = Math.min(MYSTIC_HEAL_AMOUNT, defender.maxLp - defender.lp);
    defender.lp = Math.min(defender.maxLp, defender.lp + MYSTIC_HEAL_AMOUNT);
    addLog(`💚 Mystic Heal! ${defender.name} recovers ${healed} LP → ${defender.lp}`, 'heal');
  }

  // Avatar: Necromancer Life Drain (scales with round)
  const drainKey = attacker.id + '_lifedrain';
  if (attacker.avatar === 'necromancer' && !m.passiveUsed[drainKey]) {
    m.passiveUsed[drainKey] = true;
    const drainPct = getNecroDrain(m);
    const healAmt = Math.floor(dmg * drainPct);
    if (healAmt > 0) {
      attacker.lp = Math.min(attacker.maxLp, attacker.lp + healAmt);
      addLog(`💉 Life Drain! ${attacker.name} recovers ${healAmt} LP → ${attacker.lp} (${Math.round(drainPct * 100)}%)`, 'passive');
    }
  }

  const ended = checkRoundEnd();
  if (!ended) passTurn();
}

function passTurn() {
  const m = gameState.currentMatch;
  // Clear turn-scoped ult flags
  const turnSuffixes = ['_shadowblitz', '_eagleeye_dice', '_eagleeye_tails', '_surge'];
  for (const key of Object.keys(m.ultFlags)) {
    if (turnSuffixes.some(s => key.endsWith(s))) delete m.ultFlags[key];
  }
  m.attackerId = m.attackerId === m.fighter1Id ? m.fighter2Id : m.fighter1Id;
  m.attackValue = 0;
  m.attackRoll = 0;
  m.passiveBonus = 0;
  m.assassinActive = false;
  m.phase = 'attack_coin';
}

function checkRoundEnd() {
  const m = gameState.currentMatch;
  const f1 = getFighter(m.fighter1Id);
  const f2 = getFighter(m.fighter2Id);
  if (f1.lp > 0 && f2.lp > 0) return null;

  let result;
  if (f1.lp <= 0 && f2.lp <= 0) {
    result = 'draw';
    addLog('💥 Both fighters fall! Round DRAW!', 'system');
  } else if (f1.lp <= 0) {
    result = 'f2'; f2.roundWins++;
    addLog(`🏆 ${f2.name} wins Round ${m.round}!`, 'system');
    // Warrior scaling
    if (f2.avatar === 'warrior') {
      m.warriorLpBonus[f2.id] = (m.warriorLpBonus[f2.id] || 0) + WARRIOR_LP_SCALE;
      addLog(`💪 Battle Hardened! ${f2.name} gains +${WARRIOR_LP_SCALE} max LP next round.`, 'passive');
    }
  } else {
    result = 'f1'; f1.roundWins++;
    addLog(`🏆 ${f1.name} wins Round ${m.round}!`, 'system');
    if (f1.avatar === 'warrior') {
      m.warriorLpBonus[f1.id] = (m.warriorLpBonus[f1.id] || 0) + WARRIOR_LP_SCALE;
      addLog(`💪 Battle Hardened! ${f1.name} gains +${WARRIOR_LP_SCALE} max LP next round.`, 'passive');
    }
  }

  m.roundResults.push(result);
  const matchRes = getMatchResult();
  if (matchRes !== null) {
    m.phase = 'match_end';
    m.matchWinner = matchRes;
    if (matchRes === 'f1') addLog(`🥇 ${f1.name} wins the match!`, 'system');
    else if (matchRes === 'f2') addLog(`🥇 ${f2.name} wins the match!`, 'system');
    else addLog('🤝 Match ends in a DRAW!', 'system');
  } else {
    m.phase = 'round_end';
    if (result === 'f1') m.attackerId = m.fighter2Id;
    else if (result === 'f2') m.attackerId = m.fighter1Id;
  }
  return result;
}

function getMatchResult() {
  const m = gameState.currentMatch;
  const winsNeeded = Math.ceil(m.maxRounds / 2);
  const f1w = m.roundResults.filter(r => r === 'f1').length;
  const f2w = m.roundResults.filter(r => r === 'f2').length;
  if (f1w >= winsNeeded) return 'f1';
  if (f2w >= winsNeeded) return 'f2';
  if (m.roundResults.length >= m.maxRounds) {
    if (f1w > f2w) return 'f1';
    if (f2w > f1w) return 'f2';
    return 'draw';
  }
  return null;
}

function startNextRound() {
  const m = gameState.currentMatch;
  const f1 = getFighter(m.fighter1Id);
  const f2 = getFighter(m.fighter2Id);

  // Apply Warrior LP scaling from round wins
  [f1, f2].forEach(f => {
    if (f.avatar === 'warrior' && m.warriorLpBonus[f.id]) {
      f.maxLp = WARRIOR_MAX_LP + m.warriorLpBonus[f.id];
    }
  });

  f1.lp = f1.maxLp;
  f2.lp = f2.maxLp;
  m.round++;
  m.gamblerUsed   = {};
  m.mysticUsed    = {};
  m.passiveUsed   = {};
  m.passiveBonus  = 0;
  m.assassinActive = false;
  m.attackValue = 0;
  m.attackRoll  = 0;
  m.stances     = {};
  m.ultFlags    = {};  // clear round/turn ult flags; ultUsed persists
  m.phase = 'declare_1';
  m.log = [];
}

function getMatchWinnerId() {
  const m = gameState.currentMatch;
  if (m.matchWinner === 'f1') return m.fighter1Id;
  if (m.matchWinner === 'f2') return m.fighter2Id;
  return null;
}
