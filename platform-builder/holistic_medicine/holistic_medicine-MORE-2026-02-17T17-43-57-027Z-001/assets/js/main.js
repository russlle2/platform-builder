(function(){
  // Utilities
  function el(id){return document.getElementById(id)}
  function q(sel,root=document){return root.querySelector(sel)}

  // Year in footer
  var y = new Date().getFullYear(); q('#year') && (q('#year').textContent = y);

  // Nav toggle
  var toggle = q('.nav-toggle'); toggle && toggle.addEventListener('click', function(){
    var list = q('.nav-list'); if(list.style.display==='flex'){list.style.display='none'} else {list.style.display='flex'}
  });

  // Whole-person inventory
  var inventoryForm = el('inventoryForm');
  var inventoryResult = el('inventoryResult');
  var clearBtn = el('clearInventory');
  function synthAgenda(areas){
    if(!areas || areas.length===0) return 'No areas selected yet. Try checking a few items and we\'ll create a short agenda for your intake.';
    var agenda = [];
    agenda.push('Intake focus: ' + areas.join(', '));
    // Prioritize
    if(areas.length>=6){
      agenda.push('Priority plan: Triage top 3 targets for the first session. Build short micro-routines for sleep, stress, and movement.');
    } else if(areas.length>=3){
      agenda.push('Priority plan: Detail one practical change per area and a 2-week check-in schedule.');
    } else {
      agenda.push('Priority plan: Deep-dive into the selected area with a short skills practice and a homework rhythm.');
    }
    // Cadence recommendation
    var cadence = '';
    if(areas.length>=6) cadence = 'Suggested cadence: 60-minute intake, followed by biweekly 30-min follow-ups for 3 months; group check-ins weekly.';
    else if(areas.length>=3) cadence = 'Suggested cadence: 50-minute intake, followed by alternating group-week and 30-minute check-ins for 8 weeks.';
    else cadence = 'Suggested cadence: 40-minute intake + one focused 30-minute follow-up after 2 weeks; optional group sessions for practice.';
    agenda.push(cadence);
    // Homework snippets
    agenda.push('Sample first-week homework: 3 micro-practices (breath pause, 10-min movement, 1 evening wind-down).');
    return agenda.join('\n\n');
  }

  if(inventoryForm){
    inventoryForm.addEventListener('submit', function(e){
      e.preventDefault();
      var checked = Array.from(inventoryForm.querySelectorAll('input[name="area"]:checked')).map(function(i){return i.value});
      var output = synthAgenda(checked);
      inventoryResult.textContent = output;
      // add copy button
      var cbtn = document.createElement('button'); cbtn.textContent='Copy agenda'; cbtn.className='btn ghost';
      cbtn.addEventListener('click', function(){navigator.clipboard && navigator.clipboard.writeText(output)});
      // clear previous extra
      var existing = inventoryResult.querySelector('button'); if(existing) existing.remove(); inventoryResult.appendChild(document.createElement('div'));
      inventoryResult.appendChild(cbtn);
    });
  }
  clearBtn && clearBtn.addEventListener('click', function(){
    Array.from(inventoryForm.querySelectorAll('input[name="area"]')).forEach(function(i){i.checked=false});
    inventoryResult.textContent = '';
  });

  // Modal and guided exercises
  var modal = el('exerciseModal');
  var tryBtn = el('tryNowBtn'); var tryBtn2 = el('tryNowSecondary');
  var closeModal = el('closeModal');
  var tabs = Array.from(document.querySelectorAll('.tab'));
  var panels = Array.from(document.querySelectorAll('.panel'));

  function openModal(){ modal.setAttribute('aria-hidden','false'); }
  function close(){ modal.setAttribute('aria-hidden','true'); stopBreathing(); stopJournal(); }

  tryBtn && tryBtn.addEventListener('click', openModal);
  tryBtn2 && tryBtn2.addEventListener('click', openModal);
  closeModal && closeModal.addEventListener('click', close);
  modal && modal.addEventListener('click', function(e){ if(e.target===modal) close(); });

  tabs.forEach(function(t){ t.addEventListener('click', function(){ tabs.forEach(function(x){x.classList.remove('active')}); t.classList.add('active'); var mode = t.getAttribute('data-mode'); panels.forEach(function(p){ p.classList.toggle('hidden', p.getAttribute('data-mode')!==mode) }); }); });

  // Breathing exercise
  var breathCircle = el('breathCircle');
  var breathText = el('breathText');
  var startBreath = el('startBreath'); var pauseBreath = el('pauseBreath'); var breathLength = el('breathLength');
  var breathing = false; var breathTimer = null; var breathStep = 0; var breathCount = 0; var maxCycles = 5;

  function breathCycleOnce(){
    // sequence: inhale 4s, hold 2s, exhale 6s (visual timing)
    var seq = [ {t:4000,txt:'Inhale gently'}, {t:1500,txt:'Hold'}, {t:5000,txt:'Exhale slowly'} ];
    var i=0;
    function next(){
      if(i>=seq.length) return;
      var s = seq[i];
      breathText.textContent = s.txt + ' (' + Math.ceil(s.t/1000) + 's)';
      // animate scale
      if(s.txt.indexOf('Inhale')===0){ breathCircle.style.transform='scale(1.15)'; }
      if(s.txt.indexOf('Hold')===0){ breathCircle.style.transform='scale(1.05)'; }
      if(s.txt.indexOf('Exhale')===0){ breathCircle.style.transform='scale(0.7)'; }
      setTimeout(function(){ i++; if(i<seq.length) next(); else { breathCount++; if(breathCount<maxCycles && breathing) { setTimeout(function(){ breathCircle.style.transform='scale(0.95)'; nextCycle(); },500); } else { breathing=false; startBreath.textContent='Start'; breathText.textContent='Well done — return when needed.'; } } }, s.t);
    }
    function nextCycle(){ i=0; next(); }
    next();
  }

  function startBreathing(){ if(breathing) return; breathing=true; breathCount=0; var sel = breathLength.value; maxCycles = sel==='1'?3: sel==='2'?5:10; startBreath.textContent='Running...'; breathCycleOnce(); }
  function stopBreathing(){ breathing=false; startBreath.textContent='Start'; breathText.textContent='Practice paused.'; breathCircle.style.transform='scale(0.95)'; }

  startBreath && startBreath.addEventListener('click', startBreathing);
  pauseBreath && pauseBreath.addEventListener('click', stopBreathing);

  // Journal exercise
  var promptEl = el('prompt'); var startJournal = el('startJournal'); var saveJournal = el('saveJournal'); var journalText = el('journalText');
  var journalTimer = null; var journaling=false;
  var prompts = [
    'Name one supportive habit you could keep for a week.',
    'Write about a moment this month when you felt steady.',
    'Describe one small boundary you want to try this week.'
  ];
  function startJ(){ if(journaling) return; journaling=true; journalText.value=''; promptEl.textContent = prompts[Math.floor(Math.random()*prompts.length)]; var t=180; startJournal.textContent='Writing...'; journalTimer = setTimeout(function(){ journaling=false; startJournal.textContent='Start 3-minute write'; alert('Time\'s up — consider saving your note.'); }, t*1000); }
  function stopJournal(){ journaling=false; startJournal.textContent='Start 3-minute write'; if(journalTimer){ clearTimeout(journalTimer); journalTimer=null; } }
  startJournal && startJournal.addEventListener('click', startJ);
  saveJournal && saveJournal.addEventListener('click', function(){ stopJournal(); close(); alert('Your note is saved locally in this session.'); });

  // Helpers to stop both when closing
  function stopBreathing(){ breathing=false; startBreath && (startBreath.textContent='Start'); breathText && (breathText.textContent='Practice paused.'); breathCircle && (breathCircle.style.transform='scale(0.95)'); }
  function stopJournal(){ journaling=false; startJournal && (startJournal.textContent='Start 3-minute write'); if(journalTimer){ clearTimeout(journalTimer); journalTimer=null; } }

})();