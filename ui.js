// ui.js — Screen rendering and event handling

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const uiState = {
  playerCount: 4,
  setupFighters: [],
  currentSetupIdx: 0,
  pendingName: '',
  pendingAvatar: AVATARS[0].id,
  pendingSkill: SKILL_IDS[0],
  attackCoin: null,
  attackDice: null,
  defendCoin: null,
  isLeagueFinal: false,
  cupIsFinal: false,
};

// ── Screen manager ────────────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) { el.classList.add('active'); }
  window.scrollTo(0, 0);
}

function setHTML(id, html) {
  document.getElementById(id).innerHTML = html;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avatarIcon(id) {
  return (AVATARS.find(a => a.id === id) || AVATARS[0]).icon;
}

function skillData(id) {
  return SKILLS[id] || SKILLS.double_strike;
}

function hpClass(lp) {
  if (lp <= BERSERKER_THRESHOLD) return 'crit';
  if (lp <= 300) return 'warn';
  return '';
}

function hpPct(lp) {
  return Math.max(0, Math.round((lp / MAX_LP) * 100));
}

function renderSkillBadge(skillId, extraClass = '') {
  const s = skillData(skillId);
  return `<span class="skill-badge ${extraClass}" style="color:${s.color};border-color:${s.color}">${s.icon} ${s.name}</span>`;
}

function renderPips(wins, maxRounds) {
  const needed = Math.ceil(maxRounds / 2);
  let html = '';
  for (let i = 0; i < needed; i++) {
    html += `<div class="pip ${i < wins ? 'won' : ''}"></div>`;
  }
  return html;
}

function renderHpBar(lp) {
  const cls = hpClass(lp);
  return `
    <div class="hp-bar-wrap">
      <div class="hp-bar-label"><span>LP</span><span>${lp} / ${MAX_LP}</span></div>
      <div class="hp-bar-track"><div class="hp-bar-fill ${cls}" style="width:${hpPct(lp)}%"></div></div>
    </div>`;
}

function renderLogLine(entry) {
  return `<div class="log-line ${entry.type}">${entry.text}</div>`;
}

// ── MENU ──────────────────────────────────────────────────────────────────────

function renderMenu() {
  setHTML('screen-menu', `
    <h1>ARENA<br>OF ODDS</h1>
    <p class="menu-tagline">COIN · DICE · DUEL</p>
    <div class="menu-buttons">
      <button class="btn btn-primary btn-large" onclick="goNewGame()">⚔️  New Game</button>
      <button class="btn btn-secondary"         onclick="goHowToPlay()">📖  How to Play</button>
    </div>
    <p class="subtitle" style="margin-top:12px;font-size:0.75rem">Fantasy Arena · Manual PvP · 4–8 Players</p>
  `);
  showScreen('screen-menu');
}

function goNewGame() {
  uiState.setupFighters = [];
  uiState.currentSetupIdx = 0;
  uiState.playerCount = 4;
  renderPlayerCount();
}

function goHowToPlay() {
  renderHowToPlay();
}

// ── PLAYER COUNT ──────────────────────────────────────────────────────────────

function renderPlayerCount() {
  let btns = '';
  for (let n = 4; n <= 8; n++) {
    btns += `<button class="count-btn ${uiState.playerCount === n ? 'selected' : ''}" onclick="setCount(${n})">${n}</button>`;
  }
  setHTML('screen-count', `
    <div style="text-align:center;max-width:420px;display:flex;flex-direction:column;gap:20px">
      <div>
        <h2>Number of Fighters</h2>
        <p class="subtitle">Choose how many fighters enter the arena (4–8)</p>
      </div>
      <div class="count-row">${btns}</div>
      <button class="btn btn-primary btn-large" onclick="startSetup()">Continue →</button>
      <button class="btn btn-secondary" onclick="renderMenu()">← Back</button>
    </div>
  `);
  showScreen('screen-count');
}

function setCount(n) {
  uiState.playerCount = n;
  renderPlayerCount();
}

function startSetup() {
  uiState.setupFighters = [];
  uiState.currentSetupIdx = 0;
  uiState.pendingName = '';
  uiState.pendingAvatar = AVATARS[0].id;
  uiState.pendingSkill = SKILL_IDS[0];
  renderFighterSetup();
}

// ── FIGHTER SETUP ─────────────────────────────────────────────────────────────

function renderFighterSetup() {
  const idx = uiState.currentSetupIdx;
  const total = uiState.playerCount;

  let dots = '';
  for (let i = 0; i < total; i++) {
    let cls = i < idx ? 'done' : i === idx ? 'current' : '';
    dots += `<div class="setup-progress-dot ${cls}"></div>`;
  }

  let avatarGrid = '';
  for (const av of AVATARS) {
    const sel = uiState.pendingAvatar === av.id ? 'selected' : '';
    avatarGrid += `
      <div class="avatar-option ${sel}" onclick="selectAvatar('${av.id}')">
        <span class="av-icon">${av.icon}</span>
        <span class="av-label">${av.label}</span>
      </div>`;
  }

  let skillGrid = '';
  for (const sid of SKILL_IDS) {
    const s = SKILLS[sid];
    const sel = uiState.pendingSkill === sid ? 'selected' : '';
    skillGrid += `
      <div class="skill-option ${sel}" onclick="selectSkill('${sid}')">
        <span class="skill-icon" style="color:${s.color}">${s.icon}</span>
        <div class="skill-info">
          <div class="skill-name" style="color:${s.color}">${s.name}</div>
          <div class="skill-desc">${s.description}</div>
        </div>
      </div>`;
  }

  setHTML('screen-setup', `
    <div class="setup-step">
      <div>
        <h2>Fighter ${idx + 1} of ${total}</h2>
        <div class="setup-progress" style="margin-top:8px">${dots}</div>
      </div>

      <div>
        <div class="input-label">Name (max 16 chars)</div>
        <input class="text-input" id="fighter-name-input" type="text" maxlength="16"
          placeholder="Enter name…" value="${escapeHtml(uiState.pendingName)}"
          oninput="uiState.pendingName = this.value">
      </div>

      <div>
        <div class="input-label">Avatar</div>
        <div class="avatar-grid">${avatarGrid}</div>
      </div>

      <div>
        <div class="input-label">Skill</div>
        <div class="skill-grid">${skillGrid}</div>
      </div>

      <div class="btn-row">
        ${idx > 0 ? `<button class="btn btn-secondary" onclick="goBackSetup()">← Back</button>` : `<button class="btn btn-secondary" onclick="renderPlayerCount()">← Back</button>`}
        <button class="btn btn-primary" onclick="confirmFighter()">
          ${idx + 1 < total ? 'Next Fighter →' : 'Continue →'}
        </button>
      </div>
    </div>
  `);
  showScreen('screen-setup');
  // Focus name input
  setTimeout(() => {
    const inp = document.getElementById('fighter-name-input');
    if (inp) inp.focus();
  }, 50);
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function selectAvatar(id) {
  uiState.pendingAvatar = id;
  renderFighterSetup();
}

function selectSkill(id) {
  uiState.pendingSkill = id;
  renderFighterSetup();
}

function goBackSetup() {
  uiState.currentSetupIdx = Math.max(0, uiState.currentSetupIdx - 1);
  // Restore previous fighter's data for editing
  const prev = uiState.setupFighters[uiState.currentSetupIdx];
  if (prev) {
    uiState.pendingName = prev.name;
    uiState.pendingAvatar = prev.avatar;
    uiState.pendingSkill = prev.skill;
    uiState.setupFighters.splice(uiState.currentSetupIdx, 1);
  }
  renderFighterSetup();
}

function confirmFighter() {
  const name = (uiState.pendingName || '').trim() || `Fighter ${uiState.currentSetupIdx + 1}`;
  const fighter = createFighter(name, uiState.pendingAvatar, uiState.pendingSkill);
  uiState.setupFighters.push(fighter);
  uiState.currentSetupIdx++;

  if (uiState.currentSetupIdx >= uiState.playerCount) {
    gameState.fighters = [...uiState.setupFighters];
    uiState.pendingName = '';
    uiState.pendingAvatar = AVATARS[0].id;
    uiState.pendingSkill = SKILL_IDS[0];
    renderModeSelect();
  } else {
    uiState.pendingName = '';
    uiState.pendingAvatar = AVATARS[0].id;
    uiState.pendingSkill = SKILL_IDS[0];
    renderFighterSetup();
  }
}

// ── MODE SELECT ───────────────────────────────────────────────────────────────

function renderModeSelect() {
  const n = gameState.fighters.length;
  setHTML('screen-mode', `
    <div style="text-align:center;margin-bottom:8px">
      <h2>Choose Mode</h2>
      <p class="subtitle">${n} fighters ready for battle</p>
    </div>
    <div class="mode-cards">
      <div class="mode-card" onclick="startLeague()">
        <div class="mode-icon">🏆</div>
        <h3>League Mode</h3>
        <p>Every fighter faces every other fighter once. Top 2 advance to a Best-of-5 Grand Final.</p>
        <span class="skill-badge" style="color:var(--gold);border-color:var(--gold)">⚔️ Best of 3 · Final Bo5</span>
      </div>
      <div class="mode-card" onclick="startCup()">
        <div class="mode-icon">🥊</div>
        <h3>Cup Mode</h3>
        <p>Single-elimination knockout bracket. ${n === 4 ? '4-player: Semi-Finals + Final.' : '8-player: QF + SF + Final.'} Losers go home.</p>
        <span class="skill-badge" style="color:var(--secondary);border-color:var(--secondary)">⚔️ Best of 3 · Final Bo5</span>
      </div>
    </div>
    <button class="btn btn-secondary" style="margin-top:16px" onclick="renderFighterSetup_back()">← Back</button>
  `);
  showScreen('screen-mode');
}

function renderFighterSetup_back() {
  // Go back to last fighter setup step
  uiState.currentSetupIdx = gameState.fighters.length - 1;
  const last = gameState.fighters[gameState.fighters.length - 1];
  uiState.pendingName = last.name;
  uiState.pendingAvatar = last.avatar;
  uiState.pendingSkill = last.skill;
  uiState.setupFighters = [...gameState.fighters];
  uiState.setupFighters.pop();
  gameState.fighters = [];
  renderFighterSetup();
}

function startLeague() {
  gameState.mode = 'league';
  initLeagueTable();
  gameState.schedule = generateRoundRobin();
  gameState.scheduleIndex = 0;
  gameState.leagueFinalDone = false;
  uiState.isLeagueFinal = false;
  launchNextLeagueMatch();
}

function startCup() {
  gameState.mode = 'cup';
  gameState.cupBracket = generateCupBracket();
  launchCurrentCupMatch();
}

// ── TOURNAMENT FLOW ───────────────────────────────────────────────────────────

function launchNextLeagueMatch() {
  const match = gameState.schedule[gameState.scheduleIndex];
  const f1 = getFighter(match.fighter1Id);
  const f2 = getFighter(match.fighter2Id);
  const matchNum = gameState.scheduleIndex + 1;
  const total = gameState.schedule.length;
  uiState.isLeagueFinal = false;
  uiState.cupIsFinal = false;
  resetFightDisplay();
  startMatch(match.fighter1Id, match.fighter2Id, 3);
  renderFight(`Match ${matchNum}/${total}`, 'league');
}

function launchLeagueFinal() {
  const standings = getLeagueStandings();
  const f1 = standings[0].fighter;
  const f2 = standings[1].fighter;
  uiState.isLeagueFinal = true;
  uiState.cupIsFinal = false;
  resetFightDisplay();
  startMatch(f1.id, f2.id, 5);
  renderFight('⚜️ LEAGUE GRAND FINAL', 'league-final');
}

function launchCurrentCupMatch() {
  const b = gameState.cupBracket;
  const round = b.rounds[b.currentRound];
  const match = round.matches[b.currentMatchIdx];
  const isFinal = b.currentRound === b.rounds.length - 1;
  uiState.cupIsFinal = isFinal;
  uiState.isLeagueFinal = false;
  const maxRounds = isFinal ? 5 : 3;
  const title = `${round.name} — Match ${b.currentMatchIdx + 1}`;
  resetFightDisplay();
  startMatch(match.fighter1Id, match.fighter2Id, maxRounds);
  renderFight(isFinal ? `🏆 ${round.name}` : title, 'cup');
}

function resetFightDisplay() {
  uiState.attackCoin = null;
  uiState.attackDice = null;
  uiState.defendCoin = null;
}

function continueAfterMatch() {
  if (gameState.mode === 'league') {
    if (uiState.isLeagueFinal) {
      // Final is done
      const winnerId = getMatchWinnerId();
      gameState.leagueFinalDone = true;
      if (winnerId) renderWinner(winnerId);
      else {
        // Draw in final - tiebreaker: round wins
        const m = gameState.currentMatch;
        const f1rw = m.roundResults.filter(r => r === 'f1').length;
        const f2rw = m.roundResults.filter(r => r === 'f2').length;
        const id = f1rw >= f2rw ? m.fighter1Id : m.fighter2Id;
        renderWinner(id);
      }
    } else {
      recordLeagueResult();
      gameState.scheduleIndex++;
      if (gameState.scheduleIndex < gameState.schedule.length) {
        renderStandings(false);
      } else {
        renderStandings(true); // show "Start Final" button
      }
    }
  } else {
    // Cup mode
    const m = gameState.currentMatch;
    let winnerId = getMatchWinnerId();
    if (!winnerId) {
      // Draw tiebreaker
      const f1rw = m.roundResults.filter(r => r === 'f1').length;
      const f2rw = m.roundResults.filter(r => r === 'f2').length;
      winnerId = f1rw >= f2rw ? m.fighter1Id : m.fighter2Id;
    }
    const status = advanceCupBracket(winnerId);
    if (status === 'tournament_over') {
      renderWinner(winnerId);
    } else {
      renderBracket();
    }
  }
}

// ── FIGHT SCREEN ──────────────────────────────────────────────────────────────

function renderFight(matchTitle, context) {
  const m = gameState.currentMatch;
  const f1 = getFighter(m.fighter1Id);
  const f2 = getFighter(m.fighter2Id);
  const attacker = getAttacker();
  const defender = getDefender();
  const phase = m.phase;
  const maxRounds = m.maxRounds;
  const winsNeeded = Math.ceil(maxRounds / 2);

  const isDefendPhase = phase === 'defend_coin' || phase === 'defend_roll';
  const activeId = isDefendPhase ? defender.id : attacker.id;

  // Determine coin display
  let coinContent, coinClass;
  if (phase === 'attack_roll' || phase === 'defend_coin') {
    coinContent = uiState.attackCoin === 'heads' ? 'HEADS' : (uiState.attackCoin === 'tails' ? 'TAILS' : '🪙');
    coinClass = uiState.attackCoin || '';
  } else if (phase === 'defend_roll' || phase === 'round_end' || phase === 'match_end') {
    coinContent = uiState.defendCoin === 'heads' ? 'HEADS' : (uiState.defendCoin === 'tails' ? 'TAILS' : '🪙');
    coinClass = uiState.defendCoin || '';
  } else {
    coinContent = '🪙'; coinClass = '';
  }

  // Determine dice display
  let diceContent;
  if ((phase === 'defend_coin' || phase === 'defend_roll' || phase === 'round_end' || phase === 'match_end') && uiState.attackDice) {
    diceContent = DICE_FACES[uiState.attackDice] || uiState.attackDice;
  } else if (phase === 'round_end' || phase === 'match_end') {
    diceContent = '🎲';
  } else {
    diceContent = '🎲';
  }

  // Turn banner
  let bannerText, bannerClass;
  if (phase === 'attack_coin' || phase === 'attack_roll') {
    bannerText = `⚔️  ATTACKER: ${attacker.name}`;
    bannerClass = '';
  } else if (phase === 'defend_coin' || phase === 'defend_roll') {
    bannerText = `🛡️  DEFENDER: ${defender.name}`;
    bannerClass = 'defender';
  } else if (phase === 'round_end') {
    bannerText = `🏁 END OF ROUND ${m.round}`;
    bannerClass = 'defender';
  } else {
    bannerText = `🏆 MATCH OVER`;
    bannerClass = 'defender';
  }

  // Action button
  let actionBtn;
  if (phase === 'attack_coin') {
    actionBtn = `<button class="btn btn-primary btn-large" onclick="handleFightAction()">🪙 FLIP COIN — ${attacker.name}</button>`;
  } else if (phase === 'attack_roll') {
    actionBtn = `<button class="btn btn-primary btn-large" onclick="handleFightAction()">🎲 ROLL DICE — ${attacker.name}</button>`;
  } else if (phase === 'defend_coin') {
    actionBtn = `<button class="btn btn-gold btn-large" onclick="handleFightAction()">🪙 FLIP COIN — ${defender.name}</button>`;
  } else if (phase === 'defend_roll') {
    actionBtn = `<button class="btn btn-gold btn-large" onclick="handleFightAction()">🎲 ROLL DICE — ${defender.name}</button>`;
  } else if (phase === 'round_end') {
    actionBtn = `<button class="btn btn-secondary btn-large" onclick="handleFightAction()">▶ NEXT ROUND</button>`;
  } else {
    actionBtn = `<button class="btn btn-gold btn-large" onclick="handleFightAction()">▶ VIEW RESULTS</button>`;
  }

  const f1active = activeId === f1.id ? 'active-fighter' : '';
  const f2active = activeId === f2.id ? 'active-fighter' : '';

  const logHtml = m.log.map(renderLogLine).join('');

  setHTML('screen-fight', `
    <div class="fight-header">
      <span class="match-title">${matchTitle || 'Match'}</span>
      <span class="vs">vs</span>
      <span>Round <strong>${m.round}</strong> of ${maxRounds}</span>
    </div>

    <div class="fighters-row">
      <div class="fighter-panel ${f1active}">
        <div class="fighter-name-row">
          <span class="fighter-avatar">${avatarIcon(f1.avatar)}</span>
          <span class="fighter-name">${escapeHtml(f1.name)}</span>
          <div class="fighter-pips round-pips">${renderPips(f1.roundWins, maxRounds)}</div>
        </div>
        ${renderHpBar(f1.lp)}
        <div style="margin-top:8px">${renderSkillBadge(f1.skill)}</div>
      </div>
      <div class="fighter-panel ${f2active}">
        <div class="fighter-name-row">
          <span class="fighter-avatar">${avatarIcon(f2.avatar)}</span>
          <span class="fighter-name">${escapeHtml(f2.name)}</span>
          <div class="fighter-pips round-pips">${renderPips(f2.roundWins, maxRounds)}</div>
        </div>
        ${renderHpBar(f2.lp)}
        <div style="margin-top:8px">${renderSkillBadge(f2.skill)}</div>
      </div>
    </div>

    <div class="arena-center">
      <div class="turn-banner ${bannerClass}" id="fight-banner">${bannerText}</div>
      <div class="action-items">
        <div class="action-visual">
          <label>COIN</label>
          <div class="coin ${coinClass}" id="fight-coin">${coinContent}</div>
        </div>
        <div style="font-size:1.5rem;color:var(--muted)">•</div>
        <div class="action-visual">
          <label>DICE</label>
          <div class="dice" id="fight-dice">${diceContent}</div>
        </div>
      </div>
      ${actionBtn}
    </div>

    <div class="action-log" id="fight-log">${logHtml}</div>
  `);

  // Store match title for re-renders
  gameState.currentMatch._title = matchTitle;
  gameState.currentMatch._context = context;

  showScreen('screen-fight');
}

function handleFightAction() {
  const m = gameState.currentMatch;
  const phase = m.phase;

  if (phase === 'attack_coin') {
    const { coin, reroll } = doAttackCoin();
    // Show the effective coin (reroll result if Gambler's Edge fired, else original)
    uiState.attackCoin = (reroll !== undefined) ? reroll : coin;
    if (m.phase !== 'attack_roll') {
      // Turn passed — clear display for incoming attacker
      uiState.attackCoin = null;
      uiState.attackDice = null;
      uiState.defendCoin = null;
    }
    rerenderFight();
    animateEl('fight-coin', 'flip-anim');

  } else if (phase === 'attack_roll') {
    const { roll } = doAttackRoll();
    uiState.attackDice = roll;
    rerenderFight();
    animateEl('fight-dice', 'roll-anim');

  } else if (phase === 'defend_coin') {
    const prevPhase = m.phase;
    const { coin } = doDefendCoin();
    uiState.defendCoin = coin;
    if (m.phase !== 'defend_roll') {
      // Defense TAILS — damage applied, turn may have passed
      uiState.attackCoin = null;
      uiState.attackDice = null;
      uiState.defendCoin = null;
    }
    rerenderFight();
    animateEl('fight-coin', 'flip-anim');

  } else if (phase === 'defend_roll') {
    doDefendRoll();
    uiState.attackCoin = null;
    uiState.attackDice = null;
    uiState.defendCoin = null;
    rerenderFight();
    animateEl('fight-dice', 'roll-anim');

  } else if (phase === 'round_end') {
    startNextRound();
    uiState.attackCoin = null;
    uiState.attackDice = null;
    uiState.defendCoin = null;
    rerenderFight();

  } else if (phase === 'match_end') {
    renderMatchResult();
  }
}

function rerenderFight() {
  renderFight(gameState.currentMatch._title, gameState.currentMatch._context);
}

function animateEl(id, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth; // reflow
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 700);
}

// ── MATCH RESULT ──────────────────────────────────────────────────────────────

function renderMatchResult() {
  const m = gameState.currentMatch;
  const f1 = getFighter(m.fighter1Id);
  const f2 = getFighter(m.fighter2Id);
  const winnerId = getMatchWinnerId();
  const winner = winnerId ? getFighter(winnerId) : null;

  let resultBanner;
  if (!winner) {
    resultBanner = `<div class="match-result-banner">🤝 Match Draw!</div>`;
  } else {
    resultBanner = `
      <div class="match-result-banner">
        ${avatarIcon(winner.avatar)} ${escapeHtml(winner.name)} Wins!
      </div>`;
  }

  // Round-by-round results
  let roundRows = '';
  for (let i = 0; i < m.roundResults.length; i++) {
    const r = m.roundResults[i];
    const w = r === 'f1' ? f1.name : r === 'f2' ? f2.name : 'Draw';
    const icon = r === 'draw' ? '🤝' : '🏆';
    roundRows += `<div class="log-line system">Round ${i + 1}: ${icon} ${escapeHtml(w)}</div>`;
  }

  const f1wins = m.roundResults.filter(r => r === 'f1').length;
  const f2wins = m.roundResults.filter(r => r === 'f2').length;

  setHTML('screen-result', `
    <div style="width:100%;max-width:480px;display:flex;flex-direction:column;gap:20px;text-align:center">
      <h2>Match Result</h2>
      ${resultBanner}

      <div style="display:flex;justify-content:center;gap:32px;font-size:1.1rem;font-weight:700">
        <div>
          <div style="color:var(--muted);font-size:0.75rem">ROUNDS WON</div>
          <div>${avatarIcon(f1.avatar)} ${f1wins}</div>
          <div style="font-size:0.85rem;color:var(--muted)">${escapeHtml(f1.name)}</div>
        </div>
        <div style="color:var(--secondary);align-self:center">vs</div>
        <div>
          <div style="color:var(--muted);font-size:0.75rem">ROUNDS WON</div>
          <div>${avatarIcon(f2.avatar)} ${f2wins}</div>
          <div style="font-size:0.85rem;color:var(--muted)">${escapeHtml(f2.name)}</div>
        </div>
      </div>

      <div class="action-log">${roundRows}</div>

      <button class="btn btn-primary btn-large" onclick="continueAfterMatch()">Continue →</button>
    </div>
  `);
  showScreen('screen-result');
}

// ── STANDINGS ─────────────────────────────────────────────────────────────────

function renderStandings(showFinal) {
  const rows = getLeagueStandings();
  const nextMatch = !showFinal && gameState.schedule[gameState.scheduleIndex];
  const nextF1 = nextMatch ? getFighter(nextMatch.fighter1Id) : null;
  const nextF2 = nextMatch ? getFighter(nextMatch.fighter2Id) : null;

  let tableRows = '';
  rows.forEach(({ fighter: f, stats: s }, i) => {
    const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : '';
    const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
    tableRows += `
      <tr class="${rankClass}">
        <td>${rankIcon}</td>
        <td><span class="fighter-tag"><span class="tag-avatar">${avatarIcon(f.avatar)}</span>${escapeHtml(f.name)}</span></td>
        <td>${s.played}</td>
        <td>${s.won}</td>
        <td>${s.drawn}</td>
        <td>${s.lost}</td>
        <td>${s.roundsWon}</td>
        <td>${s.roundsLost}</td>
        <td class="pts-cell">${s.points}</td>
      </tr>`;
  });

  let ctaHtml;
  if (showFinal) {
    const top1 = rows[0].fighter;
    const top2 = rows[1].fighter;
    ctaHtml = `
      <div class="card card-glow" style="text-align:center;padding:20px">
        <h3 style="color:var(--gold);margin-bottom:8px">⚜️ LEAGUE GRAND FINAL</h3>
        <p style="color:var(--muted);margin-bottom:12px">Best of 5 — Top 2 fighters battle for the championship</p>
        <div style="font-size:1rem;font-weight:700;margin-bottom:16px">
          ${avatarIcon(top1.avatar)} ${escapeHtml(top1.name)}
          <span style="color:var(--secondary)"> vs </span>
          ${avatarIcon(top2.avatar)} ${escapeHtml(top2.name)}
        </div>
        <button class="btn btn-gold btn-large" onclick="launchLeagueFinal()">⚜️ Start Grand Final</button>
      </div>`;
  } else {
    ctaHtml = `
      <div class="card" style="text-align:center;padding:16px">
        <p style="color:var(--muted);font-size:0.85rem;margin-bottom:12px">NEXT MATCH</p>
        <div style="font-size:1rem;font-weight:700;margin-bottom:16px">
          ${avatarIcon(nextF1.avatar)} ${escapeHtml(nextF1.name)}
          <span style="color:var(--secondary)"> vs </span>
          ${avatarIcon(nextF2.avatar)} ${escapeHtml(nextF2.name)}
        </div>
        <button class="btn btn-primary btn-large" onclick="launchNextLeagueMatch()">▶ Start Match</button>
      </div>`;
  }

  setHTML('screen-standings', `
    <div style="width:100%;max-width:720px;display:flex;flex-direction:column;gap:20px">
      <h2 class="section-title">🏆 League Standings</h2>
      <div class="card" style="overflow-x:auto">
        <table class="standings-table">
          <thead>
            <tr>
              <th>#</th><th style="text-align:left">Fighter</th>
              <th>P</th><th>W</th><th>D</th><th>L</th>
              <th>RW</th><th>RL</th><th>PTS</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      ${ctaHtml}
    </div>
  `);
  showScreen('screen-standings');
}

// ── CUP BRACKET ───────────────────────────────────────────────────────────────

function renderBracket() {
  const b = gameState.cupBracket;
  const cr = b.currentRound;
  const cm = b.currentMatchIdx;

  let roundsHtml = '';
  b.rounds.forEach((round, ri) => {
    let matchesHtml = '';
    round.matches.forEach((match, mi) => {
      const isActive = ri === cr && mi === cm && !match.winnerId;
      const f1 = match.fighter1Id ? getFighter(match.fighter1Id) : null;
      const f2 = match.fighter2Id ? getFighter(match.fighter2Id) : null;
      const w = match.winnerId;

      const f1Class = !f1 ? 'tbd' : w === match.fighter1Id ? 'winner' : '';
      const f2Class = !f2 ? 'tbd' : w === match.fighter2Id ? 'winner' : '';

      matchesHtml += `
        <div class="bracket-match ${isActive ? 'active' : ''}">
          <div class="bracket-fighter ${f1Class}">
            ${f1 ? `${avatarIcon(f1.avatar)} ${escapeHtml(f1.name)}` : '<em>TBD</em>'}
            ${w === match.fighter1Id ? ' 🏆' : ''}
          </div>
          <div class="bracket-fighter ${f2Class}">
            ${f2 ? `${avatarIcon(f2.avatar)} ${escapeHtml(f2.name)}` : '<em>TBD</em>'}
            ${w === match.fighter2Id ? ' 🏆' : ''}
          </div>
        </div>`;
    });

    roundsHtml += `
      <div class="bracket-round">
        <div class="bracket-round-title">${round.name}</div>
        ${matchesHtml}
      </div>`;
  });

  const nextMatch = b.rounds[cr].matches[cm];
  const nf1 = nextMatch && nextMatch.fighter1Id ? getFighter(nextMatch.fighter1Id) : null;
  const nf2 = nextMatch && nextMatch.fighter2Id ? getFighter(nextMatch.fighter2Id) : null;

  const isFinal = cr === b.rounds.length - 1;
  const btnText = isFinal ? '⚜️ Start Final (Bo5)' : '▶ Start Match (Bo3)';

  setHTML('screen-bracket', `
    <div style="width:100%;max-width:800px;display:flex;flex-direction:column;gap:20px">
      <h2 class="section-title">🥊 Cup Bracket</h2>
      <div class="card" style="overflow-x:auto">
        <div class="bracket-wrap">${roundsHtml}</div>
      </div>
      ${nf1 && nf2 ? `
        <div class="card" style="text-align:center;padding:16px">
          <p style="color:var(--muted);font-size:0.85rem;margin-bottom:10px">${b.rounds[cr].name} — Next</p>
          <div style="font-size:1rem;font-weight:700;margin-bottom:14px">
            ${avatarIcon(nf1.avatar)} ${escapeHtml(nf1.name)}
            <span style="color:var(--secondary)"> vs </span>
            ${avatarIcon(nf2.avatar)} ${escapeHtml(nf2.name)}
          </div>
          <button class="btn ${isFinal ? 'btn-gold' : 'btn-primary'} btn-large" onclick="launchCurrentCupMatch()">${btnText}</button>
        </div>` : ''}
    </div>
  `);
  showScreen('screen-bracket');
}

// ── WINNER SCREEN ─────────────────────────────────────────────────────────────

function renderWinner(fighterId) {
  const f = getFighter(fighterId);
  const mode = gameState.mode === 'league' ? 'League Champion' : 'Cup Champion';

  setHTML('screen-winner', `
    <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:20px;padding:20px">
      <div class="winner-crown">👑</div>
      <h1>${escapeHtml(f.name)}</h1>
      <div class="winner-avatar">${avatarIcon(f.avatar)}</div>
      <h2 style="color:var(--gold)">${mode}</h2>
      ${renderSkillBadge(f.skill)}
      <p style="color:var(--muted);max-width:320px">The arena falls silent. A legend is born.<br>The odds were defied.</p>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn btn-primary btn-large" onclick="goNewGame()">⚔️  New Tournament</button>
        <button class="btn btn-secondary" onclick="renderMenu()">🏠  Main Menu</button>
      </div>
    </div>
  `);
  showScreen('screen-winner');
}

// ── HOW TO PLAY ───────────────────────────────────────────────────────────────

function renderHowToPlay() {
  const skillsHtml = SKILL_IDS.map(sid => {
    const s = SKILLS[sid];
    return `<div class="log-line normal" style="padding:6px 0">
      <span style="color:${s.color}">${s.icon} <strong>${s.name}</strong></span> — ${s.description}
    </div>`;
  }).join('');

  setHTML('screen-howtoplay', `
    <div class="howto-content">
      <h2 style="text-align:center">📖 How to Play</h2>

      <div class="card howto-section">
        <h3>⚔️ Turn Structure</h3>
        <ol style="padding-left:20px;line-height:2">
          <li><strong>Attacker flips a coin</strong> — HEADS: attack proceeds. TAILS: turn ends.</li>
          <li><strong>Attacker rolls 1d6</strong> — this is the raw attack value (1–6).</li>
          <li><strong>Defender flips a coin</strong> — HEADS: defense proceeds. TAILS: full attack damage.</li>
          <li><strong>Defender rolls 1d6</strong> — if roll ≥ attack value, damage = 0. Otherwise damage = attack − defense.</li>
        </ol>
      </div>

      <div class="card howto-section">
        <h3>💥 Damage Formula</h3>
        <ul>
          <li>Defense TAILS → <strong>damage = attack value</strong></li>
          <li>Defense HEADS, defender roll ≥ attack value → <strong>0 damage (blocked)</strong></li>
          <li>Defense HEADS, defender roll &lt; attack value → <strong>damage = attack − defend</strong></li>
        </ul>
      </div>

      <div class="card howto-section">
        <h3>✨ Skills</h3>
        <div class="skills-list">${skillsHtml}</div>
      </div>

      <div class="card howto-section">
        <h3>🏆 Match Rules</h3>
        <ul>
          <li>Each fighter starts each round with <strong>500 LP</strong>.</li>
          <li>The fighter who reduces their opponent to 0 LP wins the round.</li>
          <li>Regular matches: <strong>Best of 3</strong>. Finals: <strong>Best of 5</strong>.</li>
          <li>The loser of a round attacks first in the next round.</li>
          <li>Simultaneous KO (both at 0 LP) = round draw.</li>
        </ul>
      </div>

      <div class="card howto-section">
        <h3>🗓️ Tournament Modes</h3>
        <ul>
          <li><strong>League Mode</strong> — Round-robin (everyone vs everyone). Win = 3 pts, Draw = 1 pt, Loss = 0 pts. Top 2 play a Grand Final.</li>
          <li><strong>Cup Mode</strong> — Single-elimination bracket. Losers are eliminated immediately.</li>
        </ul>
      </div>

      <button class="btn btn-secondary" onclick="renderMenu()">← Back to Menu</button>
    </div>
  `);
  showScreen('screen-howtoplay');
}

// ── INIT ──────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  renderMenu();
});
