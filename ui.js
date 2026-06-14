// ui.js — Screen rendering and event handling

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const uiState = {
  playerCount: 4,
  setupFighters: [],
  currentSetupIdx: 0,
  pendingName: '',
  pendingAvatar: AVATARS[0].id,
  pendingSkill: SKILL_IDS[0],
  // Fight display state — tracks results for sequential reveal
  attackCoin: null,   // 'heads' | 'tails' | null
  attackDice: null,   // 1–6 | null
  defendCoin: null,   // 'heads' | 'tails' | null
  defendDice: null,   // 1–6 | null
  isLeagueFinal: false,
  cupIsFinal: false,
};

// ── Screen manager ────────────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
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

function hpPct(lp, maxLp = MAX_LP) {
  return Math.max(0, Math.round((lp / maxLp) * 100));
}

function renderSkillBadge(skillId) {
  const s = skillData(skillId);
  return `<span class="skill-badge" style="color:${s.color};border-color:${s.color}">${s.icon} ${s.name}</span>`;
}

function renderPassiveBadge(avatarId) {
  const p = AVATAR_PASSIVES[avatarId];
  if (!p) return '';
  return `<span class="skill-badge passive-badge" style="color:${p.color};border-color:${p.color}" title="${p.description}">${p.icon} ${p.name}</span>`;
}

function renderPips(wins, maxRounds) {
  const needed = Math.ceil(maxRounds / 2);
  let html = '';
  for (let i = 0; i < needed; i++)
    html += `<div class="pip ${i < wins ? 'won' : ''}"></div>`;
  return html;
}

function renderHpBar(lp, maxLp = MAX_LP) {
  const cls = hpClass(lp);
  return `
    <div class="hp-bar-wrap">
      <div class="hp-bar-label"><span>LP</span><span>${lp} / ${maxLp}</span></div>
      <div class="hp-bar-track"><div class="hp-bar-fill ${cls}" style="width:${hpPct(lp, maxLp)}%"></div></div>
    </div>`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function clearFightDisplay() {
  uiState.attackCoin = null;
  uiState.attackDice = null;
  uiState.defendCoin = null;
  uiState.defendDice = null;
}

// ── MENU ──────────────────────────────────────────────────────────────────────

function renderMenu() {
  setHTML('screen-menu', `
    <div class="menu-title">
      <span class="line1">Arena of</span>
      <h1>ODDS</h1>
    </div>
    <div class="menu-buttons">
      <button class="btn btn-primary btn-large" onclick="goNewGame()">New Game</button>
      <button class="btn btn-secondary"         onclick="goHowToPlay()">How to Play</button>
    </div>
    <p class="subtitle">Coin · Dice · Duel &nbsp;·&nbsp; 4–8 Players</p>
  `);
  showScreen('screen-menu');
}

function goNewGame() {
  uiState.setupFighters = [];
  uiState.currentSetupIdx = 0;
  uiState.playerCount = 4;
  renderPlayerCount();
}

function goHowToPlay() { renderHowToPlay(); }

// ── PLAYER COUNT ──────────────────────────────────────────────────────────────

function renderPlayerCount() {
  let btns = '';
  for (let n = 4; n <= 8; n++)
    btns += `<button class="count-btn ${uiState.playerCount === n ? 'selected' : ''}" onclick="setCount(${n})">${n}</button>`;

  setHTML('screen-count', `
    <div style="text-align:center;max-width:400px;display:flex;flex-direction:column;gap:24px">
      <div><h2>How many fighters?</h2><p class="subtitle" style="margin-top:4px">4–8 players</p></div>
      <div class="count-row" style="justify-content:center">${btns}</div>
      <div class="btn-row">
        <button class="btn btn-secondary" onclick="renderMenu()">← Back</button>
        <button class="btn btn-primary" onclick="startSetup()">Continue →</button>
      </div>
    </div>
  `);
  showScreen('screen-count');
}

function setCount(n) { uiState.playerCount = n; renderPlayerCount(); }

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
    dots += `<div class="setup-dot ${cls}"></div>`;
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
        <div>
          <div class="skill-name" style="color:${s.color}">${s.name}</div>
          <div class="skill-desc">${s.description}</div>
        </div>
      </div>`;
  }

  setHTML('screen-setup', `
    <div class="setup-step">
      <div>
        <h2>Fighter ${idx + 1} <span style="color:var(--muted);font-weight:400">of ${total}</span></h2>
        <div class="setup-progress" style="margin-top:10px">${dots}</div>
      </div>

      <div>
        <div class="input-label">Name</div>
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
        ${idx > 0
          ? `<button class="btn btn-secondary" onclick="goBackSetup()">← Back</button>`
          : `<button class="btn btn-secondary" onclick="renderPlayerCount()">← Back</button>`}
        <button class="btn btn-primary" onclick="confirmFighter()">
          ${idx + 1 < total ? 'Next →' : 'Done →'}
        </button>
      </div>
    </div>
  `);
  showScreen('screen-setup');
  setTimeout(() => { const el = document.getElementById('fighter-name-input'); if (el) el.focus(); }, 50);
}

function selectAvatar(id) { uiState.pendingAvatar = id; renderFighterSetup(); }
function selectSkill(id)  { uiState.pendingSkill  = id; renderFighterSetup(); }

function goBackSetup() {
  uiState.currentSetupIdx = Math.max(0, uiState.currentSetupIdx - 1);
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
  uiState.setupFighters.push(createFighter(name, uiState.pendingAvatar, uiState.pendingSkill));
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
    <div style="text-align:center;margin-bottom:4px">
      <h2>Choose Mode</h2>
      <p class="subtitle" style="margin-top:4px">${n} fighters ready</p>
    </div>
    <div class="mode-cards">
      <div class="mode-card" onclick="startLeague()">
        <div class="mode-icon">🏆</div>
        <h3>League Mode</h3>
        <p>Everyone vs everyone. Top 2 fight a Best-of-5 Grand Final.</p>
      </div>
      <div class="mode-card" onclick="startCup()">
        <div class="mode-icon">🥊</div>
        <h3>Cup Mode</h3>
        <p>Single-elimination knockout. ${n === 4 ? 'SF + Final.' : 'QF + SF + Final.'} Losers go home.</p>
      </div>
    </div>
    <button class="btn btn-secondary" style="margin-top:12px" onclick="goBackFromMode()">← Back</button>
  `);
  showScreen('screen-mode');
}

