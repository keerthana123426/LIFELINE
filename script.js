
const APP = {

  emergency:  null,   
  severity:   null,   
  transcript: '',

  questions: [],
  qIndex:    0,
  answers:   [],     

  cprInterval: null,
  cprCount:    0,
  cprRunning:  false,

  chokingUnconscious: false,
};

function goTo(screenName) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });

  const target = document.getElementById('screen-' + screenName);
  if (target) {
    target.style.display = 'flex';
    void target.offsetWidth;   
    target.classList.add('active');
  }
}

function activateEmergency() {
  goTo('input');
}

function restartApp() {
  stopCPR();
  cancelSpeech();

  APP.emergency          = null;
  APP.severity           = null;
  APP.transcript         = '';
  APP.questions          = [];
  APP.qIndex             = 0;
  APP.answers            = [];
  APP.cprRunning         = false;
  APP.chokingUnconscious = false;   

  resetInputScreen();
  goTo('home');
}



let recognition = null;


function resetInputScreen() {
  setMicState('idle');
  document.getElementById('mic-status').innerHTML =
    'Press <strong>Speak</strong> and describe what happened';
  document.getElementById('transcript-wrap').classList.add('hidden');
  document.getElementById('transcript-text').textContent = '';
  document.getElementById('text-input').value = '';   
}

function setMicState(state) {
  const el = document.getElementById('mic-anim');
  el.classList.remove('idle', 'listening', 'done');
  el.classList.add(state);
}


function startListening() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRec) {
    alert(
      '❌ Speech Recognition is not supported in this browser.\n' +
      'Please use Google Chrome, or type your emergency description below.'
    );
    return;
  }

  recognition = new SpeechRec();

  recognition.lang            = navigator.language || 'en-US';
  recognition.interimResults  = false;
  recognition.maxAlternatives = 1;

  setMicState('listening');
  document.getElementById('mic-status').textContent = '🔴 Listening… speak now';
  document.getElementById('btn-speak').disabled = true;
  recognition.onresult = function (event) {
    handleTranscript(event.results[0][0].transcript);
  };
  recognition.onspeechend = function () {
    recognition.stop();
  };

  recognition.onerror = function (event) {
    setMicState('idle');
    document.getElementById('btn-speak').disabled = false;
    document.getElementById('mic-status').textContent =
      '⚠️ Error: ' + event.error + '. Try again or type below.';
  };

  recognition.start();
}


function handleTranscript(text) {
  APP.transcript = text;
  document.getElementById('transcript-text').textContent = text;
  document.getElementById('transcript-wrap').classList.remove('hidden');
  setMicState('done');
  document.getElementById('mic-status').textContent = '✔ Got it! Analysing…';
  document.getElementById('btn-speak').disabled = false;
  setTimeout(() => runClassify(text), 600);
}


function submitText() {
  const text = document.getElementById('text-input').value.trim();
  if (!text) {
    alert('Please type an emergency description before submitting.');
    return;
  }
  APP.transcript = text;
  runClassify(text);
}


function useExample(text) {
  APP.transcript = text;
  document.getElementById('transcript-text').textContent = text;
  document.getElementById('transcript-wrap').classList.remove('hidden');
  document.getElementById('text-input').value = text;   // [UPDATED-4]
  setMicState('done');
  document.getElementById('mic-status').textContent = '✔ Example loaded. Analysing…';
  setTimeout(() => runClassify(text), 400);
}


