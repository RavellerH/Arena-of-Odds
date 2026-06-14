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

function flipCoin() {
  return Math.random() < 0.5 ? 'heads' : 'tails';
}

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

// ─── Fighters ────────────────────────────────────────────────────────────────

function createFighter(name, avatarId, skillId) {
  return { id: uid(), name, avatar: avatarId, skill: skillId, lp: MAX_LP, roundWins: 0 };
}

function getFighter(id) {
  return gameState.fighters.find(f => f.id === id);
}

function getAttacker() {
  return getFighter(gameState.currentMatch.attackerId);
}

function getDefender() {
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

  lt[f1.id].played++;
  lt[f2.id].played++;
  lt[f1.id].roundsWon += f1rw;
  lt[f1.id].roundsLost += f2rw;
  lt[f2.id].roundsWon += f2rw;
  lt[f2.id].roundsLost += f1rw;
  lt[f1.id].lpTotal += f1.lp;
  lt[f2.id].lpTotal += f2.lp;

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
  f1.lp = MAX_LP; f1.roundWins = 0;
  f2.lp = MAX_LP; f2.roundWins = 0;
  gameState.currentMatch = {
    fighter1Id, fighter2Id,
    round: 1, maxRounds,
    roundResults: [],
    attackerId: fighter1Id,
    phase: 'attack_coin',
    gamblerUsed: {},
    mysticUsed: {},
    attackValue: 0,
    attackRoll: 0,
    log: [],
  };
  addLog('⚔️  Round 1 — BEGIN!', 'system');
}

function addLog(text, type = 'normal') {
  const m = gameState.currentMatch;
  m.log.unshift({ text, type, ts: Date.now() });
  if (m.log.length > 40) m.log.pop();
}

// ─── Combat phases ───────────────────────────────────────────────────────────