function goBackFromMode() {
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
  const total = gameState.schedule.length;
  uiState.isLeagueFinal = false;
  uiState.cupIsFinal = false;
  clearFightDisplay();
  startMatch(match.fighter1Id, match.fighter2Id, 3);
  renderFight(`Match ${gameState.scheduleIndex + 1} of ${total}`, 'league');
}

function launchLeagueFinal() {
  const standings = getLeagueStandings();
  uiState.isLeagueFinal = true;
  uiState.cupIsFinal = false;
  clearFightDisplay();
  startMatch(standings[0].fighter.id, standings[1].fighter.id, 5);
  renderFight('Grand Final', 'league-final');
}

function launchCurrentCupMatch() {
  const b = gameState.cupBracket;
  const round = b.rounds[b.currentRound];
  const match = round.matches[b.currentMatchIdx];
  const isFinal = b.currentRound === b.rounds.length - 1;
  uiState.cupIsFinal = isFinal;
  uiState.isLeagueFinal = false;
  clearFightDisplay();
  startMatch(match.fighter1Id, match.fighter2Id, isFinal ? 5 : 3);
  renderFight(isFinal ? `${round.name}` : `${round.name}`, 'cup');
}

function continueAfterMatch() {
  if (gameState.mode === 'league') {
    if (uiState.isLeagueFinal) {
      const winnerId = cupTiebreak();
      gameState.leagueFinalDone = true;
      renderWinner(winnerId);
    } else {
      recordLeagueResult();
      gameState.scheduleIndex++;
      renderStandings(gameState.scheduleIndex >= gameState.schedule.length);
    }
  } else {
    const winnerId = cupTiebreak();
    const status = advanceCupBracket(winnerId);
    if (status === 'tournament_over') renderWinner(winnerId);
    else renderBracket();
  }
}