const KEYWORDS = {

  cpr: [
    {
      words: ['not breathing', 'no breathing', 'stopped breathing', 'not breathe', 'isnt breathing'],
      weight: 10
    },
    {
      words: ['no pulse', 'no heartbeat', 'heart stopped', 'cardiac arrest', 'heart attack', 'cardiac'],
      weight: 9
    },
    {
      words: ['cpr', 'chest compression', 'resuscitation', 'bls'],
      weight: 10
    },
    {
      words: ['unresponsive', 'not responding', 'wont respond', "won't respond"],
      weight: 6
    },
    {
      words: ['collapsed', 'fell down', 'on the ground', 'on the floor', 'dropped'],
      weight: 3
    },
  ],

  
  choking: [
    {
      words: ['choking', 'choke', 'choked'],
      weight: 10
    },
    {
      words: ['cannot breathe', "can't breathe", 'cant breathe', 'unable to breathe', 'no air'],
      weight: 8
    },
    {
      words: ['something stuck', 'food stuck', 'object stuck', 'airway blocked', 'stuck in throat'],
      weight: 9
    },
    {
      words: ['heimlich', 'abdominal thrust'],
      weight: 10
    },
    {
      words: ['turning blue', 'lips blue', 'face blue', 'going blue', 'cyanosis'],
      weight: 7
    },
  ],

  
  bleeding: [
    {
      words: ['bleeding', 'blood', 'hemorrhage', 'haemorrhage', 'haemorrhaging'],
      weight: 10
    },
    {
      words: ['cut', 'laceration', 'gash', 'wound', 'stab', 'stabbed', 'slashed'],
      weight: 8
    },
    {
      words: ['artery', 'vein', 'spurting', 'spurting blood', "won't stop bleeding", 'wont stop bleeding'],
      weight: 9
    },
    {
      words: ['injury', 'injured', 'trauma', 'hurt'],
      weight: 3
    },
  ],

  
  recovery: [
    {
      words: ['unconscious', 'fainted', 'fainting', 'passed out'],
      weight: 10
    },
    {
      words: ['not waking up', "won't wake", 'wont wake', 'unresponsive', 'no response'],
      weight: 8
    },
    {
      words: ['collapsed', 'fell', 'on the floor', 'on the ground'],
      weight: 4
    },
    {
      words: ['dizzy', 'dizziness', 'lightheaded', 'syncope', 'feeling faint'],
      weight: 3
    },
  ],
};


const TRAUMA_WORDS = [
  'severe', 'serious', 'critical', 'heavy', 'massive',
  'a lot of blood', 'a lot of bleeding',
  'emergency', 'dying', 'going to die', 'dead',
  'accident', 'crash', 'car crash', 'hit by', 'attack', 'beaten',
];


function classify(text) {
  const t = text.toLowerCase();

  const scores = { cpr: 0, choking: 0, bleeding: 0, recovery: 0 };

  for (const [type, groups] of Object.entries(KEYWORDS)) {
    for (const group of groups) {
      for (const word of group.words) {
        if (t.includes(word)) {
          scores[type] += group.weight;
          break;  
        }
      }
    }
  }

  const hasTrauma = TRAUMA_WORDS.some(w => t.includes(w));
  if (hasTrauma) {
    for (const type in scores) {
      scores[type] = Math.round(scores[type] * 1.5);
    }
  }
  const priority = ['cpr', 'choking', 'bleeding', 'recovery'];
  const maxScore = Math.max(...Object.values(scores));

  if (maxScore === 0) {
    return { emergency: 'unknown', severity: 'Stable' };
  }

  let winner = 'unknown';
  for (const type of priority) {
    if (scores[type] === maxScore) {
      winner = type;
      break;
    }
  }

  if (winner === 'choking') {
    const unconsciousWords = [
      'unconscious', 'fainted', 'passed out',
      'not responding', 'unresponsive', 'collapsed',
    ];
    if (unconsciousWords.some(w => t.includes(w))) {
      APP.chokingUnconscious = true;   
    }
  }

  const severityMap = {
    cpr:      'Critical',
    choking:  APP.chokingUnconscious ? 'Critical' : 'Serious',
    bleeding: 'Serious',
    recovery: 'Stable',
    unknown:  'Stable',
  };

  return { emergency: winner, severity: severityMap[winner] };
}


function runClassify(text) {
  const result  = classify(text);
  APP.emergency = result.emergency;
  APP.severity  = result.severity;
  buildConfirmScreen();
  goTo('confirm');
}



function buildConfirmScreen() {
  const questionSets = {
    cpr:      ['Is the person conscious?', 'Is the person breathing?'],
    choking:  ['Can the person speak or cough at all?'],
    bleeding: ['Is the bleeding heavy and continuous?'],
    recovery: ['Is the person responding to your voice?'],
    unknown:  ['Is the person conscious?'],
  };

  APP.questions = questionSets[APP.emergency] || questionSets.unknown;
  APP.qIndex    = 0;
  APP.answers   = [];

  const badge       = document.getElementById('confirm-badge');
  const badgeLabels = {
    cpr:      '⚠️ CPR Emergency',
    choking:  '😮 Choking Emergency',
    bleeding: '🩸 Bleeding Emergency',
    recovery: '😴 Recovery / Unconscious',
    unknown:  '❓ Emergency Detected',
  };
  const badgeClasses = {
    cpr:      'badge-critical',
    choking:  APP.chokingUnconscious ? 'badge-critical' : 'badge-serious',
    bleeding: 'badge-serious',
    recovery: 'badge-stable',
    unknown:  'badge-stable',
  };
  badge.textContent = badgeLabels[APP.emergency]  || badgeLabels.unknown;
  badge.className   = 'emerg-badge ' + (badgeClasses[APP.emergency] || 'badge-stable');

  renderQuestion();
}