function doAttackCoin() {
  const attacker = getAttacker();
  const m = gameState.currentMatch;
  const coin = flipCoin();

  if (coin === 'heads') {
    addLog(`${attacker.name} flips — HEADS! Attack proceeds.`, 'heads');
    m.phase = 'attack_roll';
    return { coin };
  }

  if (attacker.skill === 'gamblers_edge' && !m.gamblerUsed[attacker.id]) {
    m.gamblerUsed[attacker.id] = true;
    const reroll = flipCoin();
    addLog(`${attacker.name} flips — TAILS! ⚡ Gambler's Edge activates — rerolling...`, 'skill');
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
  const m = gameState.currentMatch;
  const roll = rollDice();
  m.attackRoll = roll;
  let attackValue = roll;

  if (attacker.skill === 'perfect_hit' && roll === 3) {
    attackValue = PERFECT_HIT_VALUE;
    addLog(`${attacker.name} rolls 3 — 🎯 Perfect Hit! Attack value: ${PERFECT_HIT_VALUE}.`, 'skill');
  } else if (attacker.skill === 'double_strike' && roll === 6) {
    addLog(`${attacker.name} rolls 6 — ⚡ Double Strike primed!`, 'skill');
  } else {
    addLog(`${attacker.name} rolls ${roll}.`, 'normal');
  }

  m.attackValue = attackValue;
  m.phase = 'defend_coin';
  return { roll, attackValue };
}

function doDefendCoin() {
  const defender = getDefender();
  const attacker = getAttacker();
  const m = gameState.currentMatch;
  const coin = flipCoin();

  if (coin === 'tails') {
    addLog(`${defender.name} defends — TAILS! Defense fails.`, 'tails');
    let dmg = m.attackValue * DMG_MULTIPLIER;
    dmg = applyDmgMods(dmg, attacker, defender, m);
    dealDamage(defender, dmg, m);
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

  if (defender.skill === 'iron_guard' && roll === 6) {
    addLog(`${defender.name} rolls 6 — 🛡️ Iron Guard! Attack negated!`, 'skill');
    attacker.lp = Math.max(0, attacker.lp - IRON_GUARD_REFLECT);
    addLog(`${attacker.name} takes ${IRON_GUARD_REFLECT} reflected damage → LP: ${attacker.lp}`, 'damage');
    const ended = checkRoundEnd();
    if (!ended) passTurn();
    return { roll, ironGuard: true };
  }

  if (roll >= m.attackValue) {
    addLog(`${defender.name} rolls ${roll} — BLOCKED! (${roll} ≥ ${m.attackValue})`, 'block');
    passTurn();
    return { roll, blocked: true };
  }

  const base = (m.attackValue - roll) * DMG_MULTIPLIER;
  addLog(`${defender.name} rolls ${roll} — hit! (${m.attackValue} − ${roll}) × ${DMG_MULTIPLIER} = ${base} base damage.`, 'normal');
  let dmg = applyDmgMods(base, attacker, defender, m);
  dealDamage(defender, dmg, m);
  return { roll, damage: dmg };
}

function applyDmgMods(dmg, attacker, defender, m) {
  if (dmg <= 0) return 0;
  if (attacker.skill === 'double_strike' && m.attackRoll === 6) {
    dmg *= 2;
    addLog(`⚡ Double Strike! Damage ×2 → ${dmg}`, 'skill');
  }
  if (attacker.skill === 'berserker' && attacker.lp < BERSERKER_THRESHOLD) {
    dmg *= 2;
    addLog(`🔥 Berserker Rage! Damage ×2 → ${dmg}`, 'skill');
  }
  if (defender.skill === 'berserker' && defender.lp < BERSERKER_THRESHOLD) {
    dmg *= 2;
    addLog(`🔥 Berserker Vulnerability! Damage ×2 → ${dmg}`, 'skill');
  }
  return dmg;
}

function dealDamage(defender, dmg, m) {
  if (dmg <= 0) { const r = checkRoundEnd(); if (!r) passTurn(); return; }
  defender.lp = Math.max(0, defender.lp - dmg);
  addLog(`${defender.name} takes ${dmg} damage! LP: ${defender.lp}`, 'damage');

  if (defender.skill === 'mystic_heal' && !m.mysticUsed[defender.id] && defender.lp > 0) {
    m.mysticUsed[defender.id] = true;
    defender.lp = Math.min(MAX_LP, defender.lp + MYSTIC_HEAL_AMOUNT);
    addLog(`💚 Mystic Heal! ${defender.name} recovers ${MYSTIC_HEAL_AMOUNT} LP → ${defender.lp}`, 'heal');
  }

  const ended = checkRoundEnd();
  if (!ended) passTurn();
}

function passTurn() {
  const m = gameState.currentMatch;
  m.attackerId = m.attackerId === m.fighter1Id ? m.fighter2Id : m.fighter1Id;
  m.attackValue = 0;
  m.attackRoll = 0;
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
    addLog('💥 Both fighters fall simultaneously! Round DRAW!', 'system');
  } else if (f1.lp <= 0) {
    result = 'f2';
    f2.roundWins++;
    addLog(`🏆 ${f2.name} wins Round ${m.round}!`, 'system');
  } else {
    result = 'f1';
    f1.roundWins++;
    addLog(`🏆 ${f1.name} wins Round ${m.round}!`, 'system');
  }

  m.roundResults.push(result);
  const matchRes = getMatchResult();
  if (matchRes !== null) {
    m.phase = 'match_end';
    m.matchWinner = matchRes; // 'f1' | 'f2' | 'draw'
    if (matchRes === 'f1') addLog(`🥇 ${f1.name} wins the match!`, 'system');
    else if (matchRes === 'f2') addLog(`🥇 ${f2.name} wins the match!`, 'system');
    else addLog('🤝 Match ends in a DRAW!', 'system');
  } else {
    m.phase = 'round_end';
    // Loser attacks first next round
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
  getFighter(m.fighter1Id).lp = MAX_LP;
  getFighter(m.fighter2Id).lp = MAX_LP;
  m.round++;
  m.gamblerUsed = {};
  m.mysticUsed = {};
  m.attackValue = 0;
  m.attackRoll = 0;
  m.phase = 'attack_coin';
  m.log = [];
  addLog(`⚔️  Round ${m.round} — BEGIN!`, 'system');
}

function getMatchWinnerId() {
  const m = gameState.currentMatch;
  if (m.matchWinner === 'f1') return m.fighter1Id;
  if (m.matchWinner === 'f2') return m.fighter2Id;
  return null;
}
