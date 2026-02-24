// Core interactive behaviors: intake wizard + guided exercises
(function(){
  // Simple helper
  function qs(s, ctx){return (ctx||document).querySelector(s)}
  function qsa(s, ctx){return Array.from((ctx||document).querySelectorAll(s))}

  // WIZARD
  var wizard = document.getElementById('wizard-steps');
  if(wizard){
    var steps = qsa('.step', wizard);
    var index = 0;
    function show(i){
      steps.forEach(function(s,si){
        s.classList.toggle('active', si===i);
      });
      index = i;
    }
    qsa('.next', wizard).forEach(function(btn){btn.addEventListener('click', function(){ if(index < steps.length-1) show(index+1); })});
    qsa('.prev', wizard).forEach(function(btn){btn.addEventListener('click', function(){ if(index>0) show(index-1); })});

    document.getElementById('wizard-done').addEventListener('click', function(){
      var a = qs('#q1').value.trim();
      var b = qs('#q2').value.trim();
      var c = qs('#q3').value.trim();
      var d = qs('#q4').value.trim();
      var out = [];
      out.push('What brings you in now:'); out.push(a || '(no response)');
      out.push('\nWhat you\'ve tried:'); out.push(b || '(no response)');
      out.push('\nWhat would help early on:'); out.push(c || '(no response)');
      out.push('\nPreferences / boundaries:'); out.push(d || '(no response)');
      var summary = out.join('\n');
      var summaryBox = qs('#summary-output');
      summaryBox.textContent = summary;
      qs('#wizard-summary').hidden = false;
      // scroll to summary
      qs('#wizard-summary').scrollIntoView({behavior:'smooth'});
    });

    document.getElementById('copy-summary').addEventListener('click', function(){
      var s = qs('#summary-output').textContent;
      navigator.clipboard && navigator.clipboard.writeText(s).then(function(){
        alert('Summary copied. You can paste this into an email or bring it to your consultation.');
      }, function(){
        alert('Copy failed. You can select and copy the text manually.');
      });
    });
  }

  // EXERCISES: breathing, journaling, intention
  var modal = qs('#exercise-modal');
  var exerciseArea = qs('#exercise-area');
  function openModal(content){
    exerciseArea.innerHTML = '';
    exerciseArea.appendChild(content);
    modal.hidden = false;
  }
  function closeModal(){ modal.hidden = true; exerciseArea.innerHTML = ''; }
  qs('#close-exercise').addEventListener('click', closeModal);
  window.addEventListener('click', function(e){ if(e.target===modal) closeModal(); });

  // Breathing exercise
  function createBreathing(){
    var container = document.createElement('div');
    var title = document.createElement('h3'); title.textContent = '3-minute paced breathing';
    var instr = document.createElement('p'); instr.textContent = 'Follow the guides below. Breathe in, hold, breathe out. Repeat for a few cycles.';
    var circle = document.createElement('div'); circle.className = 'breath-circle';
    var status = document.createElement('p'); status.className = 'breath-status'; status.textContent = 'Ready';
    var start = document.createElement('button'); start.textContent = 'Start'; start.className='primary';
    container.appendChild(title); container.appendChild(instr); container.appendChild(circle); container.appendChild(status); container.appendChild(start);

    // style for breathing circle
    var css = '.breath-circle{width:120px;height:120px;border-radius:999px;background:linear-gradient(135deg,var(--accent),var(--brand));margin:14px auto;transition:transform 3s linear;box-shadow:0 8px 20px rgba(30,95,122,0.12)}';
    if(!document.getElementById('breath-css')){
      var s = document.createElement('style'); s.id='breath-css'; s.textContent = css; document.head.appendChild(s);
    }

    var running=false, timer=null, phase=0, cycle=0, totalCycles=6; // about 3 minutes
    function update(){
      // phases: 0 inhale(4s), 1 hold(2s), 2 exhale(4s) -> timing smoothed via setTimeout
      if(!running) return;
      if(phase===0){ status.textContent='Breathe in'; circle.style.transform='scale(1.2)'; setTimeout(function(){ phase=1; update(); }, 4000); }
      else if(phase===1){ status.textContent='Hold gently'; setTimeout(function(){ phase=2; update(); }, 2000); }
      else if(phase===2){ status.textContent='Breathe out'; circle.style.transform='scale(0.8)'; setTimeout(function(){ phase=0; cycle++; if(cycle>=totalCycles){ stop(); } else update(); }, 4000); }
    }
    function startBreath(){ if(running) return; running=true; phase=0; cycle=0; start.textContent='Stop'; update(); }
    function stop(){ running=false; start.textContent='Start'; status.textContent='Complete'; circle.style.transform='scale(1)'; }
    start.addEventListener('click', function(){ if(running) stop(); else startBreath(); });
    return container;
  }

  // Journaling prompt
  function createJournaling(){
    var container = document.createElement('div');
    var title = document.createElement('h3'); title.textContent = '2-minute journaling prompt';
    var instr = document.createElement('p'); instr.textContent = 'Write without editing for two minutes. Try the prompt below.';
    var prompt = document.createElement('blockquote'); prompt.textContent = 'Prompt: What small step could I take this week that aligns with my values?';
    var ta = document.createElement('textarea'); ta.placeholder = 'Write freely here...'; ta.style.width='100%'; ta.style.minHeight='120px';
    var controls = document.createElement('div'); controls.style.marginTop='8px';
    var start = document.createElement('button'); start.textContent='Start 2-minute timer'; start.className='primary';
    var timerLabel = document.createElement('span'); timerLabel.style.marginLeft='12px';
    controls.appendChild(start); controls.appendChild(timerLabel);
    container.appendChild(title); container.appendChild(instr); container.appendChild(prompt); container.appendChild(ta); container.appendChild(controls);

    var timer=null, remaining=120;
    start.addEventListener('click', function(){ if(timer) { clearInterval(timer); timer=null; start.textContent='Start 2-minute timer'; timerLabel.textContent=''; return; } remaining=120; start.textContent='Stop'; timerLabel.textContent='2:00'; timer=setInterval(function(){ remaining--; timerLabel.textContent = Math.floor(remaining/60)+":"+(remaining%60).toString().padStart(2,'0'); if(remaining<=0){ clearInterval(timer); timer=null; start.textContent='Start 2-minute timer'; timerLabel.textContent='Done'; } },1000); });
    return container;
  }

  // Intention setting
  function createIntention(){
    var container = document.createElement('div');
    var title = document.createElement('h3'); title.textContent = 'Set an intention';
    var instr = document.createElement('p'); instr.textContent = 'Choose a short, actionable intention you can revisit later.';
    var input = document.createElement('input'); input.type='text'; input.placeholder='I intend to...'; input.style.width='100%'; input.style.padding='8px'; input.style.border='1px solid #dfeff6'; input.style.borderRadius='6px';
    var save = document.createElement('button'); save.textContent='Save intention'; save.className='primary';
    var note = document.createElement('p'); note.style.fontSize='13px'; note.style.color='var(--muted)'; note.textContent='This intention is for your personal use; it is not stored or sent.';
    container.appendChild(title); container.appendChild(instr); container.appendChild(input); container.appendChild(save); container.appendChild(note);
    save.addEventListener('click', function(){ var val = input.value.trim(); if(!val){ alert('Please enter a short intention.'); return;} navigator.clipboard && navigator.clipboard.writeText('Intention: '+val).then(function(){ alert('Intention copied to clipboard. Bring this note to your next session if helpful.'); }, function(){ alert('Intention ready: '+val); }); closeModal(); });
    return container;
  }

  // UI triggers
  var tryBtn = document.getElementById('try-exercise');
  if(tryBtn){ tryBtn.addEventListener('click', function(){ openModal(createBreathing()); }); }
  var openBreath = document.getElementById('open-breath'); if(openBreath){ openBreath.addEventListener('click', function(){ openModal(createBreathing()); }); }
  var openJournal = document.getElementById('open-journal'); if(openJournal){ openJournal.addEventListener('click', function(){ openModal(createJournaling()); }); }
  var openIntent = document.getElementById('open-intent'); if(openIntent){ openIntent.addEventListener('click', function(){ openModal(createIntention()); }); }

  // Quick self-check button opens wizard section
  var wizardBtn = document.getElementById('open-wizard'); if(wizardBtn){ wizardBtn.addEventListener('click', function(){ document.getElementById('intake').scrollIntoView({behavior:'smooth'}); }); }

})();