function renderQuestion() {
  const total = APP.questions.length;
  const idx   = APP.qIndex;

  document.getElementById('q-current').textContent = idx + 1;
  document.getElementById('q-total').textContent   = total;

  const pct = (idx / total) * 100;
  document.getElementById('q-progress-fill').style.width = pct + '%';
  document.getElementById('q-progressbar').setAttribute('aria-valuenow', pct);

  document.getElementById('confirm-question').textContent = APP.questions[idx];
}


function answerYesNo(answer) {
  APP.answers.push(answer);
  APP.qIndex++;

  if (APP.qIndex < APP.questions.length) {
    const pct = (APP.qIndex / APP.questions.length) * 100;
    document.getElementById('q-progress-fill').style.width = pct + '%';
    renderQuestion();
  } else {
    document.getElementById('q-progress-fill').style.width = '100%';
    setTimeout(() => {
      buildActionScreen();
      goTo('action');
    }, 350);
  }
}


function resolveModule() {
  const e = APP.emergency;
  const a = APP.answers;

  if (e === 'cpr') {
    if (a[0] === 'yes' && a[1] === 'yes') return 'recovery';
    return 'cpr';
  }
  if (e === 'choking') {
    if (APP.chokingUnconscious) return 'cpr';   
    return 'choking';                            
  }
  if (e === 'bleeding') return 'bleeding';
  if (e === 'recovery') return 'recovery';
  return 'recovery';  
}



function buildActionScreen() {
  const module    = resolveModule();
  const contentEl = document.getElementById('action-content');
  const titleEl   = document.getElementById('action-topbar-title');

  stopCPR();     
  cancelSpeech(); 
  switch (module) {
    case 'cpr':
      titleEl.textContent = '🫀 CPR Guide';
      contentEl.innerHTML = buildCPRLayout();
      initCPR();                    
      break;

    case 'choking':                    
      titleEl.textContent = '😮 Choking – Heimlich';
      contentEl.innerHTML = buildChokingLayout();
      speakChokingInstructions();
      break;

    case 'bleeding':
      titleEl.textContent = '🩸 Bleeding Control';
      contentEl.innerHTML = buildBleedingLayout();
      speakBleedingInstructions();
      break;

    case 'recovery':
    default:
      titleEl.textContent = '😴 Recovery Position';
      contentEl.innerHTML = buildRecoveryLayout();
      speakRecoveryInstructions();
      break;
  }
}

function buildCPRLayout() {
  return `
    <div class="severity-strip strip-critical">⚠️ CRITICAL — Start CPR Immediately</div>

    <!-- Large compression counter -->
    <div class="cpr-widget">
      <p class="cpr-label">Chest Compressions</p>
      <div id="cpr-count" class="cpr-number">0</div>
      <p class="cpr-sublabel">of 30</p>
      <p id="cpr-msg" class="cpr-status-msg">Preparing…</p>
    </div>

    <!-- [UPDATED-3] Positive change control -->
    <div class="cpr-controls">
      <p class="cpr-controls-label">✅ Positive Change?</p>
      <button class="btn-green" onclick="personStartedBreathing()">
        🌬️ Person Started Breathing
      </button>
    </div>

    <!-- Static reference steps (always visible) -->
    <div class="instr-card">
      <div class="instr-num">1</div>
      <p class="instr-text">Place the <strong>heel of your hand</strong> at the centre of the chest (lower half of breastbone).</p>
    </div>
    <div class="instr-card">
      <div class="instr-num">2</div>
      <p class="instr-text">Place your <strong>other hand on top</strong> and interlock your fingers.</p>
    </div>
    <div class="instr-card">
      <div class="instr-num">3</div>
      <p class="instr-text">Keep your <strong>arms straight</strong> and push down hard — at least 2 inches (5 cm).</p>
    </div>
    <div class="instr-card">
      <div class="instr-num">4</div>
      <p class="instr-text">After <strong>30 compressions</strong>, give <strong>2 rescue breaths</strong> if trained.</p>
    </div>
  `;
}


