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
  attackDice: null,   // sum of 2d6
  attackDie1: null,   // individual die 1
  attackDie2: null,   // individual die 2
  attackIsDoubles: false,
  attackExplosion: null,
  defendCoin: null,
  defendDice: null,
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
  return `<span class="skill-badge clickable" style="color:${s.color};border-color:${s.color}" onclick="showSkillPopup('skill','${skillId}')">${s.icon} ${s.name}</span>`;
}

function renderPassiveBadge(avatarId) {
  const p = AVATAR_PASSIVES[avatarId];
  if (!p) return '';
  return `<span class="skill-badge passive-badge clickable" style="color:${p.color};border-color:${p.color}" onclick="showSkillPopup('passive','${avatarId}')">${p.icon} ${p.name}</span>`;
}

function renderStanceBadge(stanceId) {
  if (!stanceId) return '';
  const s = STANCES[stanceId];
  if (!s) return '';
  return `<span class="skill-badge stance-badge clickable" style="color:${s.color};border-color:${s.color}" onclick="showSkillPopup('stance','${stanceId}')">${s.icon} ${s.name}</span>`;
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
  uiState.attackDie1 = null;
  uiState.attackDie2 = null;
  uiState.attackIsDoubles = false;
  uiState.attackExplosion = null;
  uiState.defendCoin = null;
  uiState.defendDice = null;
}

// ── MENU ──────────────────────────────────────────────────────────────────────

function renderMenu() {
  const continueBtn = hasSave()
    ? `<button class="btn btn-gold" onclick="continueGame()">Continue →</button>` : '';
  setHTML('screen-menu', `
    <div class="menu-title">
      <span class="line1">Arena of</span>
      <h1>ODDS</h1>
    </div>
    <div class="menu-buttons">
      ${continueBtn}
      <button class="btn btn-primary btn-large" onclick="goNewGame()">New Game</button>
      <button class="btn btn-secondary"         onclick="startPveSetup()">⚔️ PVE Campaign</button>
      <button class="btn btn-secondary"         onclick="goHowToPlay()">How to Play</button>
    </div>
    <p class="subtitle">Coin · Dice · Duel &nbsp;·&nbsp; 4–8 Players</p>
  `);
  showScreen('screen-menu');
}

