// SECTION 1 -- UMD DESTRUCTURING
const {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo
} = React;
const {
  AlertCircle,
  ChevronRight,
  Loader,
  BookOpen,
  Shield,
  Zap,
  User,
  Menu,
  X,
  Check,
  RefreshCw,
  Globe,
  Briefcase,
  Star,
  Eye,
  Info,
  Trash2,
  PanelLeft,
  Dice3
} = LucideReact;

// SECTION 2 -- CONSTANTS

// index.html puts `overflow: hidden` on <html> and scrolls <body> instead, so
// window.scrollTo is a no-op and every setup screen opened wherever the last
// one was left — most visible on a phone, where the lists are tall. Scroll the
// element that actually scrolls; the window call stays for any layout where it
// is the document that moves.
function scrollToTop() {
  try {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    window.scrollTo(0, 0);
  } catch (_) {}
}

const INITIAL_STATE = {
  character: null,
  campaign: null,
  session: {
    number: 1,
    scene_count: 0,
    turn_count: 0
  },
  scene: {
    header: '',
    summary: '',
    in_combat: false,
    combat_state: null,
    recent_summaries: [],
    history_compressed: false,
    compressed_summary: null,
    scene_type_history: []
  },
  meta: {
    initialized: false,
    loading: false,
    error: null,
    last_saved: null,
    snapshots: [],
    dev_mode: false
  },
  messages: []
};

// SECTION 27a -- SAVE DATA VALIDATOR
function validateSaveData(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    errors.push('Invalid save data format');
    return {
      valid: false,
      errors
    };
  }
  if (!data.character || typeof data.character !== 'object') errors.push('Missing required field: character');else if (!data.character.name || typeof data.character.name !== 'string') errors.push('Character data is incomplete');
  if (!data.campaign || typeof data.campaign !== 'object') errors.push('Missing required field: campaign');else if (!data.campaign.adventure_id) errors.push('Campaign data is incomplete');
  if (!data.session || typeof data.session !== 'object') errors.push('Missing required field: session');
  if (!data.scene || typeof data.scene !== 'object') errors.push('Missing required field: scene');
  if (!data.meta || typeof data.meta !== 'object') errors.push('Missing required field: meta');else if (data.meta.initialized !== true) errors.push('Save data not fully initialized (meta.initialized is false)');
  return {
    valid: errors.length === 0,
    errors
  };
}

// SECTION 27b -- PARSE AND LOAD SAVE
function parseAndLoadSave(jsonString, setGameState, setPhase) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return {
      success: false,
      errors: ['Invalid JSON: ' + e.message]
    };
  }
  const validation = validateSaveData(parsed);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors
    };
  }
  // dev_mode is forced off on import, so a pasted or shared save cannot
  // re-enable it. Checkpoints are server-held now (POST/GET /api/game/snapshot);
  // a v1 save's own meta.snapshots held full client-side checkpoint blobs
  // with ids the server's /api/game/restore has never heard of, so any
  // snapshot list embedded in the loaded save is stripped here rather than
  // shown and then failing to restore. The mount effect that calls
  // loadSnapshotsFromServer replaces this with the real, server-held list.
  const safeState = {
    ...parsed,
    meta: {
      ...parsed.meta,
      dev_mode: false,
      snapshots: []
    }
  };
  setGameState(safeState);
  setPhase('GAME');
  return {
    success: true,
    errors: []
  };
}

// SECTION 27b1 -- SAVE CODES + FREE-TIER QUOTA (client helpers)

const QUOTA_EVENT = 'astra:quota';

// Codes are stored without the dash; the dash is display-only.
function formatSaveCodeDisplay(code) {
  const clean = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.length === 10 ? clean.slice(0, 5) + '-' + clean.slice(5) : clean;
}

// Quota resets are sent as epoch timestamps so they can be rendered in the
// player's own timezone rather than the provider's.
function formatResetTime(ts) {
  if (!ts) return 'tomorrow';
  const d = new Date(ts);
  const time = d.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  });
  return d.toDateString() === new Date().toDateString() ? time : time + ' tomorrow';
}

// Quota updates arrive from several places (page load, the chat stream, a 429).
// They are broadcast as a window event so only the banner has to listen.
function publishQuota(quota) {
  if (!quota) return;
  window.dispatchEvent(new CustomEvent(QUOTA_EVENT, {
    detail: quota
  }));
}

// State is server-owned as of protocol v2: the server commits it after every
// turn (POST /api/turn) and every setup step, so the browser never pushes
// its own copy back. pushStateToServer/saveStateToServer and the pagehide
// flush that used to debounce a PUT are gone; localStorage still gets a
// mirror (SECTION 13, the auto-save effect in useDMTurn) as a display-only
// fallback for an offline reload.

// SECTION 27b1b -- QUOTA BANNER
// Silent while there is plenty of budget; warns as the day's free turns run
// low; blocks with a wait-until time when they are gone.
function QuotaBanner({
  quota,
  saveCode
}) {
  const LOW_TURNS = 15;
  // Dismissal is remembered per turn-count, so the warning comes back as the
  // budget keeps dropping instead of staying hidden for the rest of the day.
  const [dismissedAt, setDismissedAt] = React.useState(null);
  const turns = quota && quota.active ? quota.active.turnsRemaining : 0;
  if (!quota || !quota.configured) return null;
  if (!quota.exhausted && (turns === null || turns > LOW_TURNS)) return null;
  if (!quota.exhausted && dismissedAt !== null && turns >= dismissedAt) return null;
  const exhausted = quota.exhausted;
  const codeHint = saveCode ? ` Your game is saved — come back with code ${formatSaveCodeDisplay(saveCode)}.` : ' Your game is saved.';
  const message = exhausted ? `Today's free AI turns are used up. You can play again at ${formatResetTime(quota.resetAt)}.` + codeHint : `About ${turns} free AI ${turns === 1 ? 'turn' : 'turns'} left today. They reset at ${formatResetTime(quota.resetAt)}.`;
  // Fixed rather than sticky: the game screen is a full-height pane with its
  // own scroller, so an in-flow banner scrolls out of reach mid-session.
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 0.75rem',
      fontSize: '0.75rem',
      lineHeight: 1.3,
      color: exhausted ? '#fecaca' : '#fde68a',
      background: exhausted ? '#450a0a' : '#3d2308',
      borderBottom: '1px solid ' + (exhausted ? '#7f1d1d' : '#78350f')
    }
  }, /*#__PURE__*/React.createElement(AlertCircle, {
    size: 14,
    style: {
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, message), !exhausted && /*#__PURE__*/React.createElement("button", {
    onClick: () => setDismissedAt(turns),
    "aria-label": "Dismiss",
    style: {
      background: 'none',
      border: 'none',
      color: 'inherit',
      cursor: 'pointer',
      opacity: 0.7,
      padding: '0 0.25rem',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  })));
}

// SECTION 27b2 -- LANDING SCREEN
function LandingScreen({
  onNewGame,
  onResume,
  saveCode,
  onResumeCode,
  serverHasSave
}) {
  const hasSave = serverHasSave || !!localStorage.getItem('sf_game_save');
  const [codeOpen, setCodeOpen] = React.useState(false);
  const [codeInput, setCodeInput] = React.useState('');
  const [codeError, setCodeError] = React.useState(null);
  const [codeBusy, setCodeBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  async function submitCode() {
    setCodeBusy(true);
    setCodeError(null);
    const result = await onResumeCode(codeInput);
    setCodeBusy(false);
    if (!result.success) setCodeError(result.error);
  }
  function copyCode() {
    const text = formatSaveCodeDisplay(saveCode);
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {});
    }
  }
  const canvasRef = React.useRef(null);
  // phases: 'black' -> 'stars' -> 'title' -> 'subhead' -> 'buttons'
  const [phase, setPhase] = React.useState('black');
  const [pulsingBtn, setPulsingBtn] = React.useState(null);
  function handleBtnClick(id, fn) {
    setPulsingBtn(id);
    setTimeout(function () {
      setPulsingBtn(null);
      fn();
    }, 450);
  }

  // Static star field, pinned to the browser window (the app shell is capped
  // at 1280px wide) and redrawn whenever the window is resized.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    var draw = function () {
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      var dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      var starCount = Math.floor(w * h / 1200);
      for (var i = 0; i < starCount; i++) {
        var x = Math.random() * w;
        var y = Math.random() * h;
        var r = Math.random() * 1.4 + 0.2;
        var a = Math.random() * 0.7 + 0.3;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
        ctx.fill();
      }
    };
    draw();
    var timer = null;
    var onResize = function () {
      clearTimeout(timer);
      timer = setTimeout(draw, 150);
    };
    window.addEventListener('resize', onResize);
    return function () {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Phase sequencer
  React.useEffect(() => {
    var t1 = setTimeout(function () {
      setPhase('stars');
    }, 150);
    var t2 = setTimeout(function () {
      setPhase('title');
    }, 1400);
    var t3 = setTimeout(function () {
      setPhase('subhead');
    }, 2900);
    var t4 = setTimeout(function () {
      setPhase('buttons');
    }, 4400);
    return function () {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);
  var starsOpacity = phase === 'black' ? 0 : 1;
  var titleOpacity = phase === 'title' || phase === 'subhead' || phase === 'buttons' ? 1 : 0;
  var subheadOpacity = phase === 'subhead' || phase === 'buttons' ? 1 : 0;
  var buttonsOpacity = phase === 'buttons' ? 1 : 0;
  var ease = 'opacity 1.1s ease-in-out';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      minHeight: '100vh',
      background: '#000',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: canvasRef,
    style: {
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 1,
      opacity: starsOpacity,
      transition: ease
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2.5rem',
      padding: '2rem'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[61px] sm:text-[clamp(49px,9.1vw,68px)]",
    style: {
      fontFamily: "'Audiowide', sans-serif",
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      lineHeight: 1.125,
      color: '#facc15',
      textAlign: 'center',
      opacity: titleOpacity,
      transition: ease
    }
  }, /*#__PURE__*/React.createElement("span", null, "Astra"), /*#__PURE__*/React.createElement("br", {
    className: "block sm:hidden"
  }), /*#__PURE__*/React.createElement("span", {
    className: "sm:ml-[0.25em]"
  }, " Rising")), /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#9ca3af',
      fontSize: '0.875rem',
      fontWeight: 'bold',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      opacity: subheadOpacity,
      transition: ease,
      background: '#000',
      padding: '2px 10px'
    }
  }, "Sci Fi RPG + AI Gamemaster")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      width: '100%',
      maxWidth: '240px',
      opacity: buttonsOpacity,
      transition: ease
    }
  }, hasSave && /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      handleBtnClick('resume', onResume);
    },
    className: "w-full py-[7px] bg-gray-800 text-yellow-400 text-base rounded-lg cursor-pointer border border-gray-700 hover:bg-[#3d2308] hover:border-yellow-500 transition-colors" + (pulsingBtn === 'resume' ? ' sf-card-select' : '')
  }, "Continue Game"), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      handleBtnClick('new', onNewGame);
    },
    className: "w-full py-[7px] bg-gray-800 text-yellow-400 text-base rounded-lg cursor-pointer border border-gray-700 hover:bg-[#3d2308] hover:border-yellow-500 transition-colors" + (pulsingBtn === 'new' ? ' sf-card-select' : '')
  }, "New Game"), /*#__PURE__*/React.createElement("button", {
    onClick: function () {
      setCodeOpen(!codeOpen);
      setCodeError(null);
    },
    className: "w-full py-[5px] bg-transparent text-gray-400 text-xs rounded-lg cursor-pointer border border-gray-800 hover:text-yellow-400 hover:border-gray-600 transition-colors"
  }, codeOpen ? "Cancel" : "Enter a save code"), codeOpen && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: codeInput,
    autoFocus: true,
    spellCheck: false,
    onChange: e => {
      setCodeInput(e.target.value.toUpperCase());
      setCodeError(null);
    },
    onKeyDown: e => {
      if (e.key === 'Enter' && !codeBusy) submitCode();
    },
    placeholder: "ABCDE-FGHJK",
    className: "w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-yellow-400 text-sm font-mono tracking-widest text-center focus:outline-none focus:border-yellow-500"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: submitCode,
    disabled: codeBusy || !codeInput.trim(),
    className: "w-full py-[7px] bg-yellow-400 text-gray-900 font-bold text-sm rounded-lg cursor-pointer disabled:opacity-40 hover:bg-yellow-300 transition-colors"
  }, codeBusy ? "Loading..." : "Continue"), codeError && /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-red-400 text-center"
  }, codeError)), saveCode && hasSave && !codeOpen && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-1 pt-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-widest text-gray-600"
  }, "Your save code"), /*#__PURE__*/React.createElement("button", {
    onClick: copyCode,
    title: "Copy to clipboard",
    className: "text-sm font-mono tracking-widest text-gray-400 hover:text-yellow-400 cursor-pointer"
  }, copied ? "Copied" : formatSaveCodeDisplay(saveCode))))));
}

// SECTION 3f -- SETUP SCREEN (hoisted to module scope)