function initCPR() {
  const instructions = [
    'Place the heel of your hand at the center of the chest.',
    'Place your other hand on top and interlock your fingers.',
    'Keep your arms straight and lock your elbows.',
    'Start compressions now!',
  ];

  const msgEl = document.getElementById('cpr-msg');
  let idx = 0;

  function speakNextInstruction() {
    /* All done → launch the counter */
    if (idx >= instructions.length) {
      startCPRCounter();
      return;
    }

    /* Update on-screen status text */
    if (msgEl) msgEl.textContent = instructions[idx];

    /* Speak this instruction; when it ends, speak the next */
    const utter = makeSpeech(instructions[idx]);
    idx++;
    utter.onend = speakNextInstruction;   // chain
    window.speechSynthesis.speak(utter);
  }

  speakNextInstruction();
}


function startCPRCounter() {
  APP.cprRunning = true;
  APP.cprCount = 0;

  const countEl = document.getElementById('cpr-count');
  const msgEl   = document.getElementById('cpr-msg');

  if (!countEl) return;

  if (msgEl) msgEl.textContent = 'Start chest compressions';

  function runCompression() {
    if (!APP.cprRunning) return;

    APP.cprCount++;
    countEl.textContent = APP.cprCount;

    countEl.classList.add('beat');
    setTimeout(() => countEl.classList.remove('beat'), 100);

    const utter = makeSpeech(String(APP.cprCount));

    utter.onend = function () {
      if (!APP.cprRunning) return;

      if (APP.cprCount >= 30) {
        APP.cprCount = 0;

        if (msgEl) msgEl.textContent = 'Give two rescue breaths';

        const breath = makeSpeech('Give two rescue breaths');

        breath.onend = function () {
          if (!APP.cprRunning) return;

          if (msgEl) msgEl.textContent = 'Continue compressions';
          runCompression();
        };

        speechSynthesis.speak(breath);
      } else {
        runCompression();
      }
    };

    speechSynthesis.speak(utter);
  }

  runCompression();
}


function stopCPR() {
  if (APP.cprInterval) {
    clearInterval(APP.cprInterval);
    APP.cprInterval = null;
  }
  APP.cprRunning = false;
}


function personStartedBreathing() {
  stopCPR();
  cancelSpeech();

  speak('Great news! The person has started breathing. Move to the recovery position now.');


  setTimeout(() => {
    const contentEl = document.getElementById('action-content');
    const titleEl   = document.getElementById('action-topbar-title');
    if (!contentEl) return;
    titleEl.textContent = '😴 Recovery Position';
    contentEl.innerHTML = buildRecoveryLayout();
    speakRecoveryInstructions();
  }, 1200);
}


function buildChokingLayout() {

  const canSpeak     = APP.answers[0] === 'yes';
  const urgencyClass = canSpeak ? 'strip-serious' : 'strip-critical';
  const urgencyMsg   = canSpeak
    ? '⚠️ Mild Choking — Encourage Coughing'
    : '🚨 Severe Choking — Perform Heimlich Manoeuvre Now';

  return `
    <div class="severity-strip ${urgencyClass}">${urgencyMsg}</div>

    ${canSpeak
      
      ? `
        <div class="instr-card">
          <div class="instr-num">1</div>
          <p class="instr-text">The person can cough. <strong>Encourage them to cough forcefully</strong> — do not interfere unless coughing weakens.</p>
        </div>
        <div class="instr-card">
          <div class="instr-num">2</div>
          <p class="instr-text">Do <strong>NOT perform back blows or abdominal thrusts</strong> while they can still cough effectively.</p>
        </div>
        <div class="instr-card">
          <div class="instr-num">3</div>
          <p class="instr-text">Call <strong>911</strong> now and stay close. If coughing fails or stops, begin Heimlich immediately.</p>
        </div>
      `

      : `
        <div class="instr-card">
          <div class="instr-num">1</div>
          <p class="instr-text"><strong>Stand firmly behind</strong> the person and wrap your arms around their waist.</p>
        </div>
        <div class="instr-card">
          <div class="instr-num">2</div>
          <p class="instr-text">Make a <strong>fist with one hand</strong>. Place the thumb side against the abdomen, just above the navel, well below the breastbone.</p>
        </div>
        <div class="instr-card">
          <div class="instr-num">3</div>
          <p class="instr-text">Grasp your fist with your other hand. Give <strong>firm, quick thrusts inward and upward</strong>.</p>
        </div>
        <div class="instr-card">
          <div class="instr-num">4</div>
          <p class="instr-text"><strong>Repeat thrusts</strong> until the object is expelled or the person loses consciousness.</p>
        </div>
      `
    }

    <!-- Escalation button: choking → CPR if person goes unconscious -->
    <div class="cpr-controls">
      <p class="cpr-controls-label">If the person loses consciousness:</p>
      <button class="btn-green" onclick="escalateToCPR()">
        🚨 Person Lost Consciousness — Start CPR
      </button>
    </div>
  `;
}