function continueGame() {
  const screen = loadGame();
  if (!screen) { renderMenu(); return; }
  if (screen === 'result')    { renderMatchResult(); return; }
  if (screen === 'standings') { renderStandings(gameState.scheduleIndex >= gameState.schedule.length); return; }
  if (screen === 'bracket') {
    if (gameState.cupBracket && gameState.cupBracket.type === 'double_elim') renderDoubleElimBracket();
    else renderBracket();
    return;
  }
  if (screen === 'pve_camp')  { renderPveCamp(); return; }
  renderMenu();
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
    const p = AVATAR_PASSIVES[av.id];
    avatarGrid += `
      <div class="avatar-option ${sel}" onclick="selectAvatar('${av.id}')">
        <span class="av-icon">${av.icon}</span>
        <span class="av-label">${av.label}</span>
        ${p ? `<span class="av-passive" style="color:${p.color}">${p.icon} ${p.name}</span>` : ''}
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
        <div class="input-label">Avatar <span style="color:var(--muted);font-size:0.75rem">(includes a unique passive ability)</span></div>
        <div class="avatar-grid">${avatarGrid}</div>
      </div>

      <div>
        <div class="input-label">Skill</div>
        <div class="skill-grid">${skillGrid}</div>
      </div>

      <div class="btn-row">
        ${idx > 0
          ? `<button class="btn btn-secondary" onclick="goBackSetup()">← Back</button>`
          : uiState._pveSetup
            ? `<button class="btn btn-secondary" onclick="uiState._pveSetup=false;renderMenu()">← Back</button>`
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
  if (uiState._pveSetup) { confirmFighterPve(); return; }
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
        <p>Single-elimination. ${n === 4 ? 'SF + Final.' : 'QF + SF + Final.'} Losers go home.</p>
      </div>
      <div class="mode-card" onclick="startDoubleElim()">
        <div class="mode-icon">⚖️</div>
        <h3>Double Elimination</h3>
        <p>Upper & Lower brackets. One loss doesn't end your run. Grand Final reset possible.</p>
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

function startDoubleElim() {
  gameState.mode = 'cup';
  gameState.cupBracket = generateDoubleElimBracket();
  launchCurrentDoubleElimMatch();
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
  renderFight(`${round.name}`, 'cup');
}

function launchCurrentDoubleElimMatch() {
  const b = gameState.cupBracket;
  const stage = b.stages[b.currentStageIdx];
  const match = stage.matches[b.currentMatchIdx];
  const isGF = stage.type === 'gf' || stage.type === 'gf_reset';
  uiState.cupIsFinal = isGF;
  uiState.isLeagueFinal = false;
  clearFightDisplay();
  startMatch(match.fighter1Id, match.fighter2Id, isGF ? 5 : 3);
  renderFight(stage.name, 'cup');
}

function continueAfterMatch() {
  if (gameState.mode === 'pve') {
    continuePveAfterMatch();
    return;
  }
  if (gameState.mode === 'league') {
    if (uiState.isLeagueFinal) {
      const winnerId = cupTiebreak();
      gameState.leagueFinalDone = true;
      clearSave();
      renderWinner(winnerId);
    } else {
      recordLeagueResult();
      gameState.scheduleIndex++;
      saveGame('standings');
      renderStandings(gameState.scheduleIndex >= gameState.schedule.length);
    }
  } else {
    const winnerId = cupTiebreak();
    const isDE = gameState.cupBracket && gameState.cupBracket.type === 'double_elim';
    if (isDE) {
      const status = advanceDoubleElimBracket(winnerId);
      if (status === 'tournament_over') { clearSave(); renderWinner(getDoubleElimWinner()); }
      else { saveGame('bracket'); renderDoubleElimBracket(); }
    } else {
      const status = advanceCupBracket(winnerId);
      if (status === 'tournament_over') { clearSave(); renderWinner(winnerId); }
      else { saveGame('bracket'); renderBracket(); }
    }
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

// ── DECLARE PHASE ─────────────────────────────────────────────────────────────

function renderDeclarePhase(matchTitle) {
  const m = gameState.currentMatch;
  const f1 = getFighter(m.fighter1Id);
  const f2 = getFighter(m.fighter2Id);

  if (m.phase === 'declare_reveal') {
    const s1 = STANCES[m.stances[m.fighter1Id]];
    const s2 = STANCES[m.stances[m.fighter2Id]];
    setHTML('screen-fight', `
      <div class="fight-header">
        <span class="match-title">${escapeHtml(matchTitle || 'Match')}</span>
        <span class="round-info">Round ${m.round}</span>
      </div>
      <div class="declare-reveal">
        <div class="declare-reveal-title">⚔️ Stances Revealed!</div>
        <div class="declare-reveal-row">
          <div class="declare-reveal-card" style="border-color:${s1.color}">
            <div class="declare-rev-name">${avatarIcon(f1.avatar)} ${escapeHtml(f1.name)}</div>
            <div class="declare-rev-stance" style="color:${s1.color}">${s1.icon} ${s1.name}</div>
            <div class="declare-rev-desc">${s1.desc}</div>
          </div>
          <div class="declare-vs">VS</div>
          <div class="declare-reveal-card" style="border-color:${s2.color}">
            <div class="declare-rev-name">${avatarIcon(f2.avatar)} ${escapeHtml(f2.name)}</div>
            <div class="declare-rev-stance" style="color:${s2.color}">${s2.icon} ${s2.name}</div>
            <div class="declare-rev-desc">${s2.desc}</div>
          </div>
        </div>
        <button class="btn btn-primary btn-large" onclick="startRoundFromDeclare()">
          ⚔️ Begin Round ${m.round}!
        </button>
      </div>
    `);
    showScreen('screen-fight');
    return;
  }

  const isP1Turn = m.phase === 'declare_1';
  const declaring = isP1Turn ? f1 : f2;
  const other     = isP1Turn ? f2 : f1;

  const stanceCards = STANCE_IDS.map(sid => {
    const s = STANCES[sid];
    return `
      <div class="stance-option" onclick="selectStance('${sid}')" style="border-color:${s.color}20">
        <div class="stance-opt-icon" style="color:${s.color}">${s.icon}</div>
        <div class="stance-opt-name" style="color:${s.color}">${s.name}</div>
        <div class="stance-opt-desc">${s.desc}</div>
      </div>`;
  }).join('');

  setHTML('screen-fight', `
    <div class="fight-header">
      <span class="match-title">${escapeHtml(matchTitle || 'Match')}</span>
      <span class="round-info">Round ${m.round} — Declare</span>
    </div>
    <div class="declare-screen">
      <div class="declare-lookaway">
        👀 <strong>${escapeHtml(other.name)}</strong>, look away!
      </div>
      <div class="declare-prompt">
        ${avatarIcon(declaring.avatar)} <strong>${escapeHtml(declaring.name)}</strong>, choose your stance
      </div>
      <div class="stance-grid">${stanceCards}</div>
    </div>
  `);
  showScreen('screen-fight');
}

function selectStance(stanceId) {
  doStanceDeclare(stanceId);
  // In PVE, auto-pick balanced for the boss
  if (gameState.mode === 'pve' && gameState.currentMatch && gameState.currentMatch.phase === 'declare_2') {
    doStanceDeclare('balanced');
  }
  rerenderFight();
}

function startRoundFromDeclare() {
  doStanceReveal();
  rerenderFight();
}

// ── FIGHT SCREEN ──────────────────────────────────────────────────────────────

function renderFight(matchTitle, context) {
  const m = gameState.currentMatch;
  m._title = matchTitle;
  m._context = context;

  // Declare phases handled separately
  if (m.phase === 'declare_1' || m.phase === 'declare_2' || m.phase === 'declare_reveal') {
    renderDeclarePhase(matchTitle);
    return;
  }

  const f1 = getFighter(m.fighter1Id);
  const f2 = getFighter(m.fighter2Id);
  const attacker = getAttacker();
  const defender = getDefender();
  const phase = m.phase;
  const maxRounds = m.maxRounds;

  const isDefendPhase = phase === 'defend_coin' || phase === 'defend_roll';
  const isCoinPhase   = phase === 'attack_coin' || phase === 'defend_coin';
  const isDicePhase   = phase === 'attack_roll' || phase === 'defend_roll';
  const isEndPhase    = phase === 'round_end' || phase === 'match_end';
  const actor = isDefendPhase ? defender : attacker;
  const activeId = isEndPhase ? null : actor.id;

  // ── Context chips ──
  let chips = '';
  if (phase === 'attack_roll') {
    chips = `<span class="ctx-chip heads">🪙 HEADS</span>`;
  }
  if (phase === 'defend_coin' || phase === 'defend_roll') {
    if (uiState.attackCoin === 'heads')
      chips += `<span class="ctx-chip heads">⚔️ HEADS</span>`;
    if (uiState.attackDice) {
      const d1f = uiState.attackDie1 ? DICE_FACES[uiState.attackDie1] : '🎲';
      const d2f = uiState.attackDie2 ? DICE_FACES[uiState.attackDie2] : '🎲';
      let diceLabel = `⚔️ ${d1f}+${d2f}=${uiState.attackDice}`;
      if (uiState.attackExplosion) diceLabel += ` 💥+${uiState.attackExplosion}`;
      if (uiState.attackIsDoubles) diceLabel += ` ⚡Doubles!`;
      chips += `<span class="ctx-chip dice">${diceLabel}</span>`;
    }
  }
  if (phase === 'defend_roll' && uiState.defendCoin === 'heads') {
    chips += `<span class="ctx-chip heads">🛡️ HEADS</span>`;
  }

  // ── Shadow Blitz / Eagle Eye awareness for coin display ──
  const shadowActive = m.ultFlags && m.ultFlags[attacker.id + '_shadowblitz'];
  const eagleTailsActive = m.ultFlags && m.ultFlags[attacker.id + '_eagleeye_tails'];

  // ── Main central element ──
  let mainEl, roleLabel, actionLabel, actionBtn;

  const bossActing = isBossActingInPve();

  if (isCoinPhase) {
    const coinResult = phase === 'attack_coin' ? uiState.attackCoin : uiState.defendCoin;
    const coinText = coinResult === 'heads' ? 'HEADS' : coinResult === 'tails' ? 'TAILS' : '?';
    const coinCls  = coinResult || 'pending';
    mainEl = `<div class="big-coin ${coinCls}" id="fight-coin">${coinText}</div>`;
    roleLabel   = phase === 'attack_coin' ? '⚔️ ATTACKER' : '🛡️ DEFENDER';
    actionLabel = phase === 'attack_coin'
      ? (shadowActive ? '🌑 Shadow Blitz — Attack coin is auto-HEADS!' : 'Flip your attack coin')
      : (eagleTailsActive ? '🦅 Eagle Eye — Defense coin is forced TAILS!' : 'Flip your defense coin');
    const coinIcon = phase === 'attack_coin' ? (shadowActive ? '🌑' : '🪙') : (eagleTailsActive ? '🦅' : '🛡️');
    const isSpecialCoin = (phase === 'attack_coin' && shadowActive) || (phase === 'defend_coin' && eagleTailsActive);
    actionBtn = `<button class="btn-action-circle btn-primary${bossActing ? ' pulsing' : ''}" onclick="handleFightAction()" ${bossActing ? 'disabled' : ''}>
      <span class="btn-action-icon">${coinIcon}</span>
      <span class="btn-action-label">${bossActing ? '…' : isSpecialCoin ? 'AUTO' : escapeHtml(actor.name).slice(0, 9)}</span>
    </button>`;

  } else if (isDicePhase) {
    if (phase === 'attack_roll') {
      const hasRolled = !!uiState.attackDice;
      const d1f = uiState.attackDie1 ? DICE_FACES[uiState.attackDie1] : '🎲';
      const d2f = uiState.attackDie2 ? DICE_FACES[uiState.attackDie2] : '🎲';
      const sumDisplay = uiState.attackDice || '?';
      const explosion = uiState.attackExplosion;
      const pairCls = hasRolled ? 'rolled' : '';
      mainEl = `<div class="big-dice-pair ${pairCls}" id="fight-dice">
        <div class="big-dice-face">${d1f}</div>
        <div class="big-dice-sep">+</div>
        <div class="big-dice-face">${d2f}</div>
        <div class="big-dice-sep">=</div>
        <div class="big-dice-total">${sumDisplay}${explosion ? `<span class="explosion-badge">+${explosion}</span>` : ''}</div>
        ${uiState.attackIsDoubles && hasRolled ? '<div class="doubles-badge">⚡ Doubles!</div>' : ''}
      </div>`;
    } else {
      const rawDice = uiState.defendDice;
      const displayDice = rawDice ? Math.min(rawDice, 6) : null;
      const diceFace = displayDice ? DICE_FACES[displayDice] : '🎲';
      const diceCls = rawDice ? 'rolled' : '';
      mainEl = `<div class="big-dice ${diceCls}" id="fight-dice">${diceFace}</div>`;
    }
    roleLabel   = phase === 'attack_roll' ? '⚔️ ATTACKER' : '🛡️ DEFENDER';
    actionLabel = phase === 'attack_roll' ? 'Roll your attack dice' : 'Roll your defense dice';
    actionBtn = `<button class="btn-action-circle btn-primary${bossActing ? ' pulsing' : ''}" onclick="handleFightAction()" ${bossActing ? 'disabled' : ''}>
      <span class="btn-action-icon">🎲</span>
      <span class="btn-action-label">${bossActing ? '…' : escapeHtml(actor.name).slice(0, 9)}</span>
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

  // ── Ultimate button (attack turn only, if not yet used; hidden for PVE boss) ──
  let ultBtn = '';
  const isPlayerActing = gameState.mode !== 'pve' || !gameState.pve || actor.id === gameState.pve.playerId;
  if (phase === 'attack_coin' && m.ultReady && m.ultReady[actor.id] && isPlayerActing) {
    const ult = ULTIMATES[actor.avatar];
    if (ult) {
      ultBtn = `
        <button class="btn-ult" onclick="useUltimate()" style="--ult-col:${ult.color}" title="${ult.desc}">
          ${ult.icon} ${ult.name} <span class="ult-tag">ULTIMATE</span>
        </button>`;
    }
  }

  const f1Active = activeId === f1.id ? 'active-panel' : '';
  const f2Active = activeId === f2.id ? 'active-panel' : '';
  const logHtml  = m.log.map(e => `<div class="log-line ${e.type}">${e.text}</div>`).join('');

  const f1Ready   = !m.ultReady || m.ultReady[f1.id];
  const f2Ready   = !m.ultReady || m.ultReady[f2.id];
  const f1Charges = (m.ultCharges && m.ultCharges[f1.id]) || 0;
  const f2Charges = (m.ultCharges && m.ultCharges[f2.id]) || 0;
  const u1 = ULTIMATES[f1.avatar];
  const u2 = ULTIMATES[f2.avatar];

  setHTML('screen-fight', `
    <div class="fight-header">
      <span class="match-title">${escapeHtml(matchTitle || 'Match')}</span>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="round-info">Round ${m.round} / ${maxRounds}</span>
        <button class="btn-info" onclick="showInfoPanel()" title="Skills Guide">?</button>
      </div>
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
          ${renderStanceBadge(m.stances[f1.id])}
        </div>
        ${u1 ? `<div class="ult-indicator clickable ${f1Ready ? 'ult-ready' : 'ult-charging'}" style="${f1Ready ? `color:${u1.color}` : ''}" onclick="showSkillPopup('ult','${f1.avatar}')">
          ${f1Ready ? `${u1.icon} Ult Ready` : `⚡ ${'●'.repeat(f1Charges)}${'○'.repeat(ULT_TAILS_TO_RECHARGE - f1Charges)} Charging`}
        </div>` : ''}
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
          ${renderStanceBadge(m.stances[f2.id])}
        </div>
        ${u2 ? `<div class="ult-indicator clickable ${f2Ready ? 'ult-ready' : 'ult-charging'}" style="${f2Ready ? `color:${u2.color}` : ''}" onclick="showSkillPopup('ult','${f2.avatar}')">
          ${f2Ready ? `${u2.icon} Ult Ready` : `⚡ ${'●'.repeat(f2Charges)}${'○'.repeat(ULT_TAILS_TO_RECHARGE - f2Charges)} Charging`}
        </div>` : ''}
      </div>
    </div>

    <div class="arena-center">
      <div class="turn-header">
        <div class="turn-role">${roleLabel}</div>
        ${!isEndPhase ? `<div class="turn-name">${escapeHtml(actor.name)}</div>` : ''}
        <div class="turn-action">${bossActing ? '⏳ Boss is acting…' : actionLabel}</div>
      </div>

      <div class="ctx-chips">${chips}</div>

      ${mainEl}

      <div class="action-btns">
        ${ultBtn}
        ${actionBtn}
      </div>
    </div>

    <div class="action-log" id="fight-log">${logHtml}</div>
  `);

  showScreen('screen-fight');
}

