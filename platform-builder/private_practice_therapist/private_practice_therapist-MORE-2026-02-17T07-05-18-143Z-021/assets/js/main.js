(function(){
  // Simple DOM helpers
  function q(sel, ctx){return (ctx||document).querySelector(sel)}
  function qa(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Modal logic
  var modal = q('#exerciseModal');
  var tryBtn = q('#try-exercise');
  var closeBtn = q('#closeExercise');
  tryBtn && tryBtn.addEventListener('click', function(){
    modal.setAttribute('aria-hidden','false');
  });
  closeBtn && closeBtn.addEventListener('click', function(){
    modal.setAttribute('aria-hidden','true');
    stopBreathing();
    stopJournalTimer();
  });
  modal.addEventListener('click', function(e){ if(e.target===modal){ modal.setAttribute('aria-hidden','true'); stopBreathing(); stopJournalTimer(); } });

  // Tab switching inside modal
  qa('.exercise-tabs .tab').forEach(function(tab){
    tab.addEventListener('click', function(){
      qa('.exercise-tabs .tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      var mode = tab.getAttribute('data-mode');
      qa('.exercise-panel').forEach(function(p){
        if(p.getAttribute('data-mode')===mode){ p.classList.remove('hidden') } else { p.classList.add('hidden') }
      });
    });
  });

  // Breathing exercise
  var breathLabel = q('#breathLabel');
  var breathCircle = q('.breath-circle');
  var startBtn = q('#startBreath');
  var stopBtn = q('#stopBreath');
  var breathTimer = null;
  var breathState = 0; // 0 ready, 1 inhale,2 hold,3 exhale
  var cycleCount = 0;

  function animateCircle(scale){
    breathCircle.style.transform = 'translate(0,0) scale('+scale+')';
  }
  function breathStep(){
    if(cycleCount>=4){
      breathLabel.textContent = 'Done';
      animateCircle(1);
      stopBreathing();
      return;
    }
    // 4s inhale, 2s hold, 6s exhale
    if(breathState===0 || breathState===3){ // inhale
      breathState=1; breathLabel.textContent='Inhale — 4s'; animateCircle(1.25);
      breathTimer = setTimeout(breathStep,4000);
    } else if(breathState===1){ // hold
      breathState=2; breathLabel.textContent='Hold — 2s';
      breathTimer = setTimeout(breathStep,2000);
    } else if(breathState===2){ // exhale
      breathState=3; breathLabel.textContent='Exhale — 6s'; animateCircle(0.7);
      breathTimer = setTimeout(function(){ cycleCount++; breathStep(); },6000);
    }
  }
  function startBreathing(){ if(breathTimer) return; cycleCount=0; breathState=0; breathStep(); }
  function stopBreathing(){ if(breathTimer){ clearTimeout(breathTimer); breathTimer=null } cycleCount=0; breathState=0; breathLabel.textContent='Ready'; animateCircle(1); }
  startBtn && startBtn.addEventListener('click',startBreathing);
  stopBtn && stopBtn.addEventListener('click',stopBreathing);

  // Journaling timer
  var journalTimerEl = q('#journalTimer');
  var startJournalBtn = q('#startJournal');
  var saveJournalBtn = q('#saveJournal');
  var journalText = q('#journalText');
  var journalInterval=null; var journalRemaining=0;
  function startJournalTimer(){ if(journalInterval) return; journalRemaining=300; journalTimerEl.textContent='5:00'; journalInterval = setInterval(function(){ journalRemaining--; var m=Math.floor(journalRemaining/60); var s=journalRemaining%60; journalTimerEl.textContent = m+':'+(s<10?'0'+s:s); if(journalRemaining<=0){ stopJournalTimer(); journalTimerEl.textContent='Time up'; } },1000); }
  function stopJournalTimer(){ if(journalInterval){ clearInterval(journalInterval); journalInterval=null; } }
  startJournalBtn && startJournalBtn.addEventListener('click', startJournalTimer);
  saveJournalBtn && saveJournalBtn.addEventListener('click', function(){ var text = journalText.value.trim(); if(!text) return alert('Nothing to save'); var blob = new Blob([text],{type:'text/plain'}); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'journal.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); alert('Saved'); });

  // Intention save
  var saveIntention = q('#saveIntention'); var intentionInput = q('#intentionInput'); var intentionSaved = q('#intentionSaved');
  saveIntention && saveIntention.addEventListener('click', function(){ var t = intentionInput.value.trim(); if(!t){ intentionSaved.textContent='Write a short intention first.'; return; } localStorage.setItem('savedIntention', t); intentionSaved.textContent='Intention saved.'; setTimeout(()=>{ intentionSaved.textContent=''; },2400); });
  // restore if present
  var saved = localStorage.getItem('savedIntention'); if(saved){ intentionInput.value = saved; }

  // Intake wizard: generate a short summary
  var generateBtn = q('#generateSummary'); var copyBtn = q('#copySummary'); var downloadBtn = q('#downloadSummary');
  generateBtn && generateBtn.addEventListener('click', function(){
    var checked = qa('input[name="focus"]:checked').map(function(n){return n.value;});
    if(checked.length>3) checked = checked.slice(0,3);
    var context = q('#context').value.trim();
    var helpType = q('#helpType').value;
    var lines = [];
    lines.push('Consultation summary for orientation:');
    if(checked.length){ lines.push('Primary focus: ' + checked.join(', ')); }
    if(context){ lines.push('Context: ' + context); }
    lines.push('Requested clinician support: ' + helpType);
    lines.push('Notes: I prefer a collaborative, evidence-informed approach.');
    var summary = lines.join('\n\n');
    q('#summaryText').textContent = summary;
    q('#summaryWrap').hidden = false;
    // prepare download
    var blob = new Blob([summary],{type:'text/plain'});
    var url = URL.createObjectURL(blob);
    downloadBtn.href = url;
  });

  copyBtn && copyBtn.addEventListener('click', function(){ var txt = q('#summaryText').textContent; if(!txt) return; navigator.clipboard && navigator.clipboard.writeText(txt).then(function(){ alert('Summary copied to clipboard'); }).catch(function(){ alert('Copy failed — select and copy manually'); }); });

  // Cleanup object URLs on window unload
  window.addEventListener('unload', function(){ try{ var url = downloadBtn && downloadBtn.href; if(url) URL.revokeObjectURL(url); }catch(e){} });

  // Accessible keyboard: close modal on Esc
  window.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ if(modal.getAttribute('aria-hidden')==='false'){ modal.setAttribute('aria-hidden','true'); stopBreathing(); stopJournalTimer(); } } });
})();