const CHAR_NAME_POOLS = [
// Human — Kael Voss (interleaved short/medium/long)
['PETRA CALDOVER', 'LEV NOX', 'SERA FARENTHORN', 'CASSIAN FENN', 'MELORAVANE BRISK', 'TAE MORROW', 'ALDRIC SOLANE', 'JUNO VALE', 'NOX CARAMINE', 'ASA MERRIX', 'RENNICK VOSS', 'QUINN ARDELL', 'SABLE KRAIT', 'MIRA SOLEN', 'DECLAN HASK'],
// Krix, Skrix
['KRIX-SOLON', 'SKRIX', 'VRIX-SOLEVANE', 'THREZEK', 'IKRIX-VOLAN', 'THREX', 'KAZ\'RETHUL', 'VRIX-UK', 'SKRIX-THEVELAN', 'KAZ\'REK', 'VRAXOMAR', 'VRAXIN', 'ZSREK-VOLAN', 'VRAK-NAR', 'THREK-SOVAR'],
// Moluun, Bolg
['GROLMAVEN', 'BOLG', 'MORVALANETH', 'OLVMAR', 'GROLMAVENETHOL', 'OOLM', 'MORBECTAR', 'GROLLEN', 'OLVMARETH', 'GREB', 'ORVALAN', 'MORB', 'MORVEC', 'FROLG', 'GLEB'],
// Skrath, Rayla
['ZARIEL', 'RAEL', 'NYRIKOSAR-VELEN', 'ZERYN', 'SYRAKEVANE', 'KRYSS', 'ZARELION', 'SORAN', 'SORANEL-VAR', 'NYRIX', 'NYRAKOS', 'TYSEN', 'SYRENAX', 'RAYLA', 'RYKELTHANE'],
// Grak, Grukk
['VOBBARAK', 'GRUKK', 'GRUKKLAMORVELEN', 'BORRAK', 'THRAKOVELBURN', 'THRAK', 'KREELATHUN', 'FUMM', 'BORRAKVELEN', 'JURN', 'GRUKKLAR', 'VOBB', 'JURNBOVAK', 'KREEL', 'THRAKON'],
// Chiivari, Pip
['NIFFKINDAL', 'PIP', 'FITZMORAKENDALE', 'TOBRIN', 'PIP TOBRINWICK', 'FITZ', 'QUIBBENORE', 'WREN', 'FITZ WRENLEVEN', 'ZEBB', 'FITZMORE', 'QUIB', 'NIFFKIN', 'WRENLEY', 'QUIBBEN'],
// Ossivaan, Vael
['KESSORINATH', 'VAEL', 'VAELENDORISATH', 'TYBBAR', 'NUURAVELOS', 'KESS', 'VAELENDOR', 'SORV', 'TYBBAROVEN', 'NUUR', 'KESSORIN', 'TYBB', 'NUURAVEL', 'SORVEX', 'VAELEN']];
function SetupScreen({
  selectedCharId,
  onCharSelect,
  selectedAdventureId,
  onAdventureSelect,
  onBeginAdventure,
  onCharDisplayName,
  initialStep
}) {
  const [step, setStep] = useState(initialStep || 'CAMPAIGN'); // 'CAMPAIGN' | 'CHARACTER' | 'NAME'
  const [pulsingId, setPulsingId] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const touchMovedRef = useRef(false);
  useEffect(() => {
    scrollToTop();
  }, [step]);
  const selectedAdventure = ADVENTURE_LIBRARY.find(a => a.id === selectedAdventureId);
  const canBegin = selectedCharId && selectedAdventureId;
  const handleStoryClick = id => {
    if (touchMovedRef.current) return;
    onAdventureSelect(id);
    setPulsingId(id);
    setTimeout(() => {
      setPulsingId(null);
      window.history.pushState({
        screen: 'CHARACTER'
      }, '');
      setStep('CHARACTER');
      scrollToTop();
    }, 520);
  };
  const handleCharClick = id => {
    if (touchMovedRef.current) return;
    onCharSelect(id);
    const idx = CHARACTER_ROSTER.findIndex(c => c.id === id);
    const pool = CHAR_NAME_POOLS[idx] || [];
    setNameInput(pool[Math.floor(Math.random() * pool.length)] || '');
    setPulsingId(id);
    setTimeout(() => {
      setPulsingId(null);
      window.history.pushState({
        screen: 'NAME'
      }, '');
      setStep('NAME');
      scrollToTop();
    }, 520);
  };
  const handleRandom = () => {
    const pick = ADVENTURE_LIBRARY[Math.floor(Math.random() * ADVENTURE_LIBRARY.length)];
    onAdventureSelect(pick.id);
    setStep('CHARACTER');
  };
  const diffColor = d => ({
    'Beginner': 'text-green-400 border-green-700',
    'Beginner-Friendly': 'text-green-400 border-green-700',
    'Intermediate': 'text-yellow-400 border-yellow-700',
    'Advanced': 'text-red-400 border-red-700'
  })[d] || 'text-gray-400 border-gray-700';
  if (step === 'CAMPAIGN') {
    const CAMPAIGN_GROUPS = [{
      label: 'Dravoss Chronicles',
      ids: ['dravoss_lost', 'return_to_dravoss']
    }, {
      label: 'Heist & Hustle',
      ids: ['the_golden_mandible', 'the_triad_job', 'tholvarn_run', 'mission_to_kelvaax']
    }, {
      label: 'Ancient Mysteries',
      ids: ['sundown_on_suvaan']
    }, {
      label: 'Deep Space Horror',
      ids: ['ghost_station', 'the_long_sleep', 'silence_at_thaak_station']
    }, {
      label: 'Conspiracy & Paranoia',
      ids: ['dark_side_of_the_moon', 'need_to_know', 'the_replacement', 'the_erebus_protocol']
    }, {
      label: 'One of a Kind',
      ids: ['major_major_minor']
    }];
    const advById = Object.fromEntries(ADVENTURE_LIBRARY.map(a => [a.id, a]));
    return /*#__PURE__*/React.createElement("div", {
      className: "sf-setup min-h-screen bg-gray-900 flex flex-col px-6 py-6",
      style: {
        zoom: 0.75
      },
      onTouchStart: () => {
        touchMovedRef.current = false;
      },
      onTouchMove: () => {
        touchMovedRef.current = true;
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-center mb-6"
    }, /*#__PURE__*/React.createElement("h1", {
      className: "text-4xl font-extrabold text-yellow-400 tracking-wide mb-2"
    }, "Choose Campaign")), /*#__PURE__*/React.createElement("div", {
      className: "max-w-4xl mx-auto w-full mb-6 flex flex-col gap-6"
    }, CAMPAIGN_GROUPS.map(group => /*#__PURE__*/React.createElement("div", {
      key: group.label
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-500 uppercase tracking-widest mb-2"
    }, group.label), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col gap-2"
    }, group.ids.map(id => {
      const adv = advById[id];
      if (!adv) return null;
      return /*#__PURE__*/React.createElement("button", {
        key: adv.id,
        onClick: () => handleStoryClick(adv.id),
        className: `sf-card-btn group text-left rounded-xl px-4 py-3 cursor-pointer w-full border border-gray-700 bg-gray-800 hover:bg-yellow-900/20 hover:border-yellow-500 transition-colors ${pulsingId === adv.id ? 'sf-card-select' : ''}`
      }, /*#__PURE__*/React.createElement("p", {
        className: "sf-card-title font-bold text-lg uppercase tracking-wide leading-snug text-gray-100 group-hover:text-yellow-300 transition-colors"
      }, adv.title), /*#__PURE__*/React.createElement("p", {
        className: "text-gray-400 text-sm leading-relaxed mt-0.5"
      }, adv.tagline), /*#__PURE__*/React.createElement("p", {
        className: `text-sm italic mt-1 ${diffColor(adv.difficulty)}`
      }, adv.genre));
    }))))));
  }

  // Step NAME
  if (step === 'NAME') {
    const selectedChar = CHARACTER_ROSTER.find(c => c.id === selectedCharId);
    const idx = CHARACTER_ROSTER.findIndex(c => c.id === selectedCharId);
    const pool = CHAR_NAME_POOLS[idx] || [];
    const handleRandomize = () => {
      const others = pool.filter(n => n !== nameInput);
      const pick = (others.length ? others : pool)[Math.floor(Math.random() * (others.length || pool.length))] || '';
      setNameInput(pick);
    };
    const handleBegin = () => {
      const chosenName = nameInput.trim() || selectedChar?.race || 'Unknown';
      if (onCharDisplayName) onCharDisplayName(chosenName);
      onBeginAdventure(selectedCharId, chosenName);
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "sf-setup min-h-screen bg-gray-900 flex flex-col px-6 py-6",
      style: {
        zoom: 0.75
      },
      onTouchStart: () => {
        touchMovedRef.current = false;
      },
      onTouchMove: () => {
        touchMovedRef.current = true;
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-center mb-6"
    }, /*#__PURE__*/React.createElement("h1", {
      className: "text-4xl font-extrabold text-yellow-400 tracking-wide"
    }, "Name Character")), selectedChar && /*#__PURE__*/React.createElement("div", {
      className: "max-w-lg mx-auto w-full mb-6"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-full overflow-hidden rounded-xl bg-gray-800 mb-4"
    }, /*#__PURE__*/React.createElement("img", {
      src: `data/images/${selectedChar.race.toLowerCase()}.webp`,
      alt: selectedChar.race,
      className: "w-full h-auto block",
      onLoad: () => scrollToTop(),
      onError: e => {
        e.target.style.display = 'none';
      }
    })), /*#__PURE__*/React.createElement("p", {
      className: "text-xl font-extrabold uppercase tracking-widest text-gray-100 mb-1"
    }, selectedChar.race), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-400 leading-relaxed mb-6"
    }, selectedChar.ui_meta.description), /*#__PURE__*/React.createElement("div", {
      className: "relative mb-4"
    }, /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: nameInput,
      onChange: e => setNameInput(e.target.value.toUpperCase()),
      onKeyDown: e => {
        if (e.key === 'Enter' && nameInput.trim()) handleBegin();
      },
      maxLength: 40,
      placeholder: "ENTER NAME...",
      className: "w-full bg-gray-800 border border-gray-600 focus:border-yellow-500 focus:outline-none text-gray-100 rounded-lg px-4 py-3 pr-14 text-sm font-mono tracking-widest uppercase placeholder-gray-600",
      autoFocus: true
    }), /*#__PURE__*/React.createElement("button", {
      onClick: handleRandomize,
      title: "Randomize name",
      className: "absolute right-2 top-1/2 -translate-y-1/2 text-yellow-400 hover:text-yellow-200 transition-colors cursor-pointer p-1"
    }, /*#__PURE__*/React.createElement(Dice3, {
      size: 28
    }))), /*#__PURE__*/React.createElement("button", {
      onClick: handleBegin,
      disabled: !nameInput.trim(),
      className: "w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 font-extrabold text-base rounded-xl py-4 tracking-wide uppercase transition-colors cursor-pointer"
    }, "Begin Adventure")), /*#__PURE__*/React.createElement("div", {
      className: "max-w-lg mx-auto w-full text-center"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setStep('CHARACTER'),
      className: "text-xs text-gray-500 hover:text-gray-300 underline"
    }, "Back to Choose Character")));
  }

  // Step CHARACTER
  return /*#__PURE__*/React.createElement("div", {
    className: "sf-setup min-h-screen bg-gray-900 flex flex-col px-6 py-6",
    style: {
      zoom: 0.75
    },
    onTouchStart: () => {
      touchMovedRef.current = false;
    },
    onTouchMove: () => {
      touchMovedRef.current = true;
    }
  }, selectedAdventure && /*#__PURE__*/React.createElement("div", {
    className: "max-w-4xl mx-auto w-full mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-800 border border-yellow-700 rounded-xl p-4"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-extrabold text-yellow-400 mb-1"
  }, selectedAdventure.title), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-300 text-sm"
  }, selectedAdventure.tagline))), /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-4xl font-extrabold text-yellow-400 tracking-wide mb-2"
  }, "Choose Character")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-3 max-w-4xl mx-auto w-full mb-6"
  }, (() => {
    const RACE_TIPS = {
      'Human': 'Adaptable frontier colonists. No special abilities, but unmatched versatility across all skill trees.',
      'Krix': 'Insectoid beings with 10 limbs. Natural traders and engineers; excel at technical skills and multi-tasking.',
      'Moluun': 'Amoeba-like shapeshifters with no rigid skeleton. Can detect lies passively and reshape their body slowly.',
      'Skrath': 'Winged ape-like beings capable of gliding. Can enter battle rage for combat bonuses, but suffer a -10% penalty when calm.',
      'Grak': 'Kangaroo-like beings from the Rim with explosive physical power. Spring Charge leaps 20m in combat; natural poison resistance and a prehensile tail make them fearsome in close quarters.',
      'Chiivari': 'Small, sharp-minded traders with a gift for appraisal and negotiation. Inner eyelids block eye irritants; innate linguistic aptitude lets them read a room and close a deal in seconds.',
      'Ossivaan': 'Six-legged fungal beings with an extraordinary sense of smell. Natural trackers and polyglots, they speak four languages before most species learn two.'
    };
    const ARCH_TIPS = {
      'Soldier/Enforcer': 'Combat specialist. Proficient with heavy weapons, armor, and tactical maneuvers in firefights.',
      'Techex': 'Technical expert. Can operate, repair, and sabotage almost any machine, computer, or vehicle.',
      'Scispec/Medic': 'Science specialist with field medical training. Heals allies, analyzes alien life, and manages bio-hazards.',
      'Scout/Explorer': 'Recon operative. Expert tracker, navigator, and survivalist. First in, and usually first out.',
      'Enforcer': 'Close-quarters bruiser who controls engagements through intimidation and overwhelming force. Melee and Martial Arts are primary tools; negotiation is a last resort.',
      'Explorer': 'Field survivalist and first-contact specialist. Environmental and Medical skills keep the team alive; social instincts open doors that weapons cannot.',
      'Spacer/Techex': 'Dual-trained ship handler and technical expert. Equally at home patching a hull breach or bypassing a security system under fire.'
    };
    const SKILL_TIPS = {
      'Beam Weapons': 'Proficiency with laser and energy-based ranged weapons.',
      'Melee Weapons': 'Close-quarters combat with blades, clubs, and vibro-weapons.',
      'Demolitions': 'Setting, disarming, and safely handling explosive devices.',
      'Thrown Weapons': 'Accurate use of grenades and other thrown projectiles.',
      'Jyro Weapons': 'Proficiency with gyrojet pistols and rockets.',
      'Technician': 'Repair, modify, and sabotage mechanical and electronic systems.',
      'Computers': 'Operate, program, and hack computer systems.',
      'Medical': 'Field surgery, disease treatment, and emergency stabilization.',
      'Environmental': 'Analysis and survival in hazardous or alien environments.',
      'Psycho-Social': 'Persuasion, deception, and reading social situations.',
      'Survival': 'Finding food, water, and shelter in the wilderness.',
      'Tracking': 'Following trails and identifying signs left by creatures or people.',
      'Improvisation': 'Adapting on the fly when standard approaches fail. Jury-rigged solutions, unexpected social plays, environmental advantages.',
      'Bureaucracy': 'Navigating contracts, institutional hierarchies, and legal fine print. Exploiting bureaucratic loopholes others cannot see.',
      'Xenobiology': 'Identifying organisms, toxins, and biological threats by scent and observation, often before any other warning is possible.',
      'Hunter': 'Reading tactical situations by instinct. Sensing ambushes, hidden danger, and shifts in threat level ahead of anyone else.',
      'Intimidation': 'Using physical presence and reputation to make NPCs defer, back down, or reveal information they would withhold from others.',
      'Negotiation': 'Reading the value of anything instantly. Getting better terms, willing trades, and deals NPCs would not offer other characters.',
      'Xenolinguistics': 'Fluency in any language: spoken, written, encoded, or alien. Where others hit walls, this character finds words.'
    };
    return CHARACTER_ROSTER.map((char, i) => {
      const selected = selectedCharId === char.id;
      const topSkills = char.skills.slice(0, 3);
      const sigSkill = char.skills[char.skills.length - 1];
      return /*#__PURE__*/React.createElement("div", {
        key: char.id,
        className: "relative"
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => handleCharClick(char.id),
        className: `sf-card-btn sf-char-row-btn group flex items-stretch text-left rounded-xl border border-gray-700 cursor-pointer transition-colors w-full bg-gray-800 hover:bg-yellow-900/20 hover:border-yellow-500 ${pulsingId === char.id ? 'sf-card-select' : ''}`
      }, /*#__PURE__*/React.createElement("div", {
        className: "sf-char-portrait-wrap overflow-hidden bg-gray-700"
      }, /*#__PURE__*/React.createElement("img", {
        src: `data/images/${char.race.toLowerCase()}.webp`,
        alt: "",
        className: "sf-char-portrait",
        width: "512",
        height: "342",
        loading: "lazy",
        onError: e => {
          e.target.style.display = 'none';
        }
      })), /*#__PURE__*/React.createElement("div", {
        className: "flex flex-col justify-between flex-1 p-4 min-w-0"
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
        className: "sf-card-title text-lg font-semibold mb-3 tracking-wide uppercase text-gray-100 group-hover:text-yellow-300 transition-colors"
      }, char.race), /*#__PURE__*/React.createElement("p", {
        className: "text-sm text-gray-400 leading-relaxed mb-3"
      }, char.ui_meta.description)), /*#__PURE__*/React.createElement("div", {
        className: "mt-auto pt-2 flex flex-col"
      }, topSkills.map(s => /*#__PURE__*/React.createElement("p", {
        key: s.name,
        className: "text-sm py-1"
      }, /*#__PURE__*/React.createElement(Tooltip, {
        term: s.name,
        definition: SKILL_TIPS[s.name] || s.name
      }, s.name))), sigSkill && char.signature_trait && /*#__PURE__*/React.createElement("p", {
        className: "text-sm py-1 font-semibold"
      }, /*#__PURE__*/React.createElement(Tooltip, {
        term: sigSkill.name,
        definition: char.signature_trait
      }, sigSkill.name, " \u2605"))))));
    });
  })()), /*#__PURE__*/React.createElement("div", {
    className: "max-w-4xl mx-auto w-full"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setStep('CAMPAIGN');
      onAdventureSelect(null);
      onCharSelect(null);
    },
    className: "text-xs text-gray-500 hover:text-gray-300 underline text-center w-full"
  }, "Back to Choose Campaign")));
}

// SECTION 18 -- STATE MANAGER
// The server resolves every turn and returns the full, authoritative state
// (POST /api/turn's `state` field); the browser adopts it instead of
// recomputing deltas itself. clampStamina/applySeuDelta/applyNpcUpdates/
// applyFactionUpdates/applyJournalEntry/applyStateUpdates are gone along
// with the client-side math they did.
function adoptServerState(prev, serverState) {
  if (!serverState) return prev;
  return {
    ...prev,
    ...serverState,
    meta: {
      ...prev.meta,
      ...serverState.meta,
      loading: false
    }
  };
}