function cupTiebreak() {
  const m = gameState.currentMatch;
  const id = getMatchWinnerId();
  if (id) return id;
  const f1rw = m.roundResults.filter(r => r === 'f1').length;
  const f2rw = m.roundResults.filter(r => r === 'f2').length;
  return f1rw >= f2rw ? m.fighter1Id : m.fighter2Id;
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

  // Who is acting this phase?
  const isDefendPhase = phase === 'defend_coin' || phase === 'defend_roll';
  const isCoinPhase   = phase === 'attack_coin' || phase === 'defend_coin';
  const isDicePhase   = phase === 'attack_roll' || phase === 'defend_roll';
  const isEndPhase    = phase === 'round_end' || phase === 'match_end';
  const actor = isDefendPhase ? defender : attacker;
  const activeId = isEndPhase ? null : actor.id;

  // ── Context chips (previous results in this turn) ──
  let chips = '';
  if (phase === 'attack_roll') {
    chips = `<span class="ctx-chip heads">🪙 HEADS</span>`;
  }
  if (phase === 'defend_coin' || phase === 'defend_roll') {
    if (uiState.attackCoin === 'heads')
      chips += `<span class="ctx-chip heads">⚔️ HEADS</span>`;
    if (uiState.attackDice)
      chips += `<span class="ctx-chip dice">⚔️ Rolled ${DICE_FACES[uiState.attackDice]} (${uiState.attackDice})</span>`;
  }
  if (phase === 'defend_roll' && uiState.defendCoin === 'heads') {
    chips += `<span class="ctx-chip heads">🛡️ HEADS</span>`;
  }

  // ── Main central element ──
  let mainEl, roleLabel, actionLabel, actionBtn;

  if (isCoinPhase) {
    const coinResult = phase === 'attack_coin' ? uiState.attackCoin : uiState.defendCoin;
    const coinText = coinResult === 'heads' ? 'HEADS' : coinResult === 'tails' ? 'TAILS' : '?';
    const coinCls  = coinResult || 'pending';
    mainEl = `<div class="big-coin ${coinCls}" id="fight-coin">${coinText}</div>`;
    roleLabel   = phase === 'attack_coin' ? '⚔️ ATTACKER' : '🛡️ DEFENDER';
    actionLabel = phase === 'attack_coin' ? 'Flip your attack coin' : 'Flip your defense coin';
    actionBtn = `<button class="btn btn-primary btn-large" onclick="handleFightAction()">
      🪙 Flip — ${escapeHtml(actor.name)}
    </button>`;

  } else if (isDicePhase) {
    const diceVal = phase === 'attack_roll' ? uiState.attackDice : uiState.defendDice;
    const diceFace = diceVal ? DICE_FACES[diceVal] : '🎲';
    const diceCls  = diceVal ? 'rolled' : '';
    mainEl = `<div class="big-dice ${diceCls}" id="fight-dice">${diceFace}</div>`;
    roleLabel   = phase === 'attack_roll' ? '⚔️ ATTACKER' : '🛡️ DEFENDER';
    actionLabel = phase === 'attack_roll' ? 'Roll your attack dice' : 'Roll your defense dice';
    actionBtn = `<button class="btn btn-primary btn-large" onclick="handleFightAction()">
      🎲 Roll — ${escapeHtml(actor.name)}
    </button>`;

  } else if (phase === 'round_end') {
    mainEl      = `<div class="phase-icon">🏁</div>`;
    roleLabel   = `Round ${m.round} Complete`;
    actionLabel = 'Ready for the next round?';
    actionBtn   = `<button class="btn btn-secondary btn-large" onclick="handleFightAction()">Next Round →</button>`;

  } else {
    mainEl      = `<div class="phase-icon">🏆</div>`;
    roleLabel   = 'Match Over';
    actionLabel = 'See who won this match';
    actionBtn   = `<button class="btn btn-gold btn-large" onclick="handleFightAction()">View Results →</button>`;
  }

  const f1Active = activeId === f1.id ? 'active-panel' : '';
  const f2Active = activeId === f2.id ? 'active-panel' : '';
  const logHtml  = m.log.map(e => `<div class="log-line ${e.type}">${e.text}</div>`).join('');

  setHTML('screen-fight', `
    <div class="fight-header">
      <span class="match-title">${escapeHtml(matchTitle || 'Match')}</span>
      <span class="round-info">Round ${m.round} / ${maxRounds}</span>
    </div>

    <div class="fighters-row">
      <div class="fighter-panel ${f1Active}">
        <div class="fighter-name-row">
          <span class="fighter-avatar">${avatarIcon(f1.avatar)}</span>
          <span class="fighter-name">${escapeHtml(f1.name)}</span>
          <div class="fighter-pips round-pips">${renderPips(f1.roundWins, maxRounds)}</div>
        </div>
        ${renderHpBar(f1.lp, f1.maxLp)}
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">
          ${renderSkillBadge(f1.skill)}
          ${renderPassiveBadge(f1.avatar)}
        </div>
      </div>
      <div class="fighter-panel ${f2Active}">
        <div class="fighter-name-row">
          <span class="fighter-avatar">${avatarIcon(f2.avatar)}</span>
          <span class="fighter-name">${escapeHtml(f2.name)}</span>
          <div class="fighter-pips round-pips">${renderPips(f2.roundWins, maxRounds)}</div>
        </div>
        ${renderHpBar(f2.lp, f2.maxLp)}
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">
          ${renderSkillBadge(f2.skill)}
          ${renderPassiveBadge(f2.avatar)}
        </div>
      </div>
    </div>

    <div class="arena-center">
      <div class="turn-header">
        <div class="turn-role">${roleLabel}</div>
        ${!isEndPhase ? `<div class="turn-name">${escapeHtml(actor.name)}</div>` : ''}
        <div class="turn-action">${actionLabel}</div>
      </div>

      <div class="ctx-chips">${chips}</div>

      ${mainEl}

      ${actionBtn}
    </div>

    <div class="action-log" id="fight-log">${logHtml}</div>
  `);

  m._title = matchTitle;
  m._context = context;
  showScreen('screen-fight');
}

