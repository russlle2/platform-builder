(function(){
  // Utilities
  function qs(id){return document.getElementById(id)}
  function showModal(el){el.setAttribute('aria-hidden','false')}
  function hideModal(el){el.setAttribute('aria-hidden','true')}

  // Year
  qs('year').textContent = new Date().getFullYear();

  // Inventory modal
  var invModal = qs('inventory-modal');
  var openInv = qs('open-inventory');
  var openInv2 = qs('open-inventory-2');
  var closeInv = qs('close-inventory');
  var closeInv2 = qs('close-inventory-2');
  var invForm = qs('inventory-form');
  var invResult = qs('inventory-result');

  [openInv, openInv2].forEach(function(btn){if(btn)btn.addEventListener('click',function(){showModal(invModal);invResult.innerHTML='';})});
  [closeInv, closeInv2].forEach(function(btn){if(btn)btn.addEventListener('click',function(){hideModal(invModal)})});

  invForm.addEventListener('submit',function(e){
    e.preventDefault();
    var data = new FormData(invForm);
    var domains = data.getAll('domain');
    var goal = data.get('goal') || 'Clarify priorities';
    if(domains.length===0){invResult.innerHTML='<em>Please select at least one area.</em>';return}

    // Build agenda
    var agenda = [];
    var follow = [];
    // Prioritize domains by a gentle rubric
    domains.slice(0,6).forEach(function(d,i){
      agenda.push((i+1)+'. Quick assessment + 2 immediate steps for ' + d + '.');
      // cadence: immediate, 1 week, 3 weeks, review
      if(i<2){ follow.push(d+': short check (3–7 days), then 2‑week remote check.'); }
      else if(i<4){ follow.push(d+': brief follow-up at 2 weeks, review at 6 weeks.'); }
      else { follow.push(d+': plan review at 4–6 weeks.'); }
    });

    var agendaHtml = '<h4>Consultation agenda</h4><p><strong>Main goal:</strong> '+escapeHtml(goal)+'</p><ol>' + agenda.map(function(a){return '<li>'+a+'</li>'}).join('') + '</ol>';
    var followHtml = '<h4>Suggested follow-up cadence</h4><ul>' + follow.map(function(f){return '<li>'+f+'</li>'}).join('') + '</ul>';
    invResult.innerHTML = agendaHtml + followHtml + '<p class="note">Bring recent labs, a concise medication/list and 3 specific questions you want answered.</p>';
  });

  function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

  // Guided exercise modal (breathing/journaling/intention)
  var exModal = qs('exercise-modal');
  var openEx = qs('open-exercise');
  var closeEx = qs('close-exercise');
  var startEx = qs('start-exercise');
  var exerciseType = qs('exercise-type');
  var exInstruction = qs('exercise-instruction');
  var exStage = qs('exercise-stage');
  var skipEx = qs('skip-exercise');

  if(openEx)openEx.addEventListener('click',function(){showModal(exModal);exInstruction.textContent='Choose a focus to begin.'});
  if(closeEx)closeEx.addEventListener('click',function(){hideModal(exModal)});
  if(skipEx)skipEx.addEventListener('click',function(){hideModal(exModal)});

  startEx.addEventListener('click',function(){
    var type = exerciseType.value;
    if(type==='breath') runBreathing();
    else if(type==='journaling') runJournaling();
    else runIntention();
  });

  // Breathing: 5 minutes gentle box/balance breathing with timers
  function runBreathing(){
    var cycles = 5; // about 5 min with prompts
    exStage.innerHTML='Prepare: sit comfortably with feet grounded.';
    var i=0;
    var phase = 0; // 0 inhale,1 hold,2 exhale,3 hold
    var phases = ['Inhale for 4','Hold for 4','Exhale for 6','Rest 4'];
    var timer = setInterval(function(){
      exStage.textContent = phases[phase] + ' — cycle ' + (i+1) + ' of ' + cycles;
      phase++;
      if(phase>3){phase=0;i++;}
      if(i>=cycles){clearInterval(timer);exStage.textContent='Practice complete — take a moment to notice any change.'}
    },4000);
  }

  // Journaling: provide timed prompts and capture responses locally (not sent anywhere)
  function runJournaling(){
    exStage.innerHTML='You will get three timed prompts. Use the text box to jot a short note.';
    exStage.innerHTML += '<div style="margin-top:12px"><textarea id="journal" rows="6" style="width:100%;border-radius:8px;padding:8px"></textarea></div>';
    var prompts = [
      'Prompt 1: What is a small win from the past week? (60s)',
      'Prompt 2: What is one friction you want to reduce? (60s)',
      'Prompt 3: What is one intention for today or tomorrow? (60s)'
    ];
    var idx = 0;
    var textarea = qs('journal');
    var promptTimer = setInterval(function(){
      if(idx>=prompts.length){clearInterval(promptTimer);exStage.innerHTML += '<p>Done — you can copy your notes or close this window.</p>';return}
      var p = prompts[idx];
      textarea.value = '\n\n--- '+p+' ---\n';
      exStage.insertBefore(document.createElement('div'), textarea); // no-op to keep DOM alive
      exStage.querySelector('textarea').focus();
      idx++;
    },62000);
    // start first immediately
    textarea.value = prompts[0] + '\n';
    // note: timer runs; user can type
  }

  // Intention setting: short interactive steps
  function runIntention(){
    exStage.innerHTML = '<ol><li>Recall one thing you want more of.</li><li>Choose a tiny action toward it (1–3 minutes).</li><li>Decide when you will do it today.</li></ol><p>When ready, write your intention below and keep it visible.</p><div style="margin-top:10px"><input id="int-input" placeholder="My intention is..." style="width:100%;padding:8px;border-radius:8px"/></div>';
    var input = qs('int-input');
    input.focus();
  }

  // Close modals on Esc
  window.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      hideModal(invModal);hideModal(exModal);
    }
  });
})();