function handleFightAction() {
  const m = gameState.currentMatch;
  const phase = m.phase;

  if (phase === 'attack_coin') {
    clearFightDisplay();
    const { coin, reroll, shadowBlitz } = doAttackCoin();
    uiState.attackCoin = shadowBlitz ? 'heads' : (reroll !== undefined ? reroll : coin);
    rerenderFight();
    animateEl('fight-coin', 'flip-anim');

  } else if (phase === 'attack_roll') {
    const { roll, die1, die2, explosionBonus, isDoubles } = doAttackRoll();
    uiState.attackDice = roll;
    uiState.attackDie1 = die1;
    uiState.attackDie2 = die2;
    uiState.attackIsDoubles = isDoubles || false;
    uiState.attackExplosion = explosionBonus || null;
    rerenderFight();
    animateEl('fight-dice', 'roll-anim');

  } else if (phase === 'defend_coin') {
    const result = doDefendCoin();
    uiState.defendCoin = (result.eagleEye || result.shadowBlitz) ? 'tails' : result.coin;
    if (m.phase !== 'defend_roll') clearFightDisplay();
    rerenderFight();
    animateEl('fight-coin', 'flip-anim');

  } else if (phase === 'defend_roll') {
    const { roll } = doDefendRoll();
    uiState.defendDice = roll;
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

function useUltimate() {
  doUltimate();
  rerenderFight();
}

function rerenderFight() {
  renderFight(gameState.currentMatch._title, gameState.currentMatch._context);
  autoPlayBossIfNeeded();
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

  if (gameState.mode !== 'pve') saveGame('result');
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

  if (gameState.mode === 'league') saveGame('standings');
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

// ── DOUBLE ELIM BRACKET ───────────────────────────────────────────────────────

function renderDoubleElimBracket() {
  const b = gameState.cupBracket;
  const cr = b.currentStageIdx;
  const cm = b.currentMatchIdx;

  const ubStages = b.stages.filter(s => s.type === 'ub');
  const lbStages = b.stages.filter(s => s.type === 'lb');
  const gfStages = b.stages.filter(s => s.type === 'gf' || s.type === 'gf_reset');

  function renderStageGroup(stages, title) {
    let html = `<div class="de-section"><div class="de-section-title">${title}</div><div class="bracket-wrap">`;
    stages.forEach(stage => {
      const stageIdx = b.stages.indexOf(stage);
      let matchHtml = '';
      stage.matches.forEach((match, mi) => {
        const isActive = stageIdx === cr && mi === cm && !match.winnerId;
        const f1 = match.fighter1Id ? getFighter(match.fighter1Id) : null;
        const f2 = match.fighter2Id ? getFighter(match.fighter2Id) : null;
        const w  = match.winnerId;
        matchHtml += `
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
      html += `<div class="bracket-round"><div class="bracket-round-title">${stage.name}</div>${matchHtml}</div>`;
    });
    html += `</div></div>`;
    return html;
  }

  const nextStage = b.stages[cr];
  const nextMatch = nextStage && nextStage.matches[cm];
  const nf1 = nextMatch && nextMatch.fighter1Id ? getFighter(nextMatch.fighter1Id) : null;
  const nf2 = nextMatch && nextMatch.fighter2Id ? getFighter(nextMatch.fighter2Id) : null;
  const isGF  = nextStage && (nextStage.type === 'gf' || nextStage.type === 'gf_reset');

  const lbNote = b.lbChampion && !isGF ? `<div class="de-note">⚠️ UB champion needs 1 win to claim the title. LB champion must win twice (to force a reset).</div>` : '';

  setHTML('screen-bracket', `
    <div style="width:100%;max-width:900px;display:flex;flex-direction:column;gap:16px">
      <h2 class="section-title">Double Elimination Bracket</h2>
      <div class="card" style="padding:16px">
        ${renderStageGroup(ubStages, '🔺 Upper Bracket')}
        ${renderStageGroup(lbStages, '🔻 Lower Bracket')}
        ${gfStages.length ? renderStageGroup(gfStages, '🏆 Grand Final') : ''}
      </div>
      ${lbNote}
      ${nf1 && nf2 ? `
        <div class="card" style="text-align:center;padding:16px">
          <div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">
            ${nextStage.name} — ${isGF ? 'Best of 5' : 'Best of 3'}
            ${isGF && nextStage.type === 'gf_reset' ? ' (RESET)' : ''}
          </div>
          <div style="font-size:1rem;font-weight:700;margin-bottom:14px">
            ${avatarIcon(nf1.avatar)} ${escapeHtml(nf1.name)}
            <span style="color:var(--muted)"> vs </span>
            ${avatarIcon(nf2.avatar)} ${escapeHtml(nf2.name)}
          </div>
          <button class="btn ${isGF ? 'btn-gold' : 'btn-primary'} btn-large" onclick="launchCurrentDoubleElimMatch()">
            ${isGF ? '⚜️ Start Grand Final' : 'Start Match →'}
          </button>
        </div>` : ''}
    </div>
  `);
  showScreen('screen-bracket');
}

// ── WINNER ────────────────────────────────────────────────────────────────────

function renderWinner(fighterId) {
  const f = getFighter(fighterId);
  const title = gameState.mode === 'league' ? 'League Champion' : gameState.mode === 'pve' ? 'Campaign Champion' : 'Cup Champion';
  clearSave();
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

// ── PVE CAMPAIGN ─────────────────────────────────────────────────────────────

let pveAutoPlayTimer = null;

function startPveSetup() {
  uiState.setupFighters = [];
  uiState.currentSetupIdx = 0;
  uiState.playerCount = 1;
  uiState.pendingName = '';
  uiState.pendingAvatar = AVATARS[0].id;
  uiState.pendingSkill = SKILL_IDS[0];
  uiState._pveSetup = true;
  renderFighterSetup();
}

function confirmFighterPve() {
  const name = (uiState.pendingName || '').trim() || 'Hero';
  const fighter = createFighter(name, uiState.pendingAvatar, uiState.pendingSkill);
  initPve(fighter);
  uiState._pveSetup = false;
  renderPveCamp();
}

function renderPveCamp() {
  const pve = gameState.pve;
  const player = gameState.fighters.find(f => f.id === pve.playerId);
  const stageIdx = pve.stageIdx;
  const stage = PVE_STAGES[stageIdx];
  const done = stageIdx >= PVE_STAGES.length;

  if (done) { clearPveProgress(); clearSave(); renderWinner(pve.playerId); return; }

  // Stage progress bar
  const progressDots = PVE_STAGES.map((s, i) => {
    const cls = i < stageIdx ? 'done' : i === stageIdx ? 'current' : '';
    return `<div class="setup-dot ${cls}" title="${s.name}"></div>`;
  }).join('');

  // Intel reveal
  const intelHtml = pve.intelActive
    ? `<div class="pve-intel">
        <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:4px">🔍 Monster Intel</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${renderSkillBadge(stage.skill)}
          ${renderPassiveBadge(stage.avatar)}
        </div>
       </div>`
    : '';

  // Upgrades on player
  const extraSkillHtml = pve.extraSkill ? renderSkillBadge(pve.extraSkill) : '';
  const upgradeList = pve.purchases.filter(id => !['monster_intel','revive'].includes(id)).map(id => {
    const item = PVE_SHOP_ITEMS.find(i => i.id === id);
    return item ? `<span class="pve-upgrade-tag">${item.icon} ${item.name}</span>` : '';
  }).join('');

  saveGame('pve_camp');

  setHTML('screen-pve-camp', `
    <div class="pve-camp-wrap">
      <div class="pve-progress">
        <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:6px">Stage ${stageIdx + 1} of ${PVE_STAGES.length}</div>
        <div class="setup-progress" style="max-width:300px">${progressDots}</div>
      </div>

      <div class="card" style="text-align:center;padding:20px;max-width:440px;width:100%">
        <div class="pve-boss-icon">${stage.icon}</div>
        <h2 style="margin:8px 0 4px">${stage.name}</h2>
        <div class="pve-lore">${stage.lore}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-top:10px">
          ${renderSkillBadge(stage.skill)}
          ${renderPassiveBadge(stage.avatar)}
        </div>
        ${intelHtml}
      </div>

      <div class="card" style="max-width:440px;width:100%;padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div>${avatarIcon(player.avatar)} <strong>${escapeHtml(player.name)}</strong></div>
          <div class="pve-credits">💰 ${pve.credits} cr</div>
        </div>
        ${renderSkillBadge(player.skill)}${extraSkillHtml ? ' ' + extraSkillHtml : ''}
        ${upgradeList ? `<div class="pve-upgrades" style="margin-top:8px">${upgradeList}</div>` : ''}
      </div>

      <div class="btn-row">
        <button class="btn btn-secondary" onclick="renderPveShop()">🛒 Shop</button>
        <button class="btn btn-gold btn-large" onclick="launchPveMatch()">⚔️ Fight ${stage.name}!</button>
      </div>
      <button class="btn btn-secondary" style="margin-top:4px" onclick="renderMenu()">← Main Menu</button>
    </div>
  `);
  showScreen('screen-pve-camp');
}

function renderPveShop() {
  const pve = gameState.pve;
  const player = gameState.fighters.find(f => f.id === pve.playerId);
  const dualWieldBought = pve.purchases.includes('dual_wield');

  let itemsHtml = PVE_SHOP_ITEMS.map(item => {
    const owned = item.type === 'permanent' && pve.purchases.includes(item.id);
    const canAfford = pve.credits >= item.cost;
    const isActive = item.id === 'revive' && pve.purchases.includes('revive');

    let btn;
    if (owned || isActive) {
      btn = `<span class="pve-shop-owned">✓ Owned</span>`;
    } else if (!canAfford) {
      btn = `<button class="btn btn-secondary" disabled>${item.cost} cr</button>`;
    } else if (item.id === 'dual_wield') {
      btn = `<button class="btn btn-primary" onclick="renderPveDualWieldPicker()">Buy — ${item.cost} cr</button>`;
    } else {
      btn = `<button class="btn btn-primary" onclick="handlePveBuy('${item.id}')">Buy — ${item.cost} cr</button>`;
    }

    return `<div class="pve-shop-item">
      <div class="pve-shop-item-icon">${item.icon}</div>
      <div class="pve-shop-item-info">
        <div class="pve-shop-item-name">${item.name} <span class="pve-type-tag">${item.type}</span></div>
        <div class="pve-shop-item-desc">${item.desc}</div>
      </div>
      <div class="pve-shop-item-action">${btn}</div>
    </div>`;
  }).join('');

  setHTML('screen-pve-camp', `
    <div class="pve-camp-wrap">
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%;max-width:480px">
        <h2>Shop</h2>
        <div class="pve-credits">💰 ${pve.credits} cr</div>
      </div>
      <div class="pve-shop-list">${itemsHtml}</div>
      <button class="btn btn-primary btn-large" onclick="renderPveCamp()">← Back to Camp</button>
    </div>
  `);
  showScreen('screen-pve-camp');
}

function renderPveDualWieldPicker() {
  const pve = gameState.pve;
  const player = gameState.fighters.find(f => f.id === pve.playerId);
  const availableSkills = SKILL_IDS.filter(id => id !== player.skill);

  const skillHtml = availableSkills.map(sid => {
    const s = SKILLS[sid];
    return `<div class="skill-option" onclick="handlePveDualWield('${sid}')">
      <span class="skill-icon" style="color:${s.color}">${s.icon}</span>
      <div>
        <div class="skill-name" style="color:${s.color}">${s.name}</div>
        <div class="skill-desc">${s.description}</div>
      </div>
    </div>`;
  }).join('');

  setHTML('screen-pve-camp', `
    <div class="pve-camp-wrap">
      <h2>Choose Your Second Skill</h2>
      <p class="subtitle">Costs 250 cr. Both skills will be active.</p>
      <div class="skill-grid" style="max-width:480px;width:100%">${skillHtml}</div>
      <button class="btn btn-secondary" onclick="renderPveShop()">← Cancel</button>
    </div>
  `);
  showScreen('screen-pve-camp');
}

function handlePveBuy(itemId) {
  if (pveBuyItem(itemId)) renderPveShop();
}

function handlePveDualWield(skillId) {
  if (pveBuyDualWield(skillId)) renderPveShop();
}

function launchPveMatch() {
  startPveMatch();
  clearFightDisplay();
  const stage = getPveStage();
  renderFight(`Stage ${gameState.pve.stageIdx + 1}: ${stage.name}`, 'pve');
}

function continuePveAfterMatch() {
  const pve = gameState.pve;
  const winnerId = cupTiebreak(); // reuse tiebreak logic
  const playerWon = winnerId === pve.playerId;

  savePveProgress();

  if (playerWon) {
    pve.stageIdx++;
    pve.intelActive = false;
    pve.purchases = pve.purchases.filter(id => id !== 'monster_intel' && id !== 'revive');
    savePveProgress();
  }
  renderPveMatchResult(playerWon);
}

function renderPveMatchResult(playerWon) {
  const pve = gameState.pve;
  const player = gameState.fighters.find(f => f.id === pve.playerId);
  const m = gameState.currentMatch;
  const boss = getFighter(m.fighter1Id === pve.playerId ? m.fighter2Id : m.fighter1Id);
  const f1rw = m.roundResults.filter(r => r === 'f1').length;
  const f2rw = m.roundResults.filter(r => r === 'f2').length;
  const playerRw = m.fighter1Id === pve.playerId ? f1rw : f2rw;
  const bossRw = m.fighter1Id === pve.playerId ? f2rw : f1rw;
  const stage = PVE_STAGES[playerWon ? pve.stageIdx - 1 : pve.stageIdx];

  setHTML('screen-result', `
    <div style="width:100%;max-width:440px;display:flex;flex-direction:column;gap:20px;text-align:center">
      <h2>${playerWon ? '🏆 Victory!' : '💀 Defeated'}</h2>
      <div class="match-result-banner" style="${playerWon ? '' : 'border-color:rgba(248,113,113,0.3);background:rgba(248,113,113,0.08);color:var(--red)'}">
        ${playerWon ? `You defeated ${boss.name}!` : `${boss.name} defeated you.`}
      </div>
      <div style="display:flex;justify-content:center;gap:40px">
        <div>
          <div style="font-size:1.8rem;font-weight:800">${playerRw}</div>
          <div style="font-size:0.75rem;color:var(--muted)">${avatarIcon(player.avatar)} You</div>
        </div>
        <div style="color:var(--muted);align-self:center;font-size:0.8rem">rounds</div>
        <div>
          <div style="font-size:1.8rem;font-weight:800">${bossRw}</div>
          <div style="font-size:0.75rem;color:var(--muted)">${stage.icon} ${boss.name}</div>
        </div>
      </div>
      <div class="pve-credits" style="font-size:1rem">💰 Credits: ${pve.credits}</div>
      ${playerWon
        ? `<button class="btn btn-gold btn-large" onclick="renderPveCamp()">Continue →</button>`
        : `<div class="btn-row">
            <button class="btn btn-primary" onclick="restartPveCampaign()">Try Again</button>
            <button class="btn btn-secondary" onclick="renderMenu()">Main Menu</button>
           </div>`}
    </div>
  `);
  showScreen('screen-result');
}

function restartPveCampaign() {
  clearPveProgress();
  clearSave();
  startPveSetup();
}

function isBossActingInPve() {
  const m = gameState.currentMatch;
  if (!m || !gameState.pve) return false;
  const pve = gameState.pve;
  const { phase } = m;
  if (phase === 'declare_1' || phase === 'declare_2' || phase === 'declare_reveal' || phase === 'round_end' || phase === 'match_end') return false;
  const attacker = getAttacker();
  const defender = getDefender();
  if ((phase === 'attack_coin' || phase === 'attack_roll') && attacker.id !== pve.playerId) return true;
  if ((phase === 'defend_coin' || phase === 'defend_roll') && defender.id !== pve.playerId) return true;
  return false;
}

function autoPlayBossIfNeeded() {
  if (gameState.mode !== 'pve') return;
  if (pveAutoPlayTimer) { clearTimeout(pveAutoPlayTimer); pveAutoPlayTimer = null; }
  if (!isBossActingInPve()) return;
  pveAutoPlayTimer = setTimeout(() => {
    pveAutoPlayTimer = null;
    if (gameState.mode === 'pve' && gameState.currentMatch) handleFightAction();
  }, 900);
}

// ── HOW TO PLAY ───────────────────────────────────────────────────────────────

function renderHowToPlay() {
  const skillsHtml = SKILL_IDS.map(sid => {
    const s = SKILLS[sid];
    return `<div class="log-line" style="padding:5px 0;color:var(--text)">
      <span style="color:${s.color}">${s.icon} <strong>${s.name}</strong></span> — ${s.description}
    </div>`;
  }).join('');

  const passivesHtml = Object.entries(AVATAR_PASSIVES).map(([id, p]) => {
    const av = AVATARS.find(a => a.id === id);
    return `<div class="log-line" style="padding:5px 0;color:var(--text)">
      <span style="color:${p.color}">${av ? av.icon : ''} <strong>${av ? av.label : id}</strong>
        <span class="skill-badge passive-badge" style="color:${p.color};border-color:${p.color};margin:0 4px">${p.icon} ${p.name}</span>
      </span> — ${p.description}
    </div>`;
  }).join('');

  const ultimatesHtml = Object.entries(ULTIMATES).map(([id, u]) => {
    const av = AVATARS.find(a => a.id === id);
    return `<div class="log-line" style="padding:5px 0;color:var(--text)">
      <span style="color:${u.color}">${av ? av.icon : ''} <strong>${av ? av.label : id}</strong>
        <span class="skill-badge" style="color:${u.color};border-color:${u.color};margin:0 4px">${u.icon} ${u.name}</span>
      </span> — ${u.desc} <em style="color:var(--muted)">(${u.timing})</em>
    </div>`;
  }).join('');

  const stancesHtml = STANCE_IDS.map(sid => {
    const s = STANCES[sid];
    return `<div class="log-line" style="padding:5px 0;color:var(--text)">
      <span style="color:${s.color}">${s.icon} <strong>${s.name}</strong></span> — ${s.desc}
    </div>`;
  }).join('');

  setHTML('screen-howtoplay', `
    <div class="howto-content">
      <h2 style="text-align:center">How to Play</h2>

      <div class="card howto-section">
        <h3>Round Start — Declare Stance</h3>
        <p style="color:var(--muted);font-size:0.85rem;margin-bottom:8px">Each round, both fighters secretly pick a stance (hot-seat style) before combat begins.</p>
        <div>${stancesHtml}</div>
      </div>

      <div class="card howto-section">
        <h3>Turn Order</h3>
        <ol>
          <li><strong>Attack Coin</strong> — Attacker flips. HEADS = proceed. TAILS = turn ends (charges ult).</li>
          <li><strong>Attack Dice</strong> — Attacker rolls 2d6 and takes the sum. Sum ≥ 11 triggers an explosive bonus d6!</li>
          <li><strong>Defense Coin</strong> — Defender flips. HEADS = proceed to defense roll. TAILS = full damage.</li>
          <li><strong>Defense Dice</strong> — Defender rolls 1d6. Roll ≥ attack sum = blocked. Roll &lt; attack sum = damage.</li>
        </ol>
      </div>

      <div class="card howto-section">
        <h3>Damage Formula</h3>
        <ul>
          <li>Defense TAILS → <strong>attack sum × 6</strong></li>
          <li>Defense HEADS, blocked → <strong>0 damage</strong></li>
          <li>Defense HEADS, not blocked → <strong>(attack sum − defense) × 6</strong></li>
          <li>2d6 sum ≥ 11 → <strong>explosive bonus d6 added to attack value!</strong></li>
          <li>Matching dice (doubles) → primes the <strong>Double Strike</strong> skill for ×2 damage!</li>
        </ul>
      </div>

      <div class="card howto-section">
        <h3>Ultimates — Rechargeable</h3>
        <p style="color:var(--muted);font-size:0.85rem;margin-bottom:8px">Use your ultimate at the start of your attack turn. Landing TAILS twice on your attack coin recharges it — bad luck builds toward your next power play.</p>
        <div>${ultimatesHtml}</div>
      </div>

      <div class="card howto-section">
        <h3>Avatar Passives</h3>
        <div>${passivesHtml}</div>
      </div>

      <div class="card howto-section">
        <h3>Skills</h3>
        <div class="skills-list">${skillsHtml}</div>
      </div>

      <div class="card howto-section">
        <h3>Match Rules</h3>
        <ul>
          <li>Fighters start at <strong>200 LP</strong> per round (Warrior: 250 LP, scales +10 per round won).</li>
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

// ── SKILL POPUP ───────────────────────────────────────────────────────────────

function showSkillPopup(type, id) {
  const m = gameState.currentMatch;
  let icon, name, color, typeLabel, desc, statusHtml = '';

  if (type === 'skill') {
    const s = SKILLS[id];
    if (!s) return;
    icon = s.icon; name = s.name; color = s.color;
    typeLabel = 'Skill';
    desc = s.description;
    if (m) {
      const fighter = gameState.fighters.find(f => fighterHasSkill(f, id));
      if (fighter) {
        const lines = [];
        if (id === 'gamblers_edge') lines.push(m.gamblerUsed[fighter.id] ? '✓ Reroll used this round' : '● Reroll available');
        if (id === 'mystic_heal')   lines.push(m.mysticUsed[fighter.id]  ? '✓ Heal used this round'   : '● Heal available');
        if (lines.length) statusHtml = `<div class="popup-status">${lines.join(' · ')}</div>`;
      }
    }
  } else if (type === 'passive') {
    const p = AVATAR_PASSIVES[id];
    const av = AVATARS.find(a => a.id === id);
    if (!p) return;
    icon = p.icon; name = p.name; color = p.color;
    typeLabel = `${av ? av.label : id} Passive`;
    desc = p.description;
  } else if (type === 'ult') {
    const u = ULTIMATES[id];
    const av = AVATARS.find(a => a.id === id);
    if (!u) return;
    icon = u.icon; name = u.name; color = u.color;
    typeLabel = `${av ? av.label : id} Ultimate · ${u.timing}`;
    desc = u.desc;
    if (m) {
      const fighter = gameState.fighters.find(f => f.avatar === id);
      if (fighter) {
        const ready   = m.ultReady && m.ultReady[fighter.id];
        const charges = (m.ultCharges && m.ultCharges[fighter.id]) || 0;
        statusHtml = `<div class="popup-status">${ready ? '⚡ Ready to use' : `Charging: ${'●'.repeat(charges)}${'○'.repeat(ULT_TAILS_TO_RECHARGE - charges)} (${ULT_TAILS_TO_RECHARGE} TAILS needed)`}</div>`;
      }
    }
  } else if (type === 'stance') {
    const s = STANCES[id];
    if (!s) return;
    icon = s.icon; name = s.name; color = s.color;
    typeLabel = 'Stance';
    desc = s.desc;
  }

  const el = document.getElementById('skill-popup');
  el.innerHTML = `
    <div class="popup-backdrop" onclick="closeSkillPopup()">
      <div class="popup-card" onclick="event.stopPropagation()" style="border-color:${color}44">
        <div class="popup-icon">${icon}</div>
        <div class="popup-name" style="color:${color}">${name}</div>
        <div class="popup-type-tag">${typeLabel}</div>
        <div class="popup-desc">${desc}</div>
        ${statusHtml}
        <button class="btn btn-secondary" style="margin-top:4px;width:100%" onclick="closeSkillPopup()">Close</button>
      </div>
    </div>`;
  el.classList.add('visible');
}

function closeSkillPopup() {
  const el = document.getElementById('skill-popup');
  if (el) { el.classList.remove('visible'); el.innerHTML = ''; }
}

function showInfoPanel() {
  const skillsHtml = SKILL_IDS.map(sid => {
    const s = SKILLS[sid];
    return `<div class="info-row" onclick="closeSkillPopup();showSkillPopup('skill','${sid}')">
      <div class="info-row-name" style="color:${s.color}">${s.icon} ${s.name}</div>
      <div class="info-row-desc">${s.description}</div>
    </div>`;
  }).join('');

  const stancesHtml = STANCE_IDS.map(sid => {
    const s = STANCES[sid];
    return `<div class="info-row" onclick="closeSkillPopup();showSkillPopup('stance','${sid}')">
      <div class="info-row-name" style="color:${s.color}">${s.icon} ${s.name}</div>
      <div class="info-row-desc">${s.desc}</div>
    </div>`;
  }).join('');

  const passivestHtml = Object.entries(AVATAR_PASSIVES).map(([avId, p]) => {
    const av = AVATARS.find(a => a.id === avId);
    return `<div class="info-row" onclick="closeSkillPopup();showSkillPopup('passive','${avId}')">
      <div class="info-row-name" style="color:${p.color}">${av ? av.icon : ''} ${av ? av.label : avId} — ${p.icon} ${p.name}</div>
      <div class="info-row-desc">${p.description}</div>
    </div>`;
  }).join('');

  const el = document.getElementById('skill-popup');
  el.innerHTML = `
    <div class="popup-backdrop" onclick="closeSkillPopup()">
      <div class="popup-card popup-reference" onclick="event.stopPropagation()">
        <h3 style="margin-bottom:4px;text-align:center">Skills Guide</h3>
        <div class="info-section">
          <div class="info-section-title">⚔️ Skills (choose one at setup)</div>
          ${skillsHtml}
        </div>
        <div class="info-section">
          <div class="info-section-title">⚖️ Stances (declared each round)</div>
          ${stancesHtml}
        </div>
        <div class="info-section">
          <div class="info-section-title">✨ Avatar Passives (always active)</div>
          ${passivestHtml}
        </div>
        <button class="btn btn-secondary" style="margin-top:4px;width:100%" onclick="closeSkillPopup()">Close</button>
      </div>
    </div>`;
  el.classList.add('visible');
}

// ── INIT ──────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => { renderMenu(); });
