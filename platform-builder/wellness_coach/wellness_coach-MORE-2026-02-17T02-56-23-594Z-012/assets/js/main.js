// Main JS: habit builder, guided exercise modal, diagnostic logic
(function(){
  // Utilities
  function el(id){return document.getElementById(id)}
  function q(sel,ctx){return (ctx||document).querySelector(sel)}
  function qa(sel,ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Year in footer
  var yearEl = el('year'); if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Nav toggle
  qa('.nav-toggle').forEach(function(btn){
    btn.addEventListener('click',function(){
      var expanded = btn.getAttribute('aria-expanded')==='true';
      btn.setAttribute('aria-expanded',(!expanded).toString());
      qa('.main-nav a').forEach(function(a){a.style.display = expanded? 'none':'inline-block';});
    });
  });

  // Diagnostic
  var diagForm = el('diagForm');
  if(diagForm){
    diagForm.addEventListener('submit',function(e){
      e.preventDefault();
      var vals = [0,1,2,3].map(function(){return 0});
      var score = 0;
      var fd = new FormData(diagForm);
      for(var pair of fd.entries()){ score += parseInt(pair[1],10)||0 }
      var elRes = el('diagResult');
      var advice = '';
      if(score <= 3){ advice = 'You have a stable baseline. Focus on small amplifiers: a single nightly reflection and a short clarity cue in the morning.' }
      else if(score <= 7){ advice = 'There are friction points. Try a focused 7-day micro-habit test—pick one action and keep it tiny.' }
      else if(score <= 11){ advice = 'Inconsistent rhythms are contributing to strain. A brief intensive to set anchors and mini-checks will help.' }
      else { advice = 'High friction across days. Start with a one-week sprint that reduces choices and sets strict micro-habits.' }
      elRes.innerHTML = '<strong>Insight</strong><p class="muted">Score: '+score+'</p><p>'+advice+'</p>';
    });
    el('clearDiag').addEventListener('click',function(){diagForm.reset(); el('diagResult').innerHTML='';});
  }

  // Habit builder: create a 7-day plan and show printable checklist
  var openHabit = el('openHabitBuilder');
  var checklistModal = el('checklistModal');
  var checklistContent = el('checklistContent');
  var printBtn = el('printChecklist');
  var downloadBtn = el('downloadChecklist');

  function closeModal(modal){ modal.setAttribute('aria-hidden','true'); }
  function showModal(modal){ modal.setAttribute('aria-hidden','false'); }

  if(openHabit){
    openHabit.addEventListener('click', function(){
      var outcome = prompt('What single outcome would you like a 7-day micro-habit sequence for?','More focused mornings');
      if(!outcome) return;
      var theme = prompt('Name a tiny habit to try each day (e.g. 2-minute reflection, 1 breathing round):','2-minute intention');
      if(!theme) return;
      var tone = prompt('One line to remind you why:','To gather direction for the day');
      var days = [];
      for(var i=1;i<=7;i++){
        var tweak = (i%3===0)? ' add a tiny tweak: 1 extra minute' : ' keep it simple';
        days.push({day:i,action:theme + tweak});
      }
      // Build HTML checklist
      var out = '<div class="checklist">';
      out += '<h4>7-day micro-habit: '+outcome+'</h4>';
      out += '<p class="muted">Small daily action: '+theme+' — '+tone+'</p>';
      out += '<ol>';
      days.forEach(function(d){ out += '<li><label><input type="checkbox" /> Day '+d.day+' — '+escapeHtml(d.action)+'</label></li>'; });
      out += '</ol>';
      out += '</div>';
      checklistContent.innerHTML = out;
      showModal(checklistModal);
    });
  }

  // Close modal buttons
  qa('.modal-close').forEach(function(btn){
    btn.addEventListener('click', function(){ var m = btn.closest('.modal'); closeModal(m); });
  });

  // Print and download
  if(printBtn){
    printBtn.addEventListener('click', function(){ window.print(); });
  }
  if(downloadBtn){
    downloadBtn.addEventListener('click', function(){
      var txt = stripTags(checklistContent.innerText || checklistContent.textContent);
      var blob = new Blob([txt], {type: 'text/plain;charset=utf-8'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = '7-day-checklist.txt'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); },500);
    });
  }

  // Guided exercise modal: breathing / journaling / intention
  var tryBtn = el('tryExerciseBtn');
  var exerciseModal = el('exerciseModal');
  var exerciseBody = el('exerciseBody');
  var exerciseTitle = el('exerciseTitle');
  var startBtn = el('exerciseStart');
  var stopBtn = el('exerciseStop');
  var activeTimer = null;

  function showExercise(type){
    // type: breathing, journaling, intention. Offer choices.
    var choice = type || prompt('Choose an exercise: breathing, journaling, intention','breathing');
    if(!choice) return;
    choice = choice.toLowerCase();
    exerciseBody.innerHTML = '';
    exerciseTitle.textContent = 'Quick: ' + (choice.charAt(0).toUpperCase()+choice.slice(1));

    if(choice==='breathing'){
      exerciseBody.innerHTML = '<svg id="breatheCircle" width="160" height="160" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="30" stroke="rgba(125,211,252,0.25)" stroke-width="2" fill="none"></circle><circle id="pulse" cx="50" cy="50" r="10" fill="url(#g)"/></svg><p class="muted">Follow inhale (expand), hold, exhale (contract) for a 2-minute set.</p>';
      animateBreathing(120);
    } else if(choice==='journaling'){
      exerciseBody.innerHTML = '<div class="journal-box"><p class="muted">Write one short answer to each prompt. Set a 4-minute timer; aim for clarity not length.</p><ol><li>What matters most today?</li><li>One small step I can take:</li><li>How will I notice progress?</li></ol></div>';
      prepareTimer(240,function(){ alert('Journaling time is over — breathe, close the page and review.'); });
    } else if(choice==='intention' || choice==='intention setting'){
      exerciseBody.innerHTML = '<p class="muted">Create a single intention and attach a tiny anchor you will do after a trigger (e.g., after coffee).</p><div class="intent-form"><label>Intention: <input type="text" id="intentText" placeholder="I will ..." /></label></div>';
      prepareTimer(60,function(){ var t = el('intentText')? el('intentText').value : ''; alert('Saved intention: ' + (t || '[empty]')); });
    } else {
      exerciseBody.innerHTML = '<p class="muted">Unknown choice. Try breathing, journaling, or intention.</p>';
    }
    showModal(exerciseModal);
  }

  if(tryBtn){ tryBtn.addEventListener('click', function(){ showExercise('breathing'); }); }

  function animateBreathing(seconds){
    clearActiveTimer();
    var elPulse = document.getElementById('pulse');
    var total = seconds; var start = Date.now();
    var cycle = 6; // inhale 4s, hold 2s, exhale 4s -> we'll do a simple 6s inhale/exhale rhythm
    activeTimer = setInterval(function(){
      var elapsed = Math.floor((Date.now()-start)/1000);
      var phase = elapsed % 8; // 4 inhale, 2 hold, 2 exhale
      var r = 10 + (phase<4? (phase/4)*20 : (1 - ((phase-4)/4))*20);
      if(elPulse) elPulse.setAttribute('r', r);
      if(elapsed >= total){ clearActiveTimer(); alert('Breathing set complete — notice any change in your rhythm.'); }
    },300);
  }

  function prepareTimer(seconds,done){
    clearActiveTimer();
    var started = false;
    startBtn.onclick = function(){ if(started) return; started=true; var remain = seconds; activeTimer = setInterval(function(){ remain--; if(remain<=0){ clearActiveTimer(); done && done(); } },1000); };
    stopBtn.onclick = function(){ clearActiveTimer(); };
  }

  function clearActiveTimer(){ if(activeTimer){ clearInterval(activeTimer); activeTimer = null;} }

  // Also allow start/stop in the simple breathing flow
  if(startBtn){ startBtn.addEventListener('click', function(){ /* default: start any resident prepared timer */ if(!activeTimer){ // trigger by starting a breathing if only breathing available
      var p = exerciseTitle.textContent.toLowerCase(); if(p.includes('breath')) animateBreathing(120); }
  }); }
  if(stopBtn){ stopBtn.addEventListener('click', function(){ clearActiveTimer(); }); }

  // Clicking habit quick-use buttons opens guided exercise with that habit
  qa('.habit button').forEach(function(b){ b.addEventListener('click', function(){ var h = b.getAttribute('data-habit')||'habit'; showExercise(h==='Energy Reset'?'breathing':'intention'); }); });

  // Simple escape to close modals
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ qa('.modal').forEach(function(m){ closeModal(m); }); clearActiveTimer(); } });

  // Helpers
  function stripTags(str){ return (str||'').replace(/<[^>]+>/g,''); }
  function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

})();