function speakChokingInstructions() {
  if (APP.answers[0] === 'yes') {
    speak(
      'Mild choking. Encourage the person to cough forcefully. ' +
      'Do not interfere yet. Call 911 and monitor closely.'
    );
  } else {
    speak(
      'Severe choking. Stand behind the person. ' +
      'Make a fist and place it just above the navel. ' +
      'Grasp your fist and give firm upward thrusts. ' +
      'Repeat until the object is expelled.'
    );
  }
}


function escalateToCPR() {
  APP.chokingUnconscious = true;
  APP.emergency          = 'cpr';
  APP.severity           = 'Critical';

  stopCPR();
  cancelSpeech();
  speak('The person is now unconscious. Starting CPR. Listen carefully for instructions.');

  setTimeout(() => {
    const contentEl = document.getElementById('action-content');
    const titleEl   = document.getElementById('action-topbar-title');
    if (!contentEl) return;
    titleEl.textContent = '🫀 CPR Guide';
    contentEl.innerHTML = buildCPRLayout();
    initCPR();   
  }, 1200);
}


function buildBleedingLayout() {
  const heavy        = APP.answers[0] === 'yes';
  const urgencyClass = heavy ? 'strip-serious' : 'strip-stable';
  const urgencyMsg   = heavy
    ? '⚠️ SERIOUS — Heavy bleeding detected'
    : '⚠️ Controlled bleeding — follow steps carefully';

  return `
    <div class="severity-strip ${urgencyClass}">${urgencyMsg}</div>

    <div class="instr-card">
      <div class="instr-num">1</div>
      <p class="instr-text">Apply <strong>firm, continuous pressure</strong> to the wound using a clean cloth, gauze, or bandage.</p>
    </div>
    <div class="instr-card">
      <div class="instr-num">2</div>
      <p class="instr-text"><strong>Elevate the injured area</strong> above the level of the heart if possible.</p>
    </div>
    <div class="instr-card">
      <div class="instr-num">3</div>
      <p class="instr-text">Do <strong>NOT remove</strong> any embedded objects — pack around them instead.</p>
    </div>
    <div class="instr-card">
      <div class="instr-num">4</div>
      <p class="instr-text">If the cloth soaks through, <strong>add more on top</strong>. Never remove the first layer.</p>
    </div>
    <div class="instr-card">
      <div class="instr-num">5</div>
      <p class="instr-text">Keep the person <strong>still and calm</strong>. Call 911 immediately.</p>
    </div>
  `;
}

function speakBleedingInstructions() {
  speak(
    'Apply firm, continuous pressure to the wound. ' +
    'Elevate the injured area above the heart. ' +
    'Do not remove embedded objects. ' +
    'Call 911 immediately.'
  );
}


function buildRecoveryLayout() {
  return `
    <div class="severity-strip strip-stable">🟢 STABLE — Recovery Position</div>

    <div class="instr-card">
      <div class="instr-num">1</div>
      <p class="instr-text"><strong>Place the person on their side</strong> (recovery position) to keep the airway open.</p>
    </div>
    <div class="instr-card">
      <div class="instr-num">2</div>
      <p class="instr-text">Tilt their head back slightly and <strong>lift the chin</strong> to ensure the airway stays clear.</p>
    </div>
    <div class="instr-card">
      <div class="instr-num">3</div>
      <p class="instr-text"><strong>Monitor breathing</strong> continuously. Do NOT give food or water.</p>
    </div>
    <div class="instr-card">
      <div class="instr-num">4</div>
      <p class="instr-text">Keep them <strong>warm and reassured</strong>. Stay close and call 911.</p>
    </div>
    <div class="instr-card">
      <div class="instr-num">5</div>
      <p class="instr-text">If breathing <strong>stops at any point</strong>, begin CPR immediately.</p>
    </div>
  `;
}