// SECTION 19 -- STAMINA BAR COMPONENT
function StaminaBar({
  current,
  max
}) {
  // Stamina can go negative now (death is at -30, not floored at 0), so the
  // bar's own width has to clamp at 0 even though the number above it does not.
  const pct = max > 0 ? Math.max(0, current / max) : 0;
  const barColor = pct > 0.5 ? 'bg-green-500' : pct > 0.25 ? 'bg-yellow-500' : 'bg-red-500';
  return /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-gray-700 rounded-full h-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: `${barColor} h-2 rounded-full transition-all duration-300`,
    style: {
      width: `${Math.round(pct * 100)}%`
    }
  }));
}

// SECTION 20 -- SKILL BADGE COMPONENT
function SkillBadge({
  name,
  level
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between py-0.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-300"
  }, name), /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-gray-700 text-yellow-400 font-bold px-1.5 py-0.5 rounded ml-2"
  }, level));
}

// SECTION 21 -- CHARACTER SHEET COMPONENT
function CharacterSheet({
  character,
  naked = false
}) {
  if (!character) {
    if (naked) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "w-64 bg-gray-800 flex-shrink-0 flex flex-col border-r border-gray-700"
    }, /*#__PURE__*/React.createElement("div", {
      className: "p-4 border-b border-gray-700"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-gray-500 text-xs uppercase tracking-widest font-semibold"
    }, "Character Sheet")), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 flex items-center justify-center p-4"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 text-xs text-center"
    }, "No character loaded")));
  }
  const staminaPct = character.stamina.max > 0 ? character.stamina.current / character.stamina.max : 0;
  const staminaLow = staminaPct < 0.25;
  const statRows = [[['STR', character.stats.str], ['STA', character.stats.sta], ['DEX', character.stats.dex], ['RS', character.stats.rs]], [['INT', character.stats.int], ['LOG', character.stats.log], ['PER', character.stats.per], ['LDR', character.stats.ldr]]];
  if (naked) {
    const STAT_TIPS = {
      STR: 'Strength: physical power. Governs melee damage bonuses and carrying capacity.',
      STA: 'Stamina: base hit points. Your max stamina equals this score.',
      DEX: 'Dexterity: hand-eye coordination. Base stat for all ranged weapon skill checks.',
      RS: 'Reaction Speed: governs initiative order and defensive rolls.',
      INT: 'Intuition: perception and instinct. Affects environmental and social awareness.',
      LOG: 'Logic: analytical reasoning. Base stat for technical, computer, and medical checks.',
      PER: 'Personality: social influence and personal force of presence.',
      LDR: 'Leadership: ability to inspire and direct others under pressure.'
    };
    const SKILL_SIDEBAR_TIPS = {
      'Beam Weapons': 'Proficiency with laser and energy-based ranged weapons.',
      'Melee Weapons': 'Close-quarters combat with blades, clubs, and vibro-weapons.',
      'Demolitions': 'Setting, disarming, and safely handling explosive devices.',
      'Thrown Weapons': 'Accurate use of grenades and other thrown projectiles.',
      'Jyro Weapons': 'Proficiency with gyrojet pistols and rockets.',
      'Technician': 'Repair, modify, and sabotage mechanical and electronic systems.',
      'Computers': 'Operate, program, and hack computer systems.',
      'Medical': 'Field surgery, disease treatment, and emergency stabilization.',
      'Environmental': 'Analysis and survival in hazardous or alien environments.',
      'Psycho-Social': 'Persuasion, deception, and reading social situations.',
      'Survival': 'Finding food, water, and shelter in the wilderness.',
      'Tracking': 'Following trails and identifying signs left by creatures or people.',
      'Improvisation': 'Adapting on the fly when standard approaches fail. Jury-rigged solutions, unexpected social plays, environmental advantages.',
      'Bureaucracy': 'Navigating contracts, institutional hierarchies, and legal fine print. Exploiting loopholes others cannot see.',
      'Xenobiology': 'Identifying organisms, toxins, and biological threats by scent and observation.',
      'Hunter': 'Reading tactical situations by instinct. Sensing ambushes and hidden danger ahead of anyone else.',
      'Intimidation': 'Using physical presence to make NPCs defer, back down, or reveal information.',
      'Negotiation': 'Reading the value of anything instantly. Getting better terms and deals.',
      'Xenolinguistics': 'Fluency in any language: spoken, written, encoded, or alien.',
      'Martial Arts': 'Unarmed combat techniques for close-quarters fighting.',
      'Robotics': 'Programming, repairing, and controlling robotic systems.'
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "p-3 flex flex-col gap-3 text-xs leading-5 w-full min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-gray-300"
    }, /*#__PURE__*/React.createElement("span", null, character.credits, " Credits")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "flex justify-between items-baseline"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-gray-400 uppercase tracking-wide"
    }, "Energy Charges"), /*#__PURE__*/React.createElement("span", {
      className: "text-gray-300"
    }, character.seu.total)), character.seu.sources.map((src, i) => {
      const normSrc = src.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      const srcTip = TOOLTIP_GLOSSARY[normSrc] || Object.entries(TOOLTIP_GLOSSARY).find(([k]) => normSrc.includes(k))?.[1];
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        className: "flex justify-between text-gray-400"
      }, /*#__PURE__*/React.createElement("span", null, srcTip ? /*#__PURE__*/React.createElement(Tooltip, {
        term: src.name,
        definition: srcTip
      }, src.name) : src.name), /*#__PURE__*/React.createElement("span", {
        className: "text-gray-300"
      }, src.seu));
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-gray-400 uppercase tracking-wide mb-1"
    }, "Inventory"), character.inventory && character.inventory.length > 0 ? /*#__PURE__*/React.createElement("ul", {
      className: "list-none"
    }, character.inventory.map((item, i) => {
      const normItem = item.toLowerCase().replace(/\s*x\d+$/, '').trim();
      const tip = TOOLTIP_GLOSSARY[normItem] || Object.entries(TOOLTIP_GLOSSARY).find(([k]) => normItem.includes(k))?.[1];
      return /*#__PURE__*/React.createElement("li", {
        key: i,
        className: "text-gray-300"
      }, tip ? /*#__PURE__*/React.createElement(Tooltip, {
        term: item,
        definition: tip
      }, item) : item);
    })) : /*#__PURE__*/React.createElement("span", {
      className: "text-gray-600 italic"
    }, "No items")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-gray-400 uppercase tracking-wide mb-1"
    }, "Skills"), character.skills && character.skills.length > 0 ? character.skills.map((skill, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex items-center justify-between text-gray-300"
    }, SKILL_SIDEBAR_TIPS[skill.name] ? /*#__PURE__*/React.createElement(Tooltip, {
      term: skill.name,
      definition: SKILL_SIDEBAR_TIPS[skill.name]
    }, skill.name) : /*#__PURE__*/React.createElement("span", null, skill.name), /*#__PURE__*/React.createElement("span", {
      className: "text-gray-500 ml-2"
    }, "L", skill.level))) : /*#__PURE__*/React.createElement("span", {
      className: "text-gray-600 italic"
    }, "No skills")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "text-gray-400 uppercase tracking-wide mb-1"
    }, "Attributes"), statRows.map((row, ri) => /*#__PURE__*/React.createElement("div", {
      key: ri,
      className: "grid grid-cols-2 gap-x-3 mb-0"
    }, row.map(([label, value]) => /*#__PURE__*/React.createElement("div", {
      key: label,
      className: "flex justify-between text-gray-300"
    }, /*#__PURE__*/React.createElement(Tooltip, {
      term: label,
      definition: STAT_TIPS[label]
    }, label), /*#__PURE__*/React.createElement("span", {
      className: "text-gray-300"
    }, value)))))));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "w-64 bg-gray-800 flex-shrink-0 flex flex-col border-r border-gray-700 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 border-b border-gray-700 flex-shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-yellow-400 text-sm leading-tight"
  }, character.display_name || character.name), /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded font-mono"
  }, "IM ", character.combat.im)), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-400 mt-0.5"
  }, character.race)), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-3 flex flex-col gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-gray-400 uppercase tracking-wide"
  }, "Stamina"), /*#__PURE__*/React.createElement("span", {
    className: `text-xs font-bold ${staminaLow ? 'text-red-400' : 'text-gray-100'}`
  }, character.stamina.current, " / ", character.stamina.max, staminaLow && ' !')), /*#__PURE__*/React.createElement(StaminaBar, {
    current: character.stamina.current,
    max: character.stamina.max
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1"
  }, "Stats"), statRows.map((row, ri) => /*#__PURE__*/React.createElement("div", {
    key: ri,
    className: "grid grid-cols-4 gap-1 mb-1"
  }, row.map(([label, value]) => /*#__PURE__*/React.createElement("div", {
    key: label,
    className: "text-center bg-gray-900 rounded py-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-gray-500 text-xs leading-none"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "text-gray-100 text-xs font-bold leading-none mt-0.5"
  }, value)))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1"
  }, "Skills"), character.skills && character.skills.length > 0 ? character.skills.map((skill, i) => /*#__PURE__*/React.createElement(SkillBadge, {
    key: i,
    name: skill.name,
    level: skill.level
  })) : /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 italic"
  }, "No skills")), character.status_effects && character.status_effects.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1"
  }, "Status"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1"
  }, character.status_effects.map((effect, i) => {
    const isNegative = ['wound', 'stunned', 'poisoned', 'blind', 'unconscious'].some(neg => effect.toLowerCase().includes(neg));
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: `text-xs px-1.5 py-0.5 rounded font-semibold ${isNegative ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`
    }, effect);
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-gray-400 uppercase tracking-wide"
  }, "EC"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-100 font-bold"
  }, character.seu.total, " total")), character.seu.sources.map((src, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex justify-between text-xs text-gray-400 py-0.5"
  }, /*#__PURE__*/React.createElement("span", null, src.name), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-300"
  }, src.seu)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1"
  }, "Inventory"), character.inventory && character.inventory.length > 0 ? /*#__PURE__*/React.createElement("ul", {
    className: "list-none"
  }, character.inventory.map((item, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    className: "text-xs text-gray-300 leading-relaxed"
  }, item))) : /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 italic"
  }, "No items")), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-gray-700 pt-2 mt-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-xs text-gray-400"
  }, /*#__PURE__*/React.createElement("span", null, "Credits"), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-100 font-bold"
  }, character.credits, " Cr")), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-xs text-gray-400 mt-0.5"
  }, /*#__PURE__*/React.createElement("span", null, "XP"), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-100"
  }, character.xp.total, " (", character.xp.unspent, " unspent)")))));
}

// SECTION 22 -- COMBAT ENGINE
// combat_state now arrives wholesale from the server as part of the state
// POST /api/turn returns; adoptServerState() adopts it directly, so the
// client-side COMBAT_PHASES/OPTIONAL_RULES_DEFAULT constants and
// applyCombatStateUpdate (which used to reconstruct it from a partial
// update) are gone.

// SECTION 13 -- useDMTurn HOOK
function useDMTurn({
  gameState,
  setGameState,
  sessionToken,
  onError,
  onOocNote,
  onTurnComplete
}) {
  const [loading, setLoading] = useState(false);
  const [streamingNarrative, setStreamingNarrative] = useState(null);
  const [currentChoices, setCurrentChoices] = useState(gameState._autoChoices || []);
  const [messages, setMessages] = useState(gameState.messages || []);
  const [latestDiceRolls, setLatestDiceRolls] = useState([]);
  const [latestTooltipTerms, setLatestTooltipTerms] = useState([]);
  const interruptRecoveryRef = useRef(false);
  const pendingResultRef = useRef(null);
  useEffect(() => {
    setGameState(prev => prev.messages === messages ? prev : {
      ...prev,
      messages
    });
  }, [messages]);

  // localStorage stays a display-only mirror for an offline reload; the
  // server is the save (POST /api/turn commits it after every turn).
  useEffect(() => {
    if (!gameState?.meta?.initialized) return;
    try {
      localStorage.setItem('sf_game_save', JSON.stringify({
        ...gameState,
        messages,
        _autoChoices: currentChoices
      }));
    } catch (_) {}
  }, [messages, currentChoices]);

  // ── Interrupted-turn recovery ─────────────────────────────────────────────
  // If the session was saved while the DM was mid-generation, the last message
  // will be a player message with no DM response. Detect this on mount and
  // silently re-send that same turn number; the server either replays its
  // already-resolved result or, if it never finished, resolves it now.
  useEffect(() => {
    if (interruptRecoveryRef.current) return;
    if (!gameState?.meta?.initialized) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'player') return;
    interruptRecoveryRef.current = true;
    setLoading(true);
    setStreamingNarrative('');
    callTurn(sessionToken, {
      turn: gameState.session.turn_count + 1,
      text: lastMsg.content
    }, onError, () => {}).then(result => {
      setStreamingNarrative(null);
      if (!result) {
        setLoading(false);
        return;
      }
      setLatestDiceRolls(result.dice_rolls || []);
      if (result.tooltip_terms?.length > 0) setLatestTooltipTerms(result.tooltip_terms);
      if (result.ooc_note && onOocNote) onOocNote(result.ooc_note);
      const dmMsg = {
        id: crypto.randomUUID(),
        role: 'dm',
        content: sanitizeNarrative(result.narrative),
        _raw: JSON.stringify(result),
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, dmMsg]);
      setCurrentChoices(result.choices || []);
      setGameState(prev => adoptServerState(prev, result.state));
      if (onTurnComplete) onTurnComplete(result, result.state);
      setLoading(false);
    });
  }, [gameState?.meta?.initialized]);
  const submitTurn = useCallback(async (playerText, choiceId) => {
    if (loading || !(playerText?.trim() || choiceId)) return;
    setLoading(true);

    // Add player message to display history (a choice click has its own
    // button label as the visible line; no separate player message).
    if (playerText) {
      const playerMsg = {
        id: crypto.randomUUID(),
        role: 'player',
        content: playerText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, playerMsg]);
    }

    setStreamingNarrative(''); // signal the turn started
    const result = await callTurn(sessionToken, {
      turn: gameState.session.turn_count + 1,
      text: playerText || undefined,
      choice_id: choiceId
    }, onError, () => {});
    if (!result) {
      setStreamingNarrative(null);
      setLoading(false);
      return;
    }

    // Fire immediately — dice/tooltips/ooc don't depend on typewriter finishing.
    setLatestDiceRolls(result.dice_rolls || []);
    if (result.tooltip_terms && result.tooltip_terms.length > 0) {
      setLatestTooltipTerms(result.tooltip_terms);
    }
    if (result.ooc_note && onOocNote) onOocNote(result.ooc_note);

    // Store the resolved turn for use after the typewriter finishes.
    pendingResultRef.current = result;

    // Hand the (already fully known) narrative to TerminalText — it
    // typewriters it in for the same reveal pacing as before, then calls
    // onStreamingComplete which commits the message and clears loading.
    setStreamingNarrative(sanitizeNarrative(result.narrative));
  }, [loading, gameState, sessionToken, onError, onOocNote]);
  const addDMMessage = useCallback((content, raw) => {
    const dmMsg = {
      id: crypto.randomUUID(),
      role: 'dm',
      content: sanitizeNarrative(content),
      _raw: raw || content,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, dmMsg]);
  }, []);
  const handleTypewriterComplete = useCallback(() => {
    const result = pendingResultRef.current;
    if (!result) return;
    pendingResultRef.current = null;
    setStreamingNarrative(null);
    const dmMsg = {
      id: crypto.randomUUID(),
      role: 'dm',
      content: sanitizeNarrative(result.narrative),
      _raw: JSON.stringify(result),
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, dmMsg]);
    setCurrentChoices(result.choices || []);
    setGameState(prev => adoptServerState(prev, result.state));
    if (onTurnComplete) onTurnComplete(result, result.state);
    setLoading(false);
  }, [onTurnComplete, setGameState]);
  return {
    submitTurn,
    loading,
    streamingNarrative,
    currentChoices,
    messages,
    addDMMessage,
    setCurrentChoices,
    latestDiceRolls,
    latestTooltipTerms,
    handleTypewriterComplete
  };
}

// SECTION 28b -- TOOLTIP COMPONENT
function Tooltip({
  term,
  definition,
  children
}) {
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState({
    position: 'fixed',
    visibility: 'hidden',
    width: '260px',
    zIndex: 9999
  });
  const anchorRef = React.useRef(null);
  const tipRef = React.useRef(null);
  const idRef = React.useRef(crypto.randomUUID());
  const timerRef = React.useRef(null);
  const place = () => {
    if (!anchorRef.current) return;
    const a = anchorRef.current.getBoundingClientRect();
    const W = 260;
    const margin = 8;
    const tipH = tipRef.current ? tipRef.current.offsetHeight : 72;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: align left edge with anchor, clamp to viewport
    let left = a.left;
    if (left + W > vw - margin) left = vw - margin - W;
    if (left < margin) left = margin;

    // Vertical: prefer above, flip below if not enough room above
    let top;
    if (a.top >= tipH + 8) {
      top = a.top - tipH - 6;
    } else {
      top = a.bottom + 6;
    }
    // Final clamp so it never exits bottom or top
    if (top + tipH > vh - margin) top = vh - margin - tipH;
    if (top < margin) top = margin;
    setStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${W}px`,
      zIndex: 9999,
      visibility: 'visible'
    });
  };

  // Re-place after render so we have real tipRef height
  useEffect(() => {
    if (visible) place();
  }, [visible]);
  const show = () => {
    // Render hidden first so tipRef gets a height, then place() fires via effect
    setStyle(s => ({
      ...s,
      visibility: 'hidden'
    }));
    setVisible(true);
    window.dispatchEvent(new CustomEvent('sf-tooltip-open', {
      detail: idRef.current
    }));
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 10000);
  };
  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };
  useEffect(() => {
    const onOther = e => {
      if (e.detail !== idRef.current) setVisible(false);
    };
    window.addEventListener('sf-tooltip-open', onOther);
    return () => {
      window.removeEventListener('sf-tooltip-open', onOther);
      clearTimeout(timerRef.current);
    };
  }, []);

  // Mobile: close on any outside touch; if scroll → close + let scroll through; if tap → close + block synthetic click
  useEffect(() => {
    if (!visible) return;
    var startX = 0,
      startY = 0,
      didScroll = false;
    function onStart(e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      didScroll = false;
    }
    function onMove(e) {
      if (Math.abs(e.touches[0].clientX - startX) > 8 || Math.abs(e.touches[0].clientY - startY) > 8) {
        didScroll = true;
        hide();
      }
    }
    function onEnd(e) {
      if (!didScroll) {
        hide();
        e.preventDefault(); // block synthetic click from firing on element beneath
      }
    }
    document.addEventListener('touchstart', onStart, {
      passive: true,
      capture: true
    });
    document.addEventListener('touchmove', onMove, {
      passive: true,
      capture: true
    });
    document.addEventListener('touchend', onEnd, {
      passive: false,
      capture: true
    });
    return function () {
      document.removeEventListener('touchstart', onStart, {
        capture: true
      });
      document.removeEventListener('touchmove', onMove, {
        capture: true
      });
      document.removeEventListener('touchend', onEnd, {
        capture: true
      });
    };
  }, [visible]);
  return /*#__PURE__*/React.createElement("span", {
    ref: anchorRef,
    className: "inline",
    onPointerEnter: e => {
      if (e.pointerType === 'mouse') show();
    },
    onPointerLeave: e => {
      if (e.pointerType === 'mouse') hide();
    },
    onClick: e => {
      e.stopPropagation();
      visible ? hide() : show();
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "underline decoration-dotted decoration-yellow-500 cursor-help text-yellow-400"
  }, children), visible && ReactDOM.createPortal(/*#__PURE__*/React.createElement("span", {
    ref: tipRef,
    style: style,
    className: "pointer-events-none"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block bg-gray-900 border border-gray-600 text-gray-100 text-xs rounded-lg px-3 py-2 shadow-xl whitespace-normal leading-snug"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block font-bold text-yellow-400 mb-1 text-xs uppercase tracking-wide"
  }, term), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-300"
  }, definition))), document.body));
}

// SECTION 28c -- WRAP TEXT WITH TOOLTIPS
function wrapTextWithTooltips(text, registry) {
  if (!text || !registry || Object.keys(registry).length === 0) {
    return [/*#__PURE__*/React.createElement("span", {
      key: "raw"
    }, text)];
  }

  // Sort terms by length descending to match longer terms first
  const terms = Object.keys(registry).sort((a, b) => b.length - a.length);
  const usedTerms = new Set(); // first occurrence only per call

  // Build a regex that matches any term (case-insensitive)
  const escapedTerms = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (escapedTerms.length === 0) return [/*#__PURE__*/React.createElement("span", {
    key: "raw"
  }, text)];
  const pattern = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');
  const parts = text.split(pattern);
  const elements = [];
  parts.forEach((part, i) => {
    if (!part) return;
    const lowerPart = part.toLowerCase();
    const def = registry[lowerPart];
    if (def && !usedTerms.has(lowerPart)) {
      usedTerms.add(lowerPart);
      elements.push(/*#__PURE__*/React.createElement(Tooltip, {
        key: i,
        term: part,
        definition: def
      }, part));
    } else {
      elements.push(/*#__PURE__*/React.createElement("span", {
        key: i
      }, part));
    }
  });
  return elements;
}

// SECTION 13b -- TERMINAL TEXT COMPONENT (typewriter effect)
function TerminalText({
  text,
  onComplete
}) {
  const [displayed, setDisplayed] = useState('');
  const targetRef = useRef(text);
  const onCompleteRef = useRef(onComplete);
  const firedRef = useRef(false);
  useEffect(() => {
    targetRef.current = text;
    firedRef.current = false;
  }, [text]);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayed(prev => {
        const remaining = targetRef.current.length - prev.length;
        if (remaining <= 0) return prev;
        const step = remaining > 80 ? 4 : remaining > 30 ? 2 : 1;
        return targetRef.current.slice(0, prev.length + step);
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Fire onComplete once when displayed catches up to the full text.
  useEffect(() => {
    if (!firedRef.current && displayed.length > 0 && displayed === targetRef.current) {
      firedRef.current = true;
      if (onCompleteRef.current) onCompleteRef.current();
    }
  }, [displayed]);
  const paragraphs = displayed.split('\n\n').filter((p, i, a) => p.trim() || i < a.length - 1);
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, (paragraphs.length > 0 ? paragraphs : ['']).map((para, i, arr) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: "text-gray-100 text-sm leading-relaxed"
  }, para, i === arr.length - 1 && /*#__PURE__*/React.createElement("span", {
    className: "animate-pulse text-yellow-400"
  }, "\u258A"))));
}

// SECTION 14 -- MESSAGE HISTORY COMPONENT
function MessageHistory({
  messages,
  tooltipRegistry,
  isLoading,
  streamingNarrative,
  onStreamingComplete
}) {
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const pinnedRef = useRef(true); // true = user is at bottom, auto-scroll active
  const [showScrollDown, setShowScrollDown] = useState(false);
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    pinnedRef.current = atBottom;
    setShowScrollDown(!atBottom);
  };
  const scrollToBottom = () => {
    pinnedRef.current = true;
    setShowScrollDown(false);
    if (bottomRef.current) bottomRef.current.scrollIntoView({
      behavior: 'smooth'
    });
  };

  // Scroll when a new message is added — only if user was already at bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !pinnedRef.current) return;
    el.scrollTop = el.scrollHeight;
    setShowScrollDown(false);
  }, [messages.length]);

  // ResizeObserver: when container height changes (e.g. Actions panel open/close),
  // re-pin to bottom if user was already there.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (pinnedRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // rAF loop during streaming: show/hide scroll-down arrow only.
  // Never mutates pinnedRef — only handleScroll (user action) does that.
  useEffect(() => {
    if (!isLoading) return;
    let raf;
    const tick = () => {
      const el = scrollRef.current;
      if (el) {
        const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
        setShowScrollDown(gap >= 40);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isLoading]);
  return /*#__PURE__*/React.createElement("div", {
    className: "flex-1 relative min-h-0 min-w-0 overflow-x-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    ref: scrollRef,
    onScroll: handleScroll,
    className: "sf-chat-scroll h-full overflow-y-auto overflow-x-hidden p-4 flex flex-col"
  }, messages.length === 0 && !isLoading && /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-sm italic"
  }, "Your adventure awaits...")), messages.map(msg => /*#__PURE__*/React.createElement("div", {
    key: msg.id,
    className: `mb-4 ${msg.role === 'player' ? 'flex justify-end' : 'flex justify-start'}`
  }, msg.role === 'dm' && /*#__PURE__*/React.createElement("div", {
    className: "sf-dm-bubble max-w-2xl w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "py-1"
  }, msg.content.split('\n').filter(l => l.trim()).map((line, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: "text-gray-100 text-sm leading-relaxed mb-2 last:mb-0"
  }, tooltipRegistry ? wrapTextWithTooltips(line, tooltipRegistry) : line)))), msg.role === 'player' && /*#__PURE__*/React.createElement("div", {
    className: "sf-player-bubble max-w-md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-900 border border-blue-700 rounded-lg px-4 py-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-100 text-sm"
  }, msg.content))))), isLoading && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 flex justify-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-2xl w-full"
  }, streamingNarrative !== null ? /*#__PURE__*/React.createElement("div", {
    className: "py-1"
  }, /*#__PURE__*/React.createElement(TerminalText, {
    text: streamingNarrative,
    onComplete: onStreamingComplete
  })) : /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-4 inline-flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 bg-gray-400 rounded-full animate-bounce",
    style: {
      animationDelay: '0ms'
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 bg-gray-400 rounded-full animate-bounce",
    style: {
      animationDelay: '160ms'
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 bg-gray-400 rounded-full animate-bounce",
    style: {
      animationDelay: '320ms'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    ref: bottomRef
  })), showScrollDown && /*#__PURE__*/React.createElement("button", {
    onClick: scrollToBottom,
    className: "absolute bottom-3 left-1/2 -translate-x-1/2 bg-gray-700 border border-gray-500 text-yellow-400 rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-gray-600 cursor-pointer z-10",
    "aria-label": "Scroll to bottom"
  }, /*#__PURE__*/React.createElement(ChevronRight, {
    size: 16,
    style: {
      transform: 'rotate(90deg)'
    }
  })));
}

// SECTION 15 -- CHOICE MENU COMPONENT
function ChoiceMenu({
  choices,
  onChoiceSelect,
  disabled,
  actionsOpen,
  onToggleActions,
  shine,
  loading,
  actLabel,
  sceneCount,
  turnCount,
  character
}) {
  const displayChoices = loading ? [] : (choices || []).slice(0, 3);
  const hasChoices = displayChoices.length > 0;
  const [pulsingId, setPulsingId] = useState(null);
  const handleChoiceClick = choice => {
    if (disabled || pulsingId) return;
    setPulsingId(choice.id);
    setTimeout(() => {
      setPulsingId(null);
      onChoiceSelect(choice);
    }, 520);
  };
  useEffect(() => {
    const onKeyDown = e => {
      if (e.code === 'Space' && e.ctrlKey && hasChoices && !disabled) {
        e.preventDefault();
        onToggleActions();
        return;
      }
      const n = parseInt(e.key, 10);
      if (actionsOpen && n >= 1 && n <= displayChoices.length) {
        e.preventDefault();
        handleChoiceClick(displayChoices[n - 1]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actionsOpen, disabled, displayChoices, onChoiceSelect, hasChoices, pulsingId, onToggleActions]);
  return /*#__PURE__*/React.createElement("div", {
    className: "flex-shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center px-3 py-1.5 gap-2 min-w-0"
  }, hasChoices ? /*#__PURE__*/React.createElement("button", {
    onClick: onToggleActions,
    className: `flex items-center gap-1.5 text-xs cursor-pointer select-none flex-shrink-0 ${actionsOpen ? 'text-yellow-400' : 'text-gray-400 gold-shine'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "uppercase tracking-widest font-semibold"
  }, "Suggested Actions"), /*#__PURE__*/React.createElement(ChevronRight, {
    size: 12,
    style: {
      transform: actionsOpen ? 'rotate(90deg)' : 'rotate(-90deg)',
      transition: 'transform 0.15s'
    }
  })) : /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-600 uppercase tracking-widest font-semibold flex-shrink-0"
  }, "Suggested Actions")), hasChoices && /*#__PURE__*/React.createElement("div", {
    className: `sf-actions-panel ${actionsOpen ? 'open' : ''}`
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "px-3 pb-2 flex flex-col gap-1"
  }, displayChoices.map((choice, i) => /*#__PURE__*/React.createElement("button", {
    key: choice.id,
    disabled: disabled,
    onClick: () => handleChoiceClick(choice),
    className: `sf-card-btn text-left px-3 py-1.5 rounded border text-xs w-full flex items-start gap-2 ${disabled ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed opacity-50' : 'bg-gray-800 border-gray-600 text-gray-200 hover:border-yellow-400 hover:text-yellow-300 cursor-pointer'} ${pulsingId === choice.id ? 'sf-card-select' : ''}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-yellow-400 font-bold flex-shrink-0"
  }, i + 1, "."), choice.text))))));
}

// SECTION 16 -- PLAYER INPUT COMPONENT
function PlayerInput({
  onSubmit,
  disabled,
  showHint,
  externalFill,
  onExternalFillConsumed
}) {
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef(null);
  useEffect(() => {
    if (externalFill) {
      setInputVal(externalFill);
      if (onExternalFillConsumed) onExternalFillConsumed();
    }
  }, [externalFill]);
  useEffect(() => {
    const onKeyDown = e => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const placeholder = 'What do you do?';
  const handleSubmit = () => {
    if (!inputVal.trim() || disabled) return;
    onSubmit(inputVal.trim());
    setInputVal('');
  };
  const handleKeyDown = e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "sf-player-input px-4 py-3 flex gap-2 items-end"
  }, /*#__PURE__*/React.createElement("textarea", {
    ref: inputRef,
    rows: 1,
    value: inputVal,
    onChange: e => setInputVal(e.target.value),
    onKeyDown: handleKeyDown,
    disabled: disabled,
    placeholder: placeholder,
    className: "flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:border-yellow-500 disabled:opacity-50 resize-none overflow-hidden",
    style: {
      fieldSizing: 'content',
      maxHeight: '8rem'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handleSubmit,
    disabled: disabled || !inputVal.trim(),
    className: "bg-yellow-400 text-gray-900 font-bold px-4 rounded hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer flex items-center justify-center gap-1 min-w-[52px] h-9 flex-shrink-0",
    "aria-label": disabled ? 'Loading...' : 'Send'
  }, disabled ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 bg-gray-900 rounded-full animate-bounce",
    style: {
      animationDelay: '0ms'
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 bg-gray-900 rounded-full animate-bounce",
    style: {
      animationDelay: '150ms'
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 bg-gray-900 rounded-full animate-bounce",
    style: {
      animationDelay: '300ms'
    }
  })) : 'Send'));
}

// SECTION 23a -- DICE ROLL DISPLAY
function DiceRollDisplay({
  diceRolls
}) {
  if (!diceRolls || diceRolls.length === 0) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-row gap-2 overflow-x-auto py-2"
  }, diceRolls.map((roll, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "bg-gray-700 rounded p-2 flex-shrink-0 min-w-20 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-400 mb-1 leading-tight"
  }, roll.description), /*#__PURE__*/React.createElement("div", {
    className: `text-2xl font-bold ${roll.success ? 'text-green-400' : 'text-red-400'}`
  }, roll.roll), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-500"
  }, "vs ", roll.target), /*#__PURE__*/React.createElement("div", {
    className: `text-xs font-semibold mt-0.5 ${roll.success ? 'text-green-400' : 'text-red-400'}`
  }, roll.success ? 'HIT' : 'MISS'), typeof roll.margin === 'number' && /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-500"
  }, "by ", Math.abs(roll.margin)))));
}

// SECTION 23b -- INITIATIVE TRACKER
function InitiativeTracker({
  initiativeOrder,
  round
}) {
  if (!initiativeOrder || initiativeOrder.length === 0) return null;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1"
  }, "Initiative, Round ", round || 1), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1"
  }, initiativeOrder.map((combatant, i) => {
    const isFirst = i === initiativeOrder.findIndex(c => !c.has_acted);
    return /*#__PURE__*/React.createElement("div", {
      key: combatant.id || i,
      className: `flex items-center gap-2 px-2 py-1 rounded text-xs ${isFirst ? 'bg-yellow-900 border border-yellow-600 text-yellow-100' : 'bg-gray-700 text-gray-300'} ${combatant.has_acted ? 'opacity-50' : ''}`
    }, combatant.is_player ? /*#__PURE__*/React.createElement(User, {
      size: 10,
      className: "text-blue-400 flex-shrink-0"
    }) : /*#__PURE__*/React.createElement(Shield, {
      size: 10,
      className: "text-red-400 flex-shrink-0"
    }), /*#__PURE__*/React.createElement("span", {
      className: "flex-1"
    }, combatant.name), /*#__PURE__*/React.createElement("span", {
      className: "text-gray-400"
    }, combatant.initiative_roll), isFirst && !combatant.has_acted && /*#__PURE__*/React.createElement("span", {
      className: "text-xs bg-yellow-600 text-gray-900 font-bold px-1 py-0.5 rounded ml-auto"
    }, "ACTING"), combatant.has_acted && /*#__PURE__*/React.createElement(Check, {
      size: 10,
      className: "text-gray-500"
    }));
  })));
}

// SECTION 23c -- OPTIONAL RULES PANEL
function OptionalRulesPanel({
  activeOptionalRules
}) {
  if (!activeOptionalRules) return null;
  const rules = [{
    key: 'burst_fire',
    label: 'Burst Fire'
  }, {
    key: 'called_shots',
    label: 'Called Shots'
  }, {
    key: 'cover_concealment',
    label: 'Cover & Concealment'
  }, {
    key: 'suppression_fire',
    label: 'Suppression Fire'
  }];
  const activeRules = rules.filter(r => activeOptionalRules[r.key]);
  if (activeRules.length === 0) return null;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1"
  }, "Active Rules"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1"
  }, activeRules.map(r => /*#__PURE__*/React.createElement("span", {
    key: r.key,
    className: "text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded font-semibold"
  }, r.label))));
}

// SECTION 23d -- CHARACTER STATUS STRIP
function CharacterStatusStrip({
  character
}) {
  if (!character) return null;
  const sta = character.stamina || {
    current: 0,
    max: 1
  };
  const seu = character.seu ? character.seu.total : null;
  const statusEffects = character.status_effects || [];
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-shrink-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-400 whitespace-nowrap"
  }, "STA ", sta.current, "/", sta.max), seu !== null && /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline text-xs text-gray-500 whitespace-nowrap"
  }, "EC ", seu), statusEffects.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "hidden sm:flex items-center gap-0.5"
  }, statusEffects.slice(0, 3).map((s, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "text-xs bg-orange-800 text-orange-300 px-1 py-0.5 rounded font-mono leading-none",
    title: s
  }, s.slice(0, 3).toUpperCase()))));
}
function CombatPanel({
  combatState,
  diceRolls
}) {
  const [collapsed, setCollapsed] = useState(false);
  if (!combatState) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "mx-4 mb-2 bg-gray-800 border border-red-900 rounded-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-3 py-2 bg-red-900 cursor-pointer",
    onClick: () => setCollapsed(c => !c)
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Zap, {
    size: 12,
    className: "text-yellow-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-yellow-400 uppercase tracking-widest"
  }, "Combat Active"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-red-300"
  }, "Round ", combatState.round || 1)), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-red-300"
  }, collapsed ? 'Show' : 'Hide')), !collapsed && /*#__PURE__*/React.createElement("div", {
    className: "p-3 flex flex-col gap-3"
  }, diceRolls && diceRolls.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1"
  }, "Dice Rolls"), /*#__PURE__*/React.createElement(DiceRollDisplay, {
    diceRolls: diceRolls
  })), /*#__PURE__*/React.createElement(InitiativeTracker, {
    initiativeOrder: combatState.initiative_order,
    round: combatState.round
  }), /*#__PURE__*/React.createElement(OptionalRulesPanel, {
    activeOptionalRules: combatState.active_optional_rules
  })));
}

// SECTION 24a -- SNAPSHOT FUNCTIONS
// Checkpoints are held server-side now (POST/GET /api/game/snapshot,
// POST /api/game/restore, DELETE /api/game/snapshot/:id); the browser keeps
// only their metadata ({id, turn_count, scene_count, timestamp}), capped at
// 3 by the server itself.
async function createSnapshot(sessionToken) {
  const res = await fetch('/api/game/snapshot', {
    method: 'POST',
    headers: {
      'X-Session-Token': sessionToken
    }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.snapshots || []).map(s => ({
    id: s.id,
    timestamp: s.created_at,
    turn_count: s.turn_count,
    scene_count: s.scene_count
  }));
}
// Loads this session's checkpoint list without creating a new one — used on
// mount/resume so a session that already has server-held checkpoints (from
// an earlier tab, or from before a reload) shows them immediately instead of
// only after the player saves one more.
async function loadSnapshotsFromServer(sessionToken) {
  const res = await fetch('/api/game/snapshot', {
    headers: {
      'X-Session-Token': sessionToken
    }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.snapshots || []).map(s => ({
    id: s.id,
    timestamp: s.created_at,
    turn_count: s.turn_count,
    scene_count: s.scene_count
  }));
}
async function restoreSnapshot(sessionToken, snapshotId) {
  const res = await fetch('/api/game/restore', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': sessionToken
    },
    body: JSON.stringify({
      snapshot_id: snapshotId
    })
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.state;
}
async function deleteSnapshotOnServer(sessionToken, snapshotId) {
  await fetch(`/api/game/snapshot/${snapshotId}`, {
    method: 'DELETE',
    headers: {
      'X-Session-Token': sessionToken
    }
  }).catch(() => {});
}

// SECTION 24b -- OOC NOTE COMPONENT
function OocNote({
  oocNote
}) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    setDismissed(false); // reset dismiss on new ooc note
  }, [oocNote]);
  if (!oocNote || dismissed) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "mx-4 mb-2 bg-yellow-900 border border-yellow-600 rounded-lg px-3 py-2 flex items-start justify-between gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2 flex-1"
  }, /*#__PURE__*/React.createElement(AlertCircle, {
    size: 14,
    className: "text-yellow-400 flex-shrink-0 mt-0.5"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-yellow-100 text-xs leading-relaxed"
  }, oocNote)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDismissed(true),
    className: "text-yellow-400 hover:text-yellow-200 flex-shrink-0"
  }, /*#__PURE__*/React.createElement(X, {
    size: 12
  })));
}

// SECTION 24c -- TOAST NOTIFICATION
function Toast({
  message,
  onDismiss
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [message]);
  if (!message) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-800 border border-green-600 text-green-100 text-xs font-semibold px-4 py-2 rounded-full shadow-lg z-50"
  }, message);
}

// SECTION 25a -- JOURNAL ENTRY COMPONENT
function JournalEntry({
  entry
}) {
  const time = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "border-l-2 border-yellow-400 pl-3 py-1 mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-500 mb-0.5"
  }, "[", time, "]"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-300 leading-relaxed"
  }, entry.entry));
}

// SECTION 25b -- JOURNAL PANEL COMPONENT
function JournalPanel({
  journal,
  campaign,
  sceneCount,
  onClose
}) {
  // Acts complete when player has moved past that act's scene range.
  // Act 1: scenes 1-5, Act 2: scenes 6-12, Act 3: scenes 13+
  const act1Complete = sceneCount > 5;
  const act2Complete = sceneCount > 12;
  const currentActLabel = sceneCount <= 5 ? 'Act 1' : sceneCount <= 12 ? 'Act 2' : 'Act 3';
  const completedActs = campaign && campaign.spine ? [act1Complete && {
    label: 'ACT 1 COMPLETE',
    text: campaign.spine.act1_goal
  }, act2Complete && {
    label: 'ACT 2 COMPLETE',
    text: campaign.spine.act2_complication
  }].filter(Boolean) : [];
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 z-40 flex flex-col shadow-2xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(BookOpen, {
    size: 14,
    className: "text-yellow-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold text-gray-100"
  }, "Mission Journal")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-gray-400 hover:text-gray-200"
  }, /*#__PURE__*/React.createElement(X, {
    size: 16
  }))), campaign && /*#__PURE__*/React.createElement("div", {
    className: "px-4 py-3 border-b border-gray-700 flex-shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-yellow-400 mb-2 uppercase tracking-wide"
  }, campaign.adventure_title), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-500 mb-2"
  }, "Currently in ", /*#__PURE__*/React.createElement("span", {
    className: "text-yellow-600 font-semibold"
  }, currentActLabel)), completedActs.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1.5"
  }, completedActs.map(act => /*#__PURE__*/React.createElement("div", {
    key: act.label,
    className: "flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-green-500 w-24 flex-shrink-0"
  }, act.label), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-400 leading-relaxed"
  }, act.text))))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto px-4 py-3"
  }, !journal || journal.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-xs italic"
  }, "No journal entries yet. The DM will record key events here.") : [...journal].reverse().map((entry, i) => /*#__PURE__*/React.createElement(JournalEntry, {
    key: i,
    entry: entry
  }))));
}

// SECTION 25c -- SUMMARY CARD COMPONENT
function SummaryCard({
  gameState,
  onNewAdventure,
  onClose
}) {
  const [showExport, setShowExport] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const char = gameState.character;
  const camp = gameState.campaign;
  const session = gameState.session;
  const exportJson = JSON.stringify(gameState, null, 2);
  const handleSaveAndExport = () => {
    setShowExport(true);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 px-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-screen overflow-y-auto p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-extrabold text-yellow-400"
  }, "Session Summary"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-gray-400 hover:text-gray-200"
  }, /*#__PURE__*/React.createElement(X, {
    size: 18
  }))), camp && /*#__PURE__*/React.createElement("div", {
    className: "text-gray-400 text-sm mb-4 italic"
  }, camp.adventure_title), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-3 mb-4"
  }, [{
    label: 'Turns',
    value: session.turn_count
  }, {
    label: 'Scenes',
    value: session.scene_count
  }, {
    label: 'XP',
    value: char ? char.xp.total : 0
  }, {
    label: 'Credits',
    value: char ? char.credits + ' Cr' : '0'
  }].map(stat => /*#__PURE__*/React.createElement("div", {
    key: stat.label,
    className: "bg-gray-800 rounded-lg p-3 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-400 uppercase tracking-wide mb-1"
  }, stat.label), /*#__PURE__*/React.createElement("div", {
    className: "text-gray-100 font-bold text-lg"
  }, stat.value)))), camp && camp.spine && /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2"
  }, "Campaign Spine"), [{
    label: 'ACT 1',
    text: camp.spine.act1_goal
  }, {
    label: 'ACT 2',
    text: camp.spine.act2_complication
  }, {
    label: 'ACT 3',
    text: camp.spine.act3_convergence
  }].map(act => /*#__PURE__*/React.createElement("div", {
    key: act.label,
    className: "flex items-start gap-2 mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-yellow-400 w-10 flex-shrink-0"
  }, act.label), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-400"
  }, act.text)))), camp && camp.journal && camp.journal.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2"
  }, "Journal Highlights"), [...camp.journal].slice(-5).reverse().map((entry, i) => /*#__PURE__*/React.createElement(JournalEntry, {
    key: i,
    entry: entry
  }))), char && /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2"
  }, "Character Status"), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-800 rounded-lg p-3 text-xs text-gray-300 flex flex-wrap gap-3"
  }, /*#__PURE__*/React.createElement("span", null, "STA: ", char.stamina.current, "/", char.stamina.max), /*#__PURE__*/React.createElement("span", null, "EC: ", char.seu.total), char.status_effects.length > 0 && /*#__PURE__*/React.createElement("span", null, "Status: ", char.status_effects.join(', ')))), showExport && /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2"
  }, "Copy to resume later:"), /*#__PURE__*/React.createElement("textarea", {
    readOnly: true,
    value: exportJson,
    className: "w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-xs text-gray-300 font-mono h-24 resize-none",
    onClick: e => e.target.select()
  })), confirmNew && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-900 border border-red-700 rounded-lg p-4 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-red-200 text-sm mb-3"
  }, "Start a new adventure? All progress will be lost unless you saved a checkpoint."), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onNewAdventure,
    className: "bg-red-600 text-white font-bold py-1.5 px-4 rounded hover:bg-red-500 text-sm"
  }, "Confirm"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfirmNew(false),
    className: "bg-gray-700 text-gray-300 py-1.5 px-4 rounded hover:bg-gray-600 text-sm"
  }, "Cancel"))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSaveAndExport,
    className: "flex-1 bg-gray-700 text-gray-200 font-bold py-2 rounded hover:bg-gray-600 text-sm"
  }, "Save & Continue Later"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfirmNew(true),
    className: "flex-1 bg-gray-600 text-white font-bold py-2 rounded hover:bg-gray-500 text-sm"
  }, "New Adventure"))));
}

// SECTION 25d -- END SESSION BUTTON COMPONENT
function EndSessionButton({
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: "flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-600 text-gray-400 hover:border-red-500 hover:text-red-400 cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", null, "Save and Quit"));
}

// SECTION 26c -- SUMMARIZE BUTTON COMPONENT
function SummarizeButton({
  gameState,
  setGameState,
  sessionToken,
  onToast,
  onError,
  fullWidth
}) {
  const [compressing, setCompressing] = useState(false);
  const visible = gameState.session.scene_count >= 15;
  if (!visible) return null;
  const handleCompress = async () => {
    setCompressing(true);
    try {
      const res = await fetch('/api/game/compress', {
        method: 'POST',
        headers: {
          'X-Session-Token': sessionToken
        }
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        onError({
          code: `HTTP_${res.status}`,
          message: (body && body.error) || `Compression failed: ${res.statusText}`,
          recoverable: true,
          retry_action: null
        });
      } else {
        const data = await res.json();
        setGameState(prev => adoptServerState(prev, data.state));
        if (onToast) onToast('Campaign history compressed. Context optimized.');
      }
    } catch (_) {
      onError({
        code: 'NETWORK_ERROR',
        message: 'Network error during compression',
        recoverable: true,
        retry_action: null
      });
    }
    setCompressing(false);
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: handleCompress,
    disabled: compressing || gameState.scene.history_compressed,
    className: `flex items-center gap-1.5 text-xs px-2 py-1.5 rounded border ${fullWidth ? 'w-full' : ''} ${gameState.scene.history_compressed ? 'border-green-700 text-green-500 cursor-not-allowed' : compressing ? 'border-gray-600 text-gray-500 cursor-wait' : 'border-gray-600 text-gray-300 hover:border-green-500 hover:text-green-300 cursor-pointer'}`
  }, compressing ? /*#__PURE__*/React.createElement(Loader, {
    size: 10,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(RefreshCw, {
    size: 10
  }), /*#__PURE__*/React.createElement("span", null, gameState.scene.history_compressed ? 'History Compressed' : compressing ? 'Compressing...' : 'Summarize Campaign'));
}

// SECTION 29e -- RULES LOG PANEL COMPONENT
function RulesLogPanel({
  rulesLog
}) {
  const bottomRef = useRef(null);
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: 'smooth'
      });
    }
  }, [rulesLog.length]);
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col flex-1 overflow-hidden",
    style: {
      minWidth: '18rem'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-3"
  }, rulesLog.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-600 italic mt-4 text-center"
  }, "No rules activity yet.", /*#__PURE__*/React.createElement("br", null), "Events appear here after each turn.") : rulesLog.map(log => /*#__PURE__*/React.createElement("div", {
    key: log.id
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-500 uppercase tracking-widest mb-1"
  }, "Turn ", log.turn), /*#__PURE__*/React.createElement("ul", {
    className: "flex flex-col gap-0.5"
  }, log.entries.map((entry, i) => {
    const txt = entry.text || '';
    // Determine color for the main text
    let textClass = 'text-gray-300';
    if (/\bHIT\b/.test(txt)) textClass = 'text-green-400';else if (/\bMISS\b/.test(txt)) textClass = 'text-red-400';else if (/Stamina (lost|restored)/i.test(txt)) textClass = 'text-orange-300';else if (/Experience awarded/i.test(txt)) textClass = 'text-yellow-300';else if (/Status (applied|cleared):/i.test(txt)) textClass = 'text-orange-400';else if (/DM note:/i.test(txt)) textClass = 'text-blue-300 italic';
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      className: "text-xs leading-snug"
    }, /*#__PURE__*/React.createElement("span", {
      className: textClass
    }, txt), entry.src && /*#__PURE__*/React.createElement("span", {
      className: "text-gray-500"
    }, entry.src));
  })))), /*#__PURE__*/React.createElement("div", {
    ref: bottomRef
  })));
}

// SECTION 17 -- GAME SCREEN (replaces placeholder from PACKET_1_2)
function GameScreen({
  gameState,
  setGameState,
  sessionToken,
  firstHookOpening,
  onNewAdventure,
  saveCode
}) {
  const [gameError, setGameError] = useState(null);
  const [oocNote, setOocNote] = useState(null);
  const [toast, setToast] = useState(null);
  const [fillText, setFillText] = useState('');
  const [showJournal, setShowJournal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [tooltipRegistry, setTooltipRegistry] = useState({
    ...TOOLTIP_GLOSSARY
  });
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarShine, setSidebarShine] = useState(!isDesktop);
  const [sidebarTab, setSidebarTab] = useState(isDesktop ? 'rules' : 'player');
  const [rulesLog, setRulesLog] = useState(() => {
    try {
      const s = localStorage.getItem('sf_gm_log');
      return s ? JSON.parse(s) : [];
    } catch (_) {
      return [];
    }
  });
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsShine, setActionsShine] = useState(true);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [combatResolved, setCombatResolved] = useState(false);
  const prevInCombatRef = useRef(false);
  const {
    submitTurn,
    loading,
    streamingNarrative,
    currentChoices,
    messages,
    addDMMessage,
    setCurrentChoices,
    latestDiceRolls,
    latestTooltipTerms,
    handleTypewriterComplete
  } = useDMTurn({
    gameState,
    setGameState,
    sessionToken,
    onError: setGameError,
    onOocNote: setOocNote,
    onTurnComplete: (result, newState) => {
      const su = result.state_updates || {};
      const newChar = newState.character;
      const entries = [];

      // 1. Dice rolls
      const diceRolls = result.dice_rolls || [];
      for (const dr of diceRolls) {
        const outcome = dr.success ? 'HIT' : 'MISS';
        const base = `${dr.description}: rolled ${dr.roll} against a target of ${dr.target}, ${outcome}.`;
        const src = dr.rule_source ? ` (${dr.rule_source})` : '';
        entries.push({
          text: base,
          src
        });
      }

      // 2. Stamina change
      if (su.stamina_delta && su.stamina_delta !== 0 && newChar) {
        const cur = newChar.stamina.current;
        const max = newChar.stamina.max;
        if (su.stamina_delta > 0) {
          entries.push({
            text: `Stamina restored: +${su.stamina_delta} STA (now ${cur}/${max}).`
          });
        } else {
          entries.push({
            text: `Stamina lost: ${Math.abs(su.stamina_delta)} STA (now ${cur}/${max}).`
          });
        }
      }

      // 3. SEU change
      if (su.seu_delta && su.seu_delta !== 0 && newChar) {
        const remaining = newChar.seu ? newChar.seu.total : 0;
        const src = su.seu_source || 'power supply';
        entries.push({
          text: `Energy used: ${Math.abs(su.seu_delta)} EC from ${src} (${remaining} EC remaining).`
        });
      }

      // 4. Status changes
      if (Array.isArray(su.status_add)) {
        su.status_add.forEach(s => {
          if (s) entries.push({
            text: `Status applied: ${s}.`
          });
        });
      }
      if (Array.isArray(su.status_remove)) {
        su.status_remove.forEach(s => {
          if (s) entries.push({
            text: `Status cleared: ${s}.`
          });
        });
      }

      // 5. XP award
      if (su.xp_delta && su.xp_delta > 0 && newChar) {
        entries.push({
          text: `Experience awarded: +${su.xp_delta} XP (${newChar.xp.total} total).`
        });
      }

      // 6. Credits change
      if (su.credits_delta && su.credits_delta !== 0 && newChar) {
        if (su.credits_delta > 0) {
          entries.push({
            text: `Credits received: +${su.credits_delta} Cr (${newChar.credits} total).`
          });
        } else {
          entries.push({
            text: `Credits spent: ${Math.abs(su.credits_delta)} Cr (${newChar.credits} remaining).`
          });
        }
      }

      // 7. Inventory changes
      if (Array.isArray(su.inventory_add)) {
        su.inventory_add.forEach(item => {
          if (item) entries.push({
            text: `Item acquired: ${item}.`
          });
        });
      }
      if (Array.isArray(su.inventory_remove)) {
        su.inventory_remove.forEach(item => {
          if (item) entries.push({
            text: `Item removed: ${item}.`
          });
        });
      }

      // 8. OOC note
      if (result.ooc_note) {
        entries.push({
          text: `DM note: ${result.ooc_note}`
        });
      }

      // 9. Warn if this turn used a repaired (truncated) response
      if (result._repaired) {
        entries.push({
          text: '[System] Response was truncated; mechanical updates skipped this turn.'
        });
      }
      // 10. Warn if the rules engine corrected a contradiction this turn
      if (result.patched) {
        entries.push({
          text: '[System] The rules engine corrected this turn\'s result.'
        });
      }
      if (entries.length === 0) {
        entries.push({
          text: 'No mechanical events this turn.'
        });
      }
      const entry = {
        id: crypto.randomUUID(),
        turn: gameState.session.turn_count + 1,
        timestamp: Date.now(),
        entries
      };
      setRulesLog(prev => {
        const next = [...prev, entry];
        return next.length > 100 ? next.slice(next.length - 100) : next;
      });
    }
  });
  useEffect(() => {
    setActionsOpen(false);
  }, [currentChoices]);
  useEffect(() => {
    if (loading) setActionsOpen(false);
  }, [loading]);
  const showHint = gameState.session.turn_count === 0;
  const inCombat = gameState.scene.in_combat;
  const snapshots = gameState.meta.snapshots || [];
  const campaign = gameState.campaign;
  const adventureId = campaign ? campaign.adventure_id : null;
  const sceneCount = gameState.session ? gameState.session.scene_count : 0;
  const turnCount = gameState.session ? gameState.session.turn_count : 0;
  const actLabel = sceneCount <= 5 ? 'Act 1' : sceneCount <= 12 ? 'Act 2' : 'Act 3';
  const currentModScene = ADVENTURE_MODULES[adventureId]?.scenes?.find(s => s.id === campaign?.current_scene_id);
  const sceneHeader = currentModScene?.title || (gameState.scene.header && gameState.scene.header.trim() ? gameState.scene.header : null) || ADVENTURE_LIBRARY.find(a => a.id === adventureId)?.title || '';
  const formatTime = ts => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };
  const handleChoice = useCallback(choice => {
    setCurrentChoices([]);
    submitTurn(choice.text, choice.id);
  }, [submitTurn, setCurrentChoices]);
  useEffect(() => {
    if (firstHookOpening) {
      submitTurn('BEGIN: ' + firstHookOpening);
    }
  }, []); // eslint-disable-line -- fire only on mount

  useEffect(() => {
    if (latestTooltipTerms && latestTooltipTerms.length > 0) {
      setTooltipRegistry(prev => {
        const updated = {
          ...prev
        };
        latestTooltipTerms.forEach(({
          term,
          definition
        }) => {
          if (term && definition) updated[term.toLowerCase()] = definition;
        });
        return updated;
      });
    }
  }, [latestTooltipTerms]);

  // Detect in_combat false → true transition for combat resolved banner
  useEffect(() => {
    const wasInCombat = prevInCombatRef.current;
    const nowInCombat = !!gameState.scene.in_combat;
    if (wasInCombat && !nowInCombat) {
      setCombatResolved(true);
      setTimeout(() => setCombatResolved(false), 4000);
    }
    prevInCombatRef.current = nowInCombat;
  }, [gameState.scene.in_combat]);

  // Persist GM Log to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('sf_gm_log', JSON.stringify(rulesLog));
    } catch (_) {}
  }, [rulesLog]);
  const handleSaveSnapshot = async () => {
    const snapshots = await createSnapshot(sessionToken);
    if (snapshots) {
      setGameState(prev => ({
        ...prev,
        meta: {
          ...prev.meta,
          snapshots
        }
      }));
      setToast('Checkpoint saved!');
    } else {
      setGameError({
        code: 'NETWORK_ERROR',
        message: 'Could not save a checkpoint.',
        recoverable: true,
        retry_action: null
      });
    }
  };
  const handleSaveAndQuit = () => {
    try {
      localStorage.setItem('sf_game_save', JSON.stringify({
        ...gameState,
        messages,
        _autoChoices: currentChoices
      }));
    } catch (_) {}
    onNewAdventure();
  };
  const handleDeleteSnapshot = async snapId => {
    await deleteSnapshotOnServer(sessionToken, snapId);
    setGameState(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        snapshots: prev.meta.snapshots.filter(s => s.id !== snapId)
      }
    }));
    setDeleteConfirmId(null);
  };
  const handleConfirmRestore = async () => {
    if (!confirmRestore) return;
    const restored = await restoreSnapshot(sessionToken, confirmRestore.id);
    if (restored) setGameState(prev => adoptServerState(prev, restored));
    setConfirmRestore(null);
    setShowSnapshots(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "sf-game-root flex h-screen bg-gray-900 text-gray-100 overflow-hidden"
  }, sidebarOpen && /*#__PURE__*/React.createElement("div", {
    className: "sf-sidebar-backdrop",
    onClick: () => setSidebarOpen(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: `sf-sidebar ${sidebarOpen ? 'w-72 border-r border-gray-700' : 'w-0'} flex-shrink-0 flex flex-col bg-gray-800 overflow-hidden transition-[width] duration-200`
  }, saveCode && /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 border-b border-gray-700 flex-shrink-0",
    style: {
      minWidth: '18rem'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-semibold uppercase tracking-widest text-gray-500"
  }, "Your Game Code:"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-mono font-bold text-yellow-400"
  }, formatSaveCodeDisplay(saveCode))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-3 h-10 border-b border-gray-700 flex-shrink-0",
    style: {
      minWidth: '18rem'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1 flex items-center gap-1.5"
  }, gameState.character ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded truncate"
  }, gameState.character.display_name || gameState.character.name), /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded flex-shrink-0"
  }, gameState.character.race)) : /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-600"
  }, "No Character")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSidebarOpen(false),
    className: "text-gray-500 hover:text-gray-300 ml-2 flex-shrink-0 cursor-pointer",
    "aria-label": "Collapse sidebar"
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-shrink-0 border-b border-gray-700",
    style: {
      minWidth: '18rem'
    }
  }, ['player', 'rules'].map(tab => /*#__PURE__*/React.createElement("button", {
    key: tab,
    onClick: () => setSidebarTab(tab),
    className: `flex-1 h-8 text-xs font-semibold uppercase tracking-widest cursor-pointer transition-colors ${sidebarTab === tab ? 'text-white bg-gray-800 border-b-2 border-yellow-400' : 'text-gray-500 bg-gray-900 hover:text-gray-300'}`
  }, tab === 'player' ? 'Player' : 'GM'))), sidebarTab === 'player' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto overflow-x-hidden flex flex-col w-full"
  }, /*#__PURE__*/React.createElement(CharacterSheet, {
    character: gameState.character,
    naked: true
  }), inCombat && /*#__PURE__*/React.createElement("div", {
    className: "border-t border-gray-700"
  }, /*#__PURE__*/React.createElement(CombatPanel, {
    combatState: gameState.scene.combat_state,
    diceRolls: latestDiceRolls
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-shrink-0 p-2 flex flex-col gap-1.5 w-full"
  }, snapshots.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowSnapshots(s => !s),
    className: "flex items-center gap-1.5 text-xs px-2 py-1.5 rounded border border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-300 cursor-pointer w-full"
  }, /*#__PURE__*/React.createElement("span", null, "Checkpoints (", snapshots.length, ")")), showSnapshots && /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-full left-0 mb-1 bg-gray-800 border border-gray-600 rounded shadow-lg z-40 w-full"
  }, [...snapshots].reverse().map(snap => /*#__PURE__*/React.createElement("div", {
    key: snap.id,
    className: "flex items-center border-b border-gray-700 last:border-0"
  }, deleteConfirmId === snap.id ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 px-2 py-2 w-full"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-300 flex-1"
  }, "Delete?"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDeleteSnapshot(snap.id),
    className: "p-1 rounded text-green-400 hover:bg-green-900 cursor-pointer",
    title: "Confirm delete"
  }, /*#__PURE__*/React.createElement(Check, {
    size: 12
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDeleteConfirmId(null),
    className: "p-1 rounded text-gray-400 hover:bg-gray-700 cursor-pointer",
    title: "Cancel"
  }, /*#__PURE__*/React.createElement(X, {
    size: 12
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setDeleteConfirmId(null);
      setConfirmRestore(snap);
    },
    className: "flex-1 text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 cursor-pointer"
  }, formatTime(snap.timestamp), " Turn ", snap.turn_count, " Scene ", snap.scene_count), /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      setDeleteConfirmId(snap.id);
    },
    className: "px-2 py-2 text-gray-600 hover:text-red-400 cursor-pointer flex-shrink-0",
    title: "Delete checkpoint"
  }, /*#__PURE__*/React.createElement(Trash2, {
    size: 11
  }))))))), /*#__PURE__*/React.createElement(SummarizeButton, {
    gameState: gameState,
    setGameState: setGameState,
    sessionToken: sessionToken,
    onToast: setToast,
    onError: () => {},
    fullWidth: true
  }))), sidebarTab === 'rules' && /*#__PURE__*/React.createElement(RulesLogPanel, {
    rulesLog: rulesLog
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex flex-col min-h-0 min-w-0 overflow-x-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sf-top-bar h-10 flex items-center px-3 gap-2 flex-shrink-0 sticky top-0 z-10"
  }, !sidebarOpen && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setSidebarOpen(true);
      setSidebarShine(false);
    },
    className: `text-gray-400 hover:text-gray-200 cursor-pointer flex-shrink-0 p-1 ${sidebarShine ? 'gold-shine' : ''}`,
    "aria-label": "Open sidebar"
  }, /*#__PURE__*/React.createElement(PanelLeft, {
    size: 16
  })), sceneHeader && /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded truncate min-w-0 flex-1"
  }, sceneHeader), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 flex-shrink-0 ml-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded whitespace-nowrap"
  }, actLabel), /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded whitespace-nowrap"
  }, "Scene ", sceneCount), /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded whitespace-nowrap"
  }, "Turn ", turnCount))), gameError && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-900 border-b border-red-700 px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2 flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement(AlertCircle, {
    size: 14,
    className: "text-red-400 flex-shrink-0 mt-0.5"
  }), gameError.code && /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-red-400 bg-red-800 px-1.5 py-0.5 rounded font-mono flex-shrink-0"
  }, gameError.code), /*#__PURE__*/React.createElement("span", {
    className: "text-red-200 text-xs leading-relaxed truncate"
  }, gameError.message)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-shrink-0"
  }, gameError.recoverable && gameError.retry_action && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setGameError(null);
      gameError.retry_action();
    },
    className: "text-xs bg-yellow-400 text-gray-900 font-bold px-2 py-1 rounded hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer"
  }, "Retry"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setGameError(null),
    className: "text-red-400 hover:text-red-200 focus:outline-none cursor-pointer",
    "aria-label": "Dismiss error"
  }, /*#__PURE__*/React.createElement(X, {
    size: 14
  })))), /*#__PURE__*/React.createElement(MessageHistory, {
    messages: messages,
    tooltipRegistry: tooltipRegistry,
    isLoading: loading,
    streamingNarrative: streamingNarrative,
    onStreamingComplete: handleTypewriterComplete
  }), combatResolved && /*#__PURE__*/React.createElement("div", {
    className: "mx-4 mb-2 bg-gray-800 border border-yellow-600 rounded-lg px-4 py-3 text-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-yellow-400 font-bold text-sm uppercase tracking-widest"
  }, "Combat Resolved")), /*#__PURE__*/React.createElement(ChoiceMenu, {
    choices: currentChoices,
    onChoiceSelect: handleChoice,
    disabled: false,
    actionsOpen: actionsOpen,
    onToggleActions: () => {
      setActionsOpen(o => !o);
      setActionsShine(false);
    },
    shine: actionsShine,
    loading: loading,
    actLabel: actLabel,
    sceneCount: sceneCount,
    turnCount: turnCount,
    character: gameState.character
  }), /*#__PURE__*/React.createElement(PlayerInput, {
    onSubmit: submitTurn,
    disabled: loading,
    showHint: showHint,
    externalFill: fillText,
    onExternalFillConsumed: () => setFillText('')
  })), /*#__PURE__*/React.createElement(Toast, {
    message: toast,
    onDismiss: () => setToast(null)
  }), showJournal && /*#__PURE__*/React.createElement(JournalPanel, {
    journal: gameState.campaign ? gameState.campaign.journal : [],
    campaign: gameState.campaign,
    sceneCount: sceneCount,
    onClose: () => setShowJournal(false)
  }), showSummary && /*#__PURE__*/React.createElement(SummaryCard, {
    gameState: gameState,
    onNewAdventure: () => {
      onNewAdventure();
      setShowSummary(false);
    },
    onClose: () => setShowSummary(false)
  }), confirmRestore && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-sm w-full mx-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-gray-100 font-bold mb-2"
  }, "Restore Checkpoint?"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-400 text-sm mb-4"
  }, "Restore to Turn ", confirmRestore.turn_count, ", Scene ", confirmRestore.scene_count, "? This will undo all progress since this checkpoint."), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleConfirmRestore,
    className: "flex-1 bg-yellow-400 text-gray-900 font-bold py-2 rounded hover:bg-yellow-300 text-sm cursor-pointer"
  }, "Restore"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfirmRestore(null),
    className: "flex-1 bg-gray-700 text-gray-300 py-2 rounded hover:bg-gray-600 text-sm cursor-pointer"
  }, "Cancel")))));
}

// SECTION 5 -- API CONSTANTS
const API_CONSTANTS = {
  MAX_TOKENS: 4096,
  // regular DM turns — 2048 was too tight, JSON gets cut off mid-response
  SESSION_ZERO_MAX_TOKENS: 4096,
  // session zero needs more room for 3 hooks + spine + npcs
  MAX_RAW_TURNS: 6
  // max user/assistant pairs sent as raw history; older turns rely on scene_summary
};

// SECTION 6 -- (removed) buildSystemPrompt / buildCompressedSystemPrompt /
// buildSessionZeroPrompt / compressCampaignHistory all built a prompt and
// called /api/chat client-side. Prompt building is server-side now
// (server/services/promptBuilder.js); the browser calls /api/turn,
// /api/game/new and /api/game/compress instead and never builds a prompt.


// SECTION 6c -- NARRATIVE SANITIZER
// Hard backstop: strips mechanical content the model may leak into the narrative field.
// This runs client-side before the message is stored or displayed.
function sanitizeNarrative(text) {
  if (!text || typeof text !== 'string') return text;
  // Split into sentences (keep punctuation), filter each one
  const MECH_PATTERNS = [/\bd\d+\b/i,
  // dice: d100, d10, d6, d20, etc.
  /\brolled?\s+\d+\b/i,
  // "rolled 45" / "roll 45"
  /\btarget\s+(number\s+)?of\s+\d+/i,
  // "target of 65" / "target number of 65"
  /\b\d+\s*%\s*(chance|target|check|roll)/i,
  // "65% chance", "65% target"
  /\((\d+)\s*vs\.?\s*(\d+)\)/i,
  // "(42 vs 65)"
  /\bskill\s+check\s+(succeed|fail|pass)/i,
  // "skill check succeeds"
  /\b(succeed|fail|pass)s?\s+(?:the|a)?\s*(?:skill\s+)?check/i, /check\s+target/i, /\broll\s+(d\d+|against|under|over)\b/i,
  // "roll d100", "roll against", "roll under"
  /\binitiative\s+(modifier|roll|score)\b/i, /\bSTA\s+threshold/i, /target\s+number\b/i];
  // Process paragraph by paragraph so newlines are preserved
  const paragraphs = text.split(/(\n+)/);
  const cleaned = paragraphs.map(chunk => {
    // Pass newline-only chunks through unchanged
    if (/^\n+$/.test(chunk)) return chunk;
    // Within each paragraph, filter sentence by sentence
    const sentences = chunk.split(/(?<=[.!?])\s+/);
    const kept = sentences.filter(s => !MECH_PATTERNS.some(re => re.test(s)));
    return kept.join(' ').trim();
  }).filter(chunk => chunk !== '' || /^\n+$/.test(chunk));
  const result = cleaned.join('').trim();
  return result || text;
}

// SECTION 7 -- (removed) validateDMResponse / validateSessionZeroResponse /
// repairTruncatedJSON: validation and truncation repair moved to the server
// (server/services/modelSchema.js), which is the only thing that ever sees
// the model's raw reply now. A repaired turn still shows up on the wire as
// astra_turn._repaired.

// SECTION 8 -- callDM FUNCTION (streaming)
// One call per turn: POST /api/turn with {turn, text, choice_id}. The server
// streams internally from the AI provider but sends the browser only
// keep-alive astra_progress pings, the final astra_turn result, and
// astra_quota — never the model's raw text, which is unresolved until the
// server has applied its own rolls.
async function callTurn(sessionToken, {
  turn,
  text,
  choice_id
}, onError, onProgress) {
  const retry = () => callTurn(sessionToken, {
    turn,
    text,
    choice_id
  }, onError, onProgress);
  const makeRequest = async () => {
    const response = await fetch('/api/turn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionToken,
        'X-Astra-Protocol': '2'
      },
      body: JSON.stringify({
        turn,
        text,
        choice_id
      })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      // 429 is either the day's free AI budget running out (the server sends
      // a reset timestamp) or our own per-session throttle.
      if (response.status === 429) {
        if (body && body.quota) publishQuota(body.quota);
        const outOfQuota = body && body.code === 'QUOTA_EXHAUSTED';
        const busy = body && body.code === 'PROVIDER_BUSY';
        const waitSeconds = body && body.retryAfterSeconds;
        onError({
          code: outOfQuota ? 'DAILY LIMIT' : 'BUSY',
          message: outOfQuota ? `Today's free AI turns are used up. You can play again at ${formatResetTime(body.resetAt)} — your game is saved.` : busy && waitSeconds ? `The AI is busy right now. Try again in about ${waitSeconds} second${waitSeconds === 1 ? '' : 's'}.` : 'Too many turns in a short time. Try again shortly.',
          recoverable: !outOfQuota,
          retry_action: outOfQuota ? null : retry
        });
        return null;
      }
      // A retired endpoint (the pre-cutover /api/chat and PUT state routes
      // both answer 410 now) is never a one-off failure a retry could fix —
      // only a reload picking up the current page does.
      if (response.status === 410) {
        onError({
          code: (body && body.code) || 'ENDPOINT_RETIRED',
          message: (body && body.error) || 'This game has updated. Reload the page to keep playing.',
          recoverable: false,
          retry_action: null
        });
        return null;
      }
      // The server and the browser have drifted out of sync; reloading is
      // the only way forward, so these four never offer a retry.
      if (response.status === 409 && body && ['STALE_TURN', 'CLIENT_OUTDATED', 'GAME_OVER', 'UNSUPPORTED_SAVE'].includes(body.code)) {
        onError({
          code: body.code,
          message: (body.code === 'GAME_OVER' || body.code === 'CLIENT_OUTDATED' || body.code === 'UNSUPPORTED_SAVE') ? body.error : 'This game fell out of sync. Reload the page to continue.',
          recoverable: false,
          retry_action: null
        });
        return null;
      }
      if (response.status === 409 && body && body.code === 'TURN_IN_PROGRESS') {
        onError({
          code: body.code,
          message: 'Still finishing the last turn.',
          recoverable: true,
          retry_action: retry
        });
        return null;
      }
      const codeMap = {
        401: 'HTTP_401',
        500: 'HTTP_500'
      };
      const code = codeMap[response.status] || `HTTP_${response.status}`;
      onError({
        code,
        message: `API error ${response.status}: ${response.statusText}`,
        recoverable: response.status !== 401,
        retry_action: response.status !== 401 ? retry : null
      });
      return null;
    }

    // Read the SSE stream: astra_progress pings (ignored beyond the
    // keep-alive callback), astra_error (surfaced through onError), the
    // resolved astra_turn result, and astra_quota.
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result = null;
    let sawError = false;
    while (true) {
      const {
        done,
        value
      } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, {
        stream: true
      });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        try {
          const event = JSON.parse(data);
          if (event.type === 'astra_progress' && onProgress) onProgress();
          if (event.type === 'astra_turn') result = event;
          if (event.type === 'astra_quota') publishQuota(event.quota);
          if (event.type === 'astra_error') {
            sawError = true;
            if (event.quota) publishQuota(event.quota);
            // A quota event travels as astra_error (SSE headers are already
            // committed by the time the server knows) instead of an HTTP
            // 429; format it the same way the old 429 JSON body was.
            if (event.code === 'QUOTA_EXHAUSTED' || event.code === 'PROVIDER_BUSY') {
              const outOfQuota = event.code === 'QUOTA_EXHAUSTED';
              const waitSeconds = event.retryAfterSeconds;
              onError({
                code: outOfQuota ? 'DAILY LIMIT' : 'BUSY',
                message: outOfQuota ? `Today's free AI turns are used up. You can play again at ${formatResetTime(event.resetAt)} — your game is saved.` : waitSeconds ? `The AI is busy right now. Try again in about ${waitSeconds} second${waitSeconds === 1 ? '' : 's'}.` : 'Too many turns in a short time. Try again shortly.',
                recoverable: !outOfQuota,
                retry_action: outOfQuota ? null : retry
              });
            } else {
              onError({
                code: event.code || 'TURN_ERROR',
                message: event.message || 'The game master could not answer that turn.',
                recoverable: event.retryable !== false,
                retry_action: event.retryable !== false ? retry : null
              });
            }
          }
        } catch (_) {}
      }
    }
    if (sawError) return null;
    if (!result) {
      onError({
        code: 'EMPTY_RESPONSE',
        message: 'Empty response from the game server.',
        recoverable: true,
        retry_action: retry
      });
      return null;
    }
    return result;
  };
  try {
    return await makeRequest();
  } catch (networkErr) {
    // Silent retry once on network error
    try {
      return await makeRequest();
    } catch (retryErr) {
      onError({
        code: 'NETWORK_ERROR',
        message: 'Network error: could not reach the game master.',
        recoverable: true,
        retry_action: retry
      });
      return null;
    }
  }
}