function handleFightAction() {
  const m = gameState.currentMatch;
  const phase = m.phase;

  if (phase === 'attack_coin') {
    clearFightDisplay();                           // fresh turn
    const { coin, reroll } = doAttackCoin();
    uiState.attackCoin = (reroll !== undefined) ? reroll : coin;
    rerenderFight();
    animateEl('fight-coin', 'flip-anim');

  } else if (phase === 'attack_roll') {
    const { roll } = doAttackRoll();
    uiState.attackDice = roll;
    rerenderFight();
    animateEl('fight-dice', 'roll-anim');

  } else if (phase === 'defend_coin') {
    const { coin } = doDefendCoin();
    uiState.defendCoin = coin;
    // If defense was TAILS the turn ended — clear stale attack results
    if (m.phase !== 'defend_roll') clearFightDisplay();
    rerenderFight();
    animateEl('fight-coin', 'flip-anim');

  } else if (phase === 'defend_roll') {
    const { roll } = doDefendRoll();
    uiState.defendDice = roll;
    // Turn completed normally (no round end) — clear for incoming attacker
    if (m.phase === 'attack_coin') clearFightDisplay();
    rerenderFight();
    animateEl('fight-dice', 'roll-anim');

  } else if (phase === 'round_end') {
    startNextRound();
    clearFightDisplay();
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
  void el.offsetWidth;
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

  const resultBanner = winner
    ? `<div class="match-result-banner">${avatarIcon(winner.avatar)}  ${escapeHtml(winner.name)} wins the match!</div>`
    : `<div class="match-result-banner">🤝 Match Draw</div>`;

  const f1rw = m.roundResults.filter(r => r === 'f1').length;
  const f2rw = m.roundResults.filter(r => r === 'f2').length;

  let roundRows = '';
  m.roundResults.forEach((r, i) => {
    const w = r === 'f1' ? f1.name : r === 'f2' ? f2.name : 'Draw';
    roundRows += `<div class="log-line system">Round ${i + 1}: ${r === 'draw' ? '🤝' : '🏆'} ${escapeHtml(w)}</div>`;
  });

  setHTML('screen-result', `
    <div style="width:100%;max-width:440px;display:flex;flex-direction:column;gap:20px;text-align:center">
      <h2>Match Result</h2>
      ${resultBanner}
      <div style="display:flex;justify-content:center;gap:40px">
        <div>
          <div style="font-size:1.8rem;font-weight:800">${f1rw}</div>
          <div style="font-size:0.75rem;color:var(--muted)">${avatarIcon(f1.avatar)} ${escapeHtml(f1.name)}</div>
        </div>
        <div style="color:var(--muted);align-self:center;font-size:0.8rem">rounds</div>
        <div>
          <div style="font-size:1.8rem;font-weight:800">${f2rw}</div>
          <div style="font-size:0.75rem;color:var(--muted)">${avatarIcon(f2.avatar)} ${escapeHtml(f2.name)}</div>
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
  const nextMatch = !showFinal ? gameState.schedule[gameState.scheduleIndex] : null;
  const nf1 = nextMatch ? getFighter(nextMatch.fighter1Id) : null;
  const nf2 = nextMatch ? getFighter(nextMatch.fighter2Id) : null;

  let tableRows = '';
  rows.forEach(({ fighter: f, stats: s }, i) => {
    const rankCls = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : '';
    const rankIcon = ['🥇','🥈','🥉'][i] || (i + 1);
    tableRows += `
      <tr class="${rankCls}">
        <td>${rankIcon}</td>
        <td><span class="fighter-tag"><span class="tag-avatar">${avatarIcon(f.avatar)}</span>${escapeHtml(f.name)}</span></td>
        <td>${s.played}</td><td>${s.won}</td><td>${s.drawn}</td><td>${s.lost}</td>
        <td>${s.roundsWon}</td><td>${s.roundsLost}</td>
        <td class="pts-cell">${s.points}</td>
      </tr>`;
  });

  let ctaHtml;
  if (showFinal) {
    const t1 = rows[0].fighter; const t2 = rows[1].fighter;
    ctaHtml = `
      <div class="card" style="text-align:center;padding:20px">
        <h3 style="color:var(--gold);margin-bottom:6px">Grand Final — Best of 5</h3>
        <div style="font-size:1rem;font-weight:700;margin:12px 0">
          ${avatarIcon(t1.avatar)} ${escapeHtml(t1.name)}
          <span style="color:var(--muted)"> vs </span>
          ${avatarIcon(t2.avatar)} ${escapeHtml(t2.name)}
        </div>
        <button class="btn btn-gold btn-large" onclick="launchLeagueFinal()">Start Grand Final</button>
      </div>`;
  } else {
    ctaHtml = `
      <div class="card" style="text-align:center;padding:16px">
        <div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Next Match</div>
        <div style="font-size:1rem;font-weight:700;margin-bottom:14px">
          ${avatarIcon(nf1.avatar)} ${escapeHtml(nf1.name)}
          <span style="color:var(--muted)"> vs </span>
          ${avatarIcon(nf2.avatar)} ${escapeHtml(nf2.name)}
        </div>
        <button class="btn btn-primary btn-large" onclick="launchNextLeagueMatch()">Start Match →</button>
      </div>`;
  }

  setHTML('screen-standings', `
    <div style="width:100%;max-width:680px;display:flex;flex-direction:column;gap:16px">
      <h2 class="section-title">League Standings</h2>
      <div class="card" style="overflow-x:auto;padding:0">
        <table class="standings-table">
          <thead><tr>
            <th>#</th><th style="text-align:left">Fighter</th>
            <th>P</th><th>W</th><th>D</th><th>L</th>
            <th>RW</th><th>RL</th><th>PTS</th>
          </tr></thead>
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
      const w  = match.winnerId;
      matchesHtml += `
        <div class="bracket-match ${isActive ? 'active' : ''}">
          <div class="bracket-fighter ${!f1 ? 'tbd' : w === match.fighter1Id ? 'winner' : ''}">
            ${f1 ? `${avatarIcon(f1.avatar)} ${escapeHtml(f1.name)}` : '<em>TBD</em>'}
            ${w === match.fighter1Id ? ' 🏆' : ''}
          </div>
          <div class="bracket-fighter ${!f2 ? 'tbd' : w === match.fighter2Id ? 'winner' : ''}">
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

  setHTML('screen-bracket', `
    <div style="width:100%;max-width:780px;display:flex;flex-direction:column;gap:16px">
      <h2 class="section-title">Cup Bracket</h2>
      <div class="card" style="overflow-x:auto"><div class="bracket-wrap">${roundsHtml}</div></div>
      ${nf1 && nf2 ? `
        <div class="card" style="text-align:center;padding:16px">
          <div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">
            ${b.rounds[cr].name} — ${isFinal ? 'Best of 5' : 'Best of 3'}
          </div>
          <div style="font-size:1rem;font-weight:700;margin-bottom:14px">
            ${avatarIcon(nf1.avatar)} ${escapeHtml(nf1.name)}
            <span style="color:var(--muted)"> vs </span>
            ${avatarIcon(nf2.avatar)} ${escapeHtml(nf2.name)}
          </div>
          <button class="btn ${isFinal ? 'btn-gold' : 'btn-primary'} btn-large" onclick="launchCurrentCupMatch()">
            ${isFinal ? '⚜️ Start Final' : 'Start Match →'}
          </button>
        </div>` : ''}
    </div>
  `);
  showScreen('screen-bracket');
}

// ── WINNER ────────────────────────────────────────────────────────────────────

function renderWinner(fighterId) {
  const f = getFighter(fighterId);
  const title = gameState.mode === 'league' ? 'League Champion' : 'Cup Champion';
  setHTML('screen-winner', `
    <div style="display:flex;flex-direction:column;align-items:center;gap:18px;padding:20px;text-align:center">
      <div class="winner-avatar">${avatarIcon(f.avatar)}</div>
      <h1>${escapeHtml(f.name)}</h1>
      <h2 style="color:var(--gold)">${title}</h2>
      <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">
        ${renderSkillBadge(f.skill)}
        ${renderPassiveBadge(f.avatar)}
      </div>
      <p style="color:var(--muted);max-width:300px;line-height:1.7">The arena falls silent.<br>The odds were defied.</p>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn btn-primary btn-large" onclick="goNewGame()">New Tournament</button>
        <button class="btn btn-secondary" onclick="renderMenu()">Main Menu</button>
      </div>
    </div>
  `);
  showScreen('screen-winner');
}

// ── HOW TO PLAY ───────────────────────────────────────────────────────────────

function renderHowToPlay() {
  const skillsHtml = SKILL_IDS.map(sid => {
    const s = SKILLS[sid];
    return `<div class="log-line" style="padding:5px 0;color:var(--text)">
      <span style="color:${s.color}">${s.icon} <strong>${s.name}</strong></span> — ${s.description}
    </div>`;
  }).join('');

  setHTML('screen-howtoplay', `
    <div class="howto-content">
      <h2 style="text-align:center">How to Play</h2>

      <div class="card howto-section">
        <h3>Turn Order</h3>
        <ol>
          <li><strong>Attack Coin</strong> — Attacker flips. HEADS = proceed. TAILS = turn ends.</li>
          <li><strong>Attack Dice</strong> — Attacker rolls 1d6. Result is the attack value (1–6).</li>
          <li><strong>Defense Coin</strong> — Defender flips. HEADS = proceed. TAILS = full damage.</li>
          <li><strong>Defense Dice</strong> — Defender rolls 1d6. Roll ≥ attack = blocked. Roll &lt; attack = damage.</li>
        </ol>
      </div>

      <div class="card howto-section">
        <h3>Damage Formula</h3>
        <ul>
          <li>Defense TAILS → <strong>attack value × 10</strong></li>
          <li>Defense HEADS, blocked → <strong>0 damage</strong></li>
          <li>Defense HEADS, not blocked → <strong>(attack − defense) × 10</strong></li>
        </ul>
      </div>

      <div class="card howto-section">
        <h3>Skills</h3>
        <div class="skills-list">${skillsHtml}</div>
      </div>

      <div class="card howto-section">
        <h3>Avatars &amp; Passives</h3>
        <div class="skills-list">
          ${Object.entries(AVATAR_PASSIVES).map(([id, p]) => {
            const av = AVATARS.find(a => a.id === id);
            return `<div class="log-line" style="padding:5px 0;color:var(--text)">
              <span style="color:${p.color}">${av ? av.icon : ''} <strong>${av ? av.label : id}</strong></span>
              <span class="skill-badge passive-badge" style="color:${p.color};border-color:${p.color};margin:0 4px">${p.icon} ${p.name}</span>
              — ${p.description}
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card howto-section">
        <h3>Match Rules</h3>
        <ul>
          <li>Fighters start at <strong>500 LP</strong> per round (Warrior: 600 LP).</li>
          <li>First to drop opponent to 0 LP wins the round.</li>
          <li>Regular matches: Best of 3. Finals: Best of 5.</li>
          <li>Loser of each round attacks first next round.</li>
        </ul>
      </div>

      <button class="btn btn-secondary" onclick="renderMenu()">← Back</button>
    </div>
  `);
  showScreen('screen-howtoplay');
}

// ── INIT ──────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => { renderMenu(); });