function speakRecoveryInstructions() {
  speak(
    'Place the person on their side in the recovery position. ' +
    'Keep the airway clear. ' +
    'Monitor breathing closely. ' +
    'Call 911 immediately.'
  );
}


function goToResult() {
  stopCPR();
  cancelSpeech();
  buildResultScreen();
  goTo('result');
}

function buildResultScreen() {
  const sev = APP.severity || 'Stable';


  const config = {
    Critical: {
      cls:     'sev-critical',
      heading: 'Critical Emergency',
      summary: 'This was a life-threatening situation. You provided CPR guidance. ' +
               'Continue care until professional help arrives. You did the right thing.',
      tell:    'Tell responders: CPR was performed. Person was unresponsive and not breathing. ' +
               'Provide exact location and describe any changes you noticed.',
    },
    Serious: {
      cls:     'sev-serious',
      heading: 'Serious Condition',
      summary: 'You applied emergency care for a serious condition. Keep monitoring the person ' +
               'and wait for emergency services to take over.',
      tell:    'Tell responders: Type of emergency (' + (APP.emergency || 'unknown') + '), ' +
               'when it started, steps you took, and any changes in the person\'s condition.',
    },
    Stable: {
      cls:     'sev-stable',
      heading: 'Stable Condition',
      summary: 'The person is in a recovery position and is being monitored. ' +
               'Stay with them and watch for any changes until help arrives.',
      tell:    'Tell responders: Person was placed in the recovery position. ' +
               'Describe breathing quality, any loss of consciousness, and when symptoms began.',
    },
  };

  const cfg = config[sev] || config.Stable;

  
  document.getElementById('result-severity').textContent = sev.toUpperCase();
  document.getElementById('result-severity').className   = 'result-severity ' + cfg.cls;
  document.getElementById('result-heading').textContent  = cfg.heading;
  document.getElementById('result-summary').textContent  = cfg.summary;

 
  const typeTagEl = document.getElementById('result-type-tag');
  if (typeTagEl) {
    const typeLabels = {
      cpr:      '🫀 CPR',
      choking:  '😮 Choking',
      bleeding: '🩸 Bleeding',
      recovery: '😴 Recovery',
      unknown:  '❓ Unknown',
    };
    const tagClasses = {
      cpr:      'mtag mtag-critical',
      choking:  APP.chokingUnconscious ? 'mtag mtag-critical' : 'mtag mtag-serious',
      bleeding: 'mtag mtag-serious',
      recovery: 'mtag mtag-stable',
      unknown:  'mtag mtag-stable',
    };
    typeTagEl.textContent = typeLabels[APP.emergency] || typeLabels.unknown;
    typeTagEl.className   = tagClasses[APP.emergency]  || tagClasses.unknown;
  }

  const timeEl = document.getElementById('result-time');
  if (timeEl) {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString(navigator.language || 'en-US', {
      hour: '2-digit', minute: '2-digit'
    });
  }

  const tellEl = document.getElementById('result-tell-text');
  if (tellEl) {
    tellEl.textContent = cfg.tell;
  }

  speak(
    'Emergency guidance complete. Severity level: ' + sev +
    '. Please seek professional medical help immediately.'
  );
}

function findHospitals() {
  window.open('https://www.google.com/maps/search/hospitals+near+me', '_blank');
}



function makeSpeech(text) {
  const u  = new SpeechSynthesisUtterance(text);
  u.lang   = navigator.language || 'en-US';   
  u.rate   = 0.9;
  u.pitch  = 1;
  return u;
}


function speak(text) {
  if (!window.speechSynthesis || !text) return;
  cancelSpeech();
  window.speechSynthesis.speak(makeSpeech(text));
}


function speakQuick(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.speak(makeSpeech(text));
}

function cancelSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}



if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .then(reg => {
        console.log('[LifeLine AI] ✅ Service Worker registered. Scope:', reg.scope);
      })
      .catch(err => {

        console.warn('[LifeLine AI] ⚠️ Service Worker failed to register:', err);
      });
  });
}


(function init() {
  goTo('home');
})();