// SECTION 9 -- (removed) initializeSession: building the initial
// character/campaign state from the session-zero response is now
// POST /api/game/begin's job (server/services/stateStore.js), which the
// browser adopts via adoptServerState.

// SECTION 10 -- LOADING TIDBITS COMPONENT
const LORE_TIDBITS = ['The Frontier spans seventeen inhabited star systems united under the Stellar Frontier Coalition.', 'Several intelligent species call the Frontier home -- humans, krix, moluuns, skraths, and others -- each bringing unique biological advantages to field operations.', 'The Vrethak are a serpentine race of unknown origin whose only known motivation is the destruction of all civilization.', 'Kethara Authority is the SFC\'s elite law enforcement agency, operating in the shadows between political systems.', 'Credits are the universal currency of the Frontier -- one credit buys a basic meal, one thousand buys a used skimmer.', 'Stamina Points represent a character\'s ability to absorb punishment. When they reach zero, the character falls unconscious.', 'The Nethaan system, home of planet Dravoss, sits on the frontier of explored space -- and beyond it lies the unknown.', 'Grak are kangaroo-like beings from the Rim with explosive physical strength. Their Spring Charge lets them leap 20 meters into combat.', 'Chiivari are small, sharp traders with a gift for negotiation. Their inner eyelids protect against eye irritants, and they learn languages with unusual speed.', 'Ossivaan are six-legged fungal beings with an extraordinary sense of smell. They are natural trackers and speak four languages before most species learn two.'];
function SpaceLoader({
  size = 144
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "relative flex items-center justify-center",
    style: {
      width: size,
      height: size
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 rounded-full animate-spin",
    style: {
      border: '2px solid transparent',
      borderTopColor: '#facc15',
      borderRightColor: 'rgba(250,204,21,0.3)',
      animationDuration: '2s'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute rounded-full animate-spin",
    style: {
      width: size * 0.64,
      height: size * 0.64,
      border: '1px solid transparent',
      borderBottomColor: '#facc15',
      borderLeftColor: 'rgba(250,204,21,0.25)',
      animationDuration: '1.3s',
      animationDirection: 'reverse'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute",
    style: {
      width: size * 0.42,
      height: 1,
      background: 'rgba(250,204,21,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute",
    style: {
      width: 1,
      height: size * 0.42,
      background: 'rgba(250,204,21,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "rounded-full animate-pulse",
    style: {
      width: 6,
      height: 6,
      background: '#facc15'
    }
  }));
}
function LoadingScreen() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * LORE_TIDBITS.length));
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % LORE_TIDBITS.length), 5000);
    return () => clearInterval(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-8 px-6"
  }, /*#__PURE__*/React.createElement(SpaceLoader, {
    size: 144
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-400 text-sm italic text-center max-w-sm leading-relaxed transition-opacity duration-500"
  }, LORE_TIDBITS[idx]));
}
function LoadingTidbits() {
  return /*#__PURE__*/React.createElement(LoadingScreen, null);
}

