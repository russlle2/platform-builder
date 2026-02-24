(function(){
  // Utility
  function qs(sel,root=document){return root.querySelector(sel)}
  function qsa(sel,root=document){return Array.from(root.querySelectorAll(sel))}

  // Year in footer
  document.addEventListener('DOMContentLoaded',function(){qs('#year').textContent=new Date().getFullYear()})

  // Modal controls
  var modal=document.getElementById('exercise-modal');
  var openBtns=[document.getElementById('open-exercise'),document.getElementById('open-exercise-hero')];
  var closeBtn=document.getElementById('close-exercise');
  openBtns.forEach(function(b){if(b) b.addEventListener('click',openModal)});
  if(closeBtn) closeBtn.addEventListener('click',closeModal);
  function openModal(){modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
  function closeModal(){modal.setAttribute('aria-hidden','true');document.body.style.overflow='';}

  // Tabs
  var tabs=qsa('.tab');
  tabs.forEach(function(t){t.addEventListener('click',function(){
    tabs.forEach(function(x){x.classList.remove('active')});
    t.classList.add('active');
    var mode=t.dataset.mode;
    qsa('.mode').forEach(function(m){m.hidden = m.dataset.mode !== mode});
  })});

  // Breathing exercise
  var breathCircle=qs('#breath-circle');
  var startBtn=qs('#start-breath');
  var stopBtn=qs('#stop-breath');
  var breathText=qs('#breath-text');
  var breathDurationSelect=qs('#breath-duration');
  var breathTimer=null;var breathPhase=0; // 0 inhale,1 hold,2 exhale,3 hold

  function updateBreathVisual(phase){
    if(!breathCircle) return;
    if(phase===0 || phase===1){ breathCircle.classList.remove('shrink'); breathCircle.classList.add('expand'); }
    else { breathCircle.classList.remove('expand'); breathCircle.classList.add('shrink'); }
  }

  function tickBreath(totalSeconds){
    var start=Date.now();
    var cycle=4000; // 4s inhale, 2s hold, 4s exhale, 2s hold = 12s cycle
    var phases=[4,2,4,2];
    function step(){
      var elapsed=(Date.now()-start)/1000;
      if(elapsed>=totalSeconds){ stopBreath(); breathText.textContent='Complete.'; return }
      // determine phase by cycle position
      var pos=(elapsed*1000)%12000; // ms
      var accum=0; var pIdx=0;
      var phaseNames=['Inhale','Hold','Exhale','Hold'];
      var phaseMs=[4000,2000,4000,2000];
      for(var i=0;i<4;i++){ accum+=phaseMs[i]; if(pos<accum){pIdx=i;break}};
      updateBreathVisual(pIdx);
      breathText.textContent=phaseNames[pIdx]+" — " + Math.ceil((totalSeconds-elapsed)) + "s left";
      breathTimer=requestAnimationFrame(step);
    }
    breathTimer=requestAnimationFrame(step);
  }
  function startBreath(){
    var dur=Number(breathDurationSelect.value)||120;
    startBtn.disabled=true; stopBtn.disabled=false;
    breathText.textContent='Starting...';
    // respect prefers-reduced-motion
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches){
      breathText.textContent='Breathing support available. Reduced motion is active.';
      // simple countdown without animations
      var end=Date.now()+dur*1000;
      var t=setInterval(function(){
        var left=Math.ceil((end-Date.now())/1000);
        breathText.textContent='Time left: '+(left>0?left:0)+'s';
        if(left<=0){clearInterval(t); stopBreath(); breathText.textContent='Complete.'}
      },250);
      return;
    }
    tickBreath(dur);
  }
  function stopBreath(){
    startBtn.disabled=false; stopBtn.disabled=true;
    if(breathTimer) cancelAnimationFrame(breathTimer);
    breathTimer=null; breathCircle.classList.remove('expand','shrink');
  }
  if(startBtn) startBtn.addEventListener('click',startBreath);
  if(stopBtn) stopBtn.addEventListener('click',stopBreath);

  // Journaling storage
  var journalInput=qs('#journal-input');
  var saveJournal=qs('#save-journal');
  var clearJournal=qs('#clear-journal');
  var JOURNAL_KEY='pp_journal_entries_v1';
  if(saveJournal){saveJournal.addEventListener('click',function(){
    var text=(journalInput.value||'').trim();
    if(!text) return alert('Nothing to save.');
    var arr=[]; try{arr=JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]')}catch(e){arr=[]}
    arr.push({text:text,ts:new Date().toISOString()});
    localStorage.setItem(JOURNAL_KEY,JSON.stringify(arr));
    alert('Saved locally to this browser.');
  })}
  if(clearJournal){clearJournal.addEventListener('click',function(){journalInput.value=''; localStorage.removeItem(JOURNAL_KEY); alert('Cleared.')})}

  // Intention storage
  var intentInput=qs('#intention-input');
  var saveIntent=qs('#save-intent');
  var clearIntent=qs('#clear-intent');
  var currentIntent=qs('#current-intent');
  var INTENT_KEY='pp_current_intent_v1';
  function loadIntent(){ try{var v=localStorage.getItem(INTENT_KEY); if(v){currentIntent.textContent='Current intention: "'+v+'"';}}catch(e){}
  }
  if(saveIntent){saveIntent.addEventListener('click',function(){var v=(intentInput.value||'').trim(); if(!v) return alert('Write an intention to set it.'); localStorage.setItem(INTENT_KEY,v); loadIntent();})}
  if(clearIntent){clearIntent.addEventListener('click',function(){localStorage.removeItem(INTENT_KEY); intentInput.value=''; currentIntent.textContent='No intention set.'})}
  loadIntent();

  // Scroll reveal implementation with prefers-reduced-motion
  var revealEls = qsa('.reveal');
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(prefersReduced){ revealEls.forEach(function(el){el.classList.add('revealed')}); }
  else{
    function onScroll(){
      var h = window.innerHeight;
      revealEls.forEach(function(el){
        var r = el.getBoundingClientRect();
        if(r.top < h - (h*0.12)) el.classList.add('revealed');
      });
    }
    onScroll();
    window.addEventListener('scroll', throttle(onScroll, 120));
    window.addEventListener('resize', throttle(onScroll, 200));
  }

  // throttle helper
  function throttle(fn, wait){var t=null, last=0;return function(){var now=Date.now(); if(last && now-last < wait) return; last=now; fn();}}

  // Close modal on ESC
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeModal(); });

})();