// Converts **bold**, *italic*, and strips other markdown artifacts to JSX spans
function renderInlineMarkdown(text) {
  if (!text) return null;
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0,
    match,
    key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2]) parts.push(/*#__PURE__*/React.createElement("strong", {
      key: key++
    }, match[2]));else if (match[3]) parts.push(/*#__PURE__*/React.createElement("em", {
      key: key++
    }, match[3]));else if (match[4]) parts.push(/*#__PURE__*/React.createElement("code", {
      key: key++
    }, match[4]));
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// SECTION 11 -- HOOK ROW COMPONENT
function HookRow({
  hook,
  pulsing,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: `sf-card-btn group w-full text-left rounded-xl border px-5 py-4 cursor-pointer transition-colors bg-gray-800 border-gray-700 hover:bg-yellow-900/20 hover:border-yellow-500 ${pulsing ? 'sf-card-select' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm leading-relaxed text-gray-400"
  }, (hook.opening || '').split(/\n+/).map((para, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: i > 0 ? 'mt-2' : ''
  }, renderInlineMarkdown(para)))));
}

// SECTION 12 -- SESSION ZERO SCREEN
function SessionZeroScreen({
  hooks,
  error,
  onHookSelect,
  missionTitle,
  onBack
}) {
  const [szState, setSzState] = useState('HOOKS');
  const [pulsingIdx, setPulsingIdx] = useState(null);
  const touchMovedRef = useRef(false);
  const handleHookClick = idx => {
    if (touchMovedRef.current) return;
    setPulsingIdx(idx);
    setTimeout(() => {
      setSzState('TRANSITION');
      setTimeout(() => onHookSelect(idx), 800);
    }, 520);
  };
  if (szState === 'TRANSITION') {
    return /*#__PURE__*/React.createElement(LoadingScreen, null);
  }
  if (error) {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen bg-gray-900 flex flex-col items-center justify-center px-6"
    }, /*#__PURE__*/React.createElement(AlertCircle, {
      size: 40,
      className: "text-red-400 mb-4"
    }), /*#__PURE__*/React.createElement("div", {
      className: "text-red-400 font-bold text-lg mb-2"
    }, "Session Zero Failed"), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-400 text-sm text-center max-w-md"
    }, error.message), error.recoverable && error.retry_action && /*#__PURE__*/React.createElement("button", {
      onClick: () => error.retry_action(),
      className: "mt-4 bg-yellow-400 text-gray-900 font-bold py-2 px-6 rounded hover:bg-yellow-300"
    }, "Retry"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-gray-900 flex flex-col px-6 py-8 max-w-2xl mx-auto w-full",
    onTouchStart: () => {
      touchMovedRef.current = false;
    },
    onTouchMove: () => {
      touchMovedRef.current = true;
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-extrabold text-yellow-400 tracking-wide"
  }, "Choose Opening Scene")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-3"
  }, hooks.map((hook, idx) => /*#__PURE__*/React.createElement(HookRow, {
    key: idx,
    hook: hook,
    pulsing: pulsingIdx === idx,
    onClick: () => handleHookClick(idx)
  }))), onBack && /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    className: "mt-6 text-xs text-gray-500 hover:text-gray-300 underline text-center w-full cursor-pointer"
  }, "Back to Name Character"));
}

// SECTION 4 -- APP COMPONENT

function App() {
  const [gameState, setGameState] = useState(INITIAL_STATE);
  const [sessionToken, setSessionToken] = useState(null);
  const [selectedCharId, setSelectedCharId] = useState(null);
  const [selectedCharDisplayName, setSelectedCharDisplayName] = useState(null);
  const [selectedAdventureId, setSelectedAdventureId] = useState(null);
  const [phase, setPhase] = useState('LANDING');
  const [setupInitialStep, setSetupInitialStep] = useState('CAMPAIGN');
  const [setupKey, setSetupKey] = useState(0);
  const goToSetup = useCallback((step = 'CAMPAIGN') => {
    setSetupInitialStep(step);
    setSetupKey(k => k + 1);
    setPhase('SETUP');
  }, []);
  useEffect(() => {
    scrollToTop();
  }, [phase]);

  // Browser history management
  useEffect(() => {
    // The screens are one document, so the browser restoring the scroll offset
    // of the screen you left drops you into the middle of the one you arrive
    // at. Each screen positions itself.
    try {
      window.history.scrollRestoration = 'manual';
    } catch (_) {}
    window.history.replaceState({
      screen: 'LANDING'
    }, '');
    const handler = e => {
      const screen = e.state?.screen || 'LANDING';
      if (screen === 'LANDING') setPhase('LANDING');else if (screen === 'CAMPAIGN') goToSetup('CAMPAIGN');else if (screen === 'CHARACTER') goToSetup('CHARACTER');else if (screen === 'NAME') goToSetup('NAME');else if (screen === 'SESSION_ZERO') setPhase('SESSION_ZERO');
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [goToSetup]);
  const [sessionZeroData, setSessionZeroData] = useState(null);
  const [szError, setSzError] = useState(null);
  const [firstHookOpening, setFirstHookOpening] = useState(null);
  const [sessionInitState, setSessionInitState] = useState('pending'); // 'pending' | 'ready' | 'error'
  const [saveCode, setSaveCode] = useState(() => localStorage.getItem('sf_save_code') || null);
  // Whether the server holds saved game state for this session; the server is
  // the source of truth for resuming, the local snapshot only a fallback.
  const [serverHasSave, setServerHasSave] = useState(false);
  const [quota, setQuota] = useState(null);

  // One place to remember a session: token for the API, code for the player.
  const adoptSession = useCallback((token, code) => {
    localStorage.setItem('sf_session_token', token);
    setSessionToken(token);
    if (code) {
      localStorage.setItem('sf_save_code', code);
      setSaveCode(code);
    }
  }, []);

  const doSessionInit = useCallback(() => {
    setSessionInitState('pending');
    const timeoutId = setTimeout(() => setSessionInitState('error'), 10000);
    const createSession = () => fetch('/api/session', {
      method: 'POST'
    }).then(r => r.json()).then(({
      token,
      save_code
    }) => {
      adoptSession(token, save_code);
      setServerHasSave(false);
      setSessionInitState('ready');
    });
    const existingToken = localStorage.getItem('sf_session_token');
    if (existingToken) {
      fetch(`/api/session/${existingToken}`).then(r => r.ok ? r.json() : null).then(data => {
        clearTimeout(timeoutId);
        if (data) {
          adoptSession(existingToken, data.save_code);
          setServerHasSave(!!data.state_json);
          setSessionInitState('ready');
        } else {
          return createSession();
        }
      }).catch(() => {
        clearTimeout(timeoutId);
        setSessionInitState('error');
      });
    } else {
      createSession().then(() => clearTimeout(timeoutId)).catch(() => {
        clearTimeout(timeoutId);
        setSessionInitState('error');
      });
    }
  }, [adoptSession]);

  // Free-tier budget: read on load and whenever the player comes back to the
  // tab (otherwise an "out for today" banner would outlive the actual reset),
  // then kept current by the events the chat stream and any 429 publish.
  useEffect(() => {
    const onQuota = e => setQuota(e.detail);
    const refresh = () => fetch('/api/quota').then(r => r.ok ? r.json() : null).then(q => {
      if (q) setQuota(q);
    }).catch(() => {});
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener(QUOTA_EVENT, onQuota);
    document.addEventListener('visibilitychange', onVisible);
    refresh();
    return () => {
      window.removeEventListener(QUOTA_EVENT, onQuota);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Resume a game on any device from its save code.
  const handleResumeCode = useCallback(async codeInput => {
    const code = (codeInput || '').trim();
    if (!code) return {
      success: false,
      error: 'Enter your save code.'
    };
    // Loading someone else's code replaces the game held on this device, so
    // ask first when there is one to lose.
    const localSave = localStorage.getItem('sf_game_save');
    const currentCode = localStorage.getItem('sf_save_code') || '';
    if (localSave && code.toUpperCase().replace(/[^A-Z0-9]/g, '') !== currentCode.toUpperCase()) {
      const ok = window.confirm('Loading this code will replace the game saved in this browser. Continue?');
      if (!ok) return {
        success: false,
        error: null
      };
    }
    let data;
    try {
      const res = await fetch('/api/session/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code
        })
      });
      if (res.status === 404) return {
        success: false,
        error: 'No saved game found for that code.'
      };
      if (!res.ok) return {
        success: false,
        error: 'Could not reach the game server. Try again.'
      };
      data = await res.json();
    } catch (_) {
      return {
        success: false,
        error: 'Could not reach the game server. Try again.'
      };
    }
    adoptSession(data.token, data.save_code);
    if (!data.state_json) {
      // Valid code, but nothing was saved under it yet.
      setServerHasSave(false);
      setPhase('SETUP');
      return {
        success: true,
        error: null
      };
    }
    const result = parseAndLoadSave(data.state_json, setGameState, setPhase);
    if (!result.success) {
      return {
        success: false,
        error: 'That save could not be loaded (' + result.errors.join(', ') + ').'
      };
    }
    setServerHasSave(true);
    // Mirror into local storage so Resume Game works on this device too.
    try {
      localStorage.setItem('sf_game_save', data.state_json);
    } catch (_) {}
    return {
      success: true,
      error: null
    };
  }, [adoptSession]);

  // Session init: restore existing session or create new one on mount
  useEffect(() => {
    doSessionInit();
  }, []); // eslint-disable-line -- fire only on mount

  // A resumed session (existing token, or a save code) can already have
  // server-held checkpoints from before this page load; load the list once
  // rather than leaving meta.snapshots at its empty initial value until the
  // player saves a new one.
  useEffect(() => {
    if (!sessionToken || !serverHasSave) return;
    let cancelled = false;
    loadSnapshotsFromServer(sessionToken).then(snapshots => {
      if (cancelled || !snapshots) return;
      setGameState(prev => ({
        ...prev,
        meta: {
          ...prev.meta,
          snapshots
        }
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [sessionToken, serverHasSave]);

  const handleBeginAdventure = useCallback(async (charIdArg, displayNameArg) => {
    const resolvedCharId = charIdArg || selectedCharId;
    const selectedChar = CHARACTER_ROSTER.find(c => c.id === resolvedCharId);
    const selectedAdventure = ADVENTURE_LIBRARY.find(a => a.id === selectedAdventureId);
    if (!selectedChar || !selectedAdventure) return;
    if (charIdArg) setSelectedCharId(charIdArg);
    const resolvedDisplayName = displayNameArg || selectedCharDisplayName || selectedChar.name;
    setGameState(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        loading: true
      }
    }));
    window.history.pushState({
      screen: 'SESSION_ZERO'
    }, '');
    setPhase('SESSION_ZERO');
    setSzError(null);
    let data;
    try {
      const res = await fetch('/api/game/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken
        },
        body: JSON.stringify({
          character_id: resolvedCharId,
          display_name: resolvedDisplayName,
          adventure_id: selectedAdventureId
        })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setSzError({
          code: `HTTP_${res.status}`,
          message: (body && body.error) || `API error ${res.status}`,
          recoverable: true,
          retry_action: () => handleBeginAdventure(charIdArg, displayNameArg)
        });
        setGameState(prev => ({
          ...prev,
          meta: {
            ...prev.meta,
            loading: false
          }
        }));
        return;
      }
      data = await res.json();
    } catch (_) {
      setSzError({
        code: 'NETWORK_ERROR',
        message: 'Network error: could not reach the game master.',
        recoverable: true,
        retry_action: () => handleBeginAdventure(charIdArg, displayNameArg)
      });
      setGameState(prev => ({
        ...prev,
        meta: {
          ...prev.meta,
          loading: false
        }
      }));
      return;
    }
    setGameState(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        loading: false
      }
    }));
    setSessionZeroData(data);
  }, [sessionToken, selectedCharId, selectedAdventureId, selectedCharDisplayName]);
  const handleHookSelect = useCallback(async hookIdx => {
    if (!sessionZeroData || !sessionZeroData.hooks[hookIdx]) return;
    const hook = sessionZeroData.hooks[hookIdx];
    try {
      const res = await fetch('/api/game/begin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken
        },
        body: JSON.stringify({
          hook_index: hookIdx
        })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setSzError({
          code: `HTTP_${res.status}`,
          message: (body && body.error) || 'Could not begin the adventure.',
          recoverable: true,
          retry_action: () => handleHookSelect(hookIdx)
        });
        return;
      }
      const data = await res.json();
      setGameState(prev => adoptServerState(prev, data.state));
      setFirstHookOpening(hook.opening);
      setPhase('GAME');
    } catch (_) {
      setSzError({
        code: 'NETWORK_ERROR',
        message: 'Network error: could not reach the game server.',
        recoverable: true,
        retry_action: () => handleHookSelect(hookIdx)
      });
    }
  }, [sessionZeroData, sessionToken]);
  const handleNewAdventure = useCallback(() => {
    setGameState(INITIAL_STATE);
    setPhase('SETUP');
    setSelectedCharId(null);
    setSelectedAdventureId(null);
    setSessionZeroData(null);
    setSzError(null);
    setFirstHookOpening(null);
  }, []);
  const handleNewGameFromLanding = useCallback(() => {
    localStorage.removeItem('sf_game_save');
    localStorage.removeItem('sf_gm_log');
    // Every new game gets its own server session and save code; the previous
    // code keeps resuming the previous game. Token goes null (not stale) so a
    // racing request fails loudly instead of writing into the old session.
    localStorage.removeItem('sf_session_token');
    localStorage.removeItem('sf_save_code');
    setSessionToken(null);
    setSaveCode(null);
    setServerHasSave(false);
    doSessionInit();
    setGameState(INITIAL_STATE);
    window.history.pushState({
      screen: 'CAMPAIGN'
    }, '');
    setPhase('SETUP');
    setSelectedCharId(null);
    setSelectedAdventureId(null);
    setSessionZeroData(null);
    setSzError(null);
    setFirstHookOpening(null);
  }, [doSessionInit]);
  // Continue = resume this session from the server, exactly as if the player
  // typed their own code. The local snapshot is only an offline fallback.
  const handleResumeGame = useCallback(async () => {
    if (serverHasSave) {
      const ownCode = localStorage.getItem('sf_save_code');
      if (ownCode) {
        const result = await handleResumeCode(ownCode);
        if (result.success) return;
      }
    }
    const saveStr = localStorage.getItem('sf_game_save');
    if (saveStr) {
      const result = parseAndLoadSave(saveStr, setGameState, setPhase);
      if (result.success) return;
    }
    setPhase('SETUP');
  }, [serverHasSave, handleResumeCode]);
  if (sessionInitState === 'pending') {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: '100vh',
        background: '#000'
      }
    });
  }
  if (sessionInitState === 'error') {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4 px-6 text-center"
    }, /*#__PURE__*/React.createElement(AlertCircle, {
      size: 36,
      className: "text-red-400"
    }), /*#__PURE__*/React.createElement("p", {
      className: "text-red-400 font-bold"
    }, "Unable to connect to the game server."), /*#__PURE__*/React.createElement("button", {
      onClick: doSessionInit,
      className: "bg-yellow-400 text-gray-900 font-bold px-6 py-2 rounded-lg hover:bg-yellow-300 cursor-pointer text-sm"
    }, "Retry"), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 text-xs"
    }, "If this persists, the server may be temporarily unavailable."));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "sf-app-shell"
  }, /*#__PURE__*/React.createElement(QuotaBanner, {
    quota: quota,
    saveCode: saveCode
  }), phase === 'LANDING' && /*#__PURE__*/React.createElement(LandingScreen, {
    onNewGame: handleNewGameFromLanding,
    onResume: handleResumeGame,
    saveCode: saveCode,
    onResumeCode: handleResumeCode,
    serverHasSave: serverHasSave
  }), phase === 'SETUP' && /*#__PURE__*/React.createElement(SetupScreen, {
    key: `${setupInitialStep}-${setupKey}`,
    initialStep: setupInitialStep,
    selectedCharId: selectedCharId,
    onCharSelect: setSelectedCharId,
    selectedAdventureId: selectedAdventureId,
    onAdventureSelect: setSelectedAdventureId,
    onBeginAdventure: handleBeginAdventure,
    onCharDisplayName: setSelectedCharDisplayName
  }), phase === 'SESSION_ZERO' && gameState.meta.loading && /*#__PURE__*/React.createElement(LoadingTidbits, null), phase === 'SESSION_ZERO' && !gameState.meta.loading && sessionZeroData && /*#__PURE__*/React.createElement(SessionZeroScreen, {
    hooks: sessionZeroData.hooks,
    error: szError,
    onHookSelect: handleHookSelect,
    missionTitle: ADVENTURE_LIBRARY.find(a => a.id === selectedAdventureId)?.title,
    onBack: () => goToSetup('NAME')
  }), phase === 'SESSION_ZERO' && !gameState.meta.loading && szError && !sessionZeroData && /*#__PURE__*/React.createElement(SessionZeroScreen, {
    hooks: [],
    error: szError,
    onHookSelect: handleHookSelect
  }), phase === 'GAME' && /*#__PURE__*/React.createElement(GameScreen, {
    gameState: gameState,
    setGameState: setGameState,
    sessionToken: sessionToken,
    firstHookOpening: firstHookOpening,
    onNewAdventure: handleNewAdventure,
    saveCode: saveCode
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));