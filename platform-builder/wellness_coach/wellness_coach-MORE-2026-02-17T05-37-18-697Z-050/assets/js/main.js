(function(){
  // Utilities
  const el = id=>document.getElementById(id);
  const qs = sel=>document.querySelector(sel);

  // Year in footer
  const yearEl = el('year'); if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Guided exercise modal
  const modal = el('exerciseModal');
  const tryBtns = [el('tryNowBtn'), el('tryNowBtn2')];
  const closeModal = el('closeModal');
  const exerciseArea = el('exerciseArea');

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    renderExercise();
  }
  function close(){
    modal.setAttribute('aria-hidden','true');
    exerciseArea.innerHTML = '';
    stopBreath();
  }
  tryBtns.forEach(b=>{ if(b) b.addEventListener('click', openModal); });
  if(closeModal) closeModal.addEventListener('click', close);

  // Switch exercise type
  document.addEventListener('change', e=>{
    if(e.target && e.target.name==='exercise') renderExercise();
  });

  // BREATHING exercise
  let breathTimer = null; let breathPhase = 0; // 0 inhale,1 hold,2 exhale
  function startBreath(elRoot){
    const ring = elRoot.querySelector('.breath-ring');
    const label = elRoot.querySelector('.breath-label');
    const phases = [4,1,6]; // inhale, hold, exhale seconds
    breathPhase = 0; let phaseRemaining = phases[breathPhase];
    label.textContent = 'Ready';
    breathTimer = setInterval(()=>{
      phaseRemaining--;
      if(phaseRemaining<=0){
        breathPhase=(breathPhase+1)%3; phaseRemaining=phases[breathPhase];
      }
      const phaseNames = ['Inhale','Hold','Exhale'];
      label.textContent = phaseNames[breathPhase]+ ' • ' + phaseRemaining + 's';
      // subtle scale animation
      const scale = 1 + (breathPhase===0? (1 - phaseRemaining/phases[0])*0.18 : (breathPhase===2? (phaseRemaining/phases[2])*0.12 : 0));
      ring.style.transform = 'scale('+scale+')';
    },1000);
  }
  function stopBreath(){ if(breathTimer){ clearInterval(breathTimer); breathTimer=null; }}

  // JOURNAL exercise
  function journalingRender(root){
    root.innerHTML = '';
    const prompts = [
      'One small success from today:',
      'A friction I noticed:',
      'One simple shift for tomorrow:'
    ];
    prompts.forEach((p,i)=>{
      const label = document.createElement('label'); label.style.display='block'; label.style.marginBottom='8px';
      label.textContent = p;
      const ta = document.createElement('textarea'); ta.rows=3; ta.style.width='100%'; ta.dataset.idx=i;
      // load draft
      const draft = localStorage.getItem('journalDraft_'+i); if(draft) ta.value=draft;
      ta.addEventListener('input',()=> localStorage.setItem('journalDraft_'+i, ta.value));
      root.appendChild(label); root.appendChild(ta);
    });
    const done = document.createElement('button'); done.className='btn primary'; done.textContent='Save entry';
    done.addEventListener('click',()=>{
      // simple save: combine and timestamp
      const lines = Array.from(root.querySelectorAll('textarea')).map(t=>t.value.trim());
      const entry = {time:new Date().toISOString(),answers:lines};
      const store = JSON.parse(localStorage.getItem('journalEntries')||'[]'); store.unshift(entry); localStorage.setItem('journalEntries',JSON.stringify(store));
      alert('Entry saved locally.');
    });
    root.appendChild(document.createElement('div'));
    root.appendChild(done);
  }

  // INTENTION exercise
  function intentionRender(root){
    root.innerHTML='';
    const label = document.createElement('label'); label.textContent='Set a brief intention (one line)';
    const input = document.createElement('input'); input.placeholder='I will...'; input.style.width='100%';
    const save = document.createElement('button'); save.className='btn primary'; save.textContent='Commit';
    save.addEventListener('click',()=>{
      const val = input.value.trim(); if(!val){alert('Write a short intention.');return}
      const intentions = JSON.parse(localStorage.getItem('intentions')||'[]'); intentions.unshift({time:new Date().toISOString(),text:val}); localStorage.setItem('intentions',JSON.stringify(intentions));
      alert('Intention saved. Keep it visible.');
    });
    root.appendChild(label); root.appendChild(input); root.appendChild(save);
  }

  function renderExercise(){
    const sel = document.querySelector('input[name="exercise"]:checked');
    const val = sel? sel.value : 'breath';
    exerciseArea.innerHTML='';
    if(val==='breath'){
      const root = document.createElement('div');
      root.innerHTML = '<div class="breath-ring" aria-hidden="true"><svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="rgba(43,108,176,0.2)" stroke-width="1.6"/></svg></div><div style="text-align:center;margin-top:8px;"><div class="breath-label">Starting...</div></div>';
      exerciseArea.appendChild(root);
      startBreath(root);
    } else if(val==='journal'){
      journalingRender(exerciseArea);
    } else if(val==='intention'){
      intentionRender(exerciseArea);
    }
  }

  // Habit builder: generate 7-day checklist
  const themeInput = el('themeInput');
  const actionA = el('actionA');
  const actionB = el('actionB');
  const generateBtn = el('generateBtn');
  const randomBtn = el('randomBtn');
  const challengeArea = el('challengeArea');
  const challengeTitle = el('challengeTitle');
  const challengeList = el('challengeList');
  const printBtn = el('printBtn');
  const saveBtn = el('saveBtn');

  const samples = [
    {theme:'Morning clarity',a:'3-minute breathwork',b:'One-line journal'},
    {theme:'Focus launch',a:'Point-form plan',b:'30-second stretch'},
    {theme:'Calm evening',a:'2-minute breath',b:'List one win'},
    {theme:'Busy day reset',a:'Single priority',b:'2-minute walk'}
  ];

  function renderChecklist(theme,a,b){
    challengeTitle.textContent = theme + ' — 7-day checklist';
    challengeList.innerHTML = '';
    for(let i=1;i<=7;i++){
      const li = document.createElement('li');
      li.innerHTML = '<strong>Day '+i+':</strong> <label><input type="checkbox" /> '+a+'; <small>'+b+'</small></label>';
      challengeList.appendChild(li);
    }
    challengeArea.hidden = false;
  }

  generateBtn.addEventListener('click', ()=>{
    const theme = (themeInput.value || '').trim() || '7-day micro-challenge';
    const a = (actionA.value || '').trim() || 'Small practice';
    const b = (actionB.value || '').trim() || 'Quick note';
    renderChecklist(theme,a,b);
  });

  randomBtn.addEventListener('click', ()=>{
    const pick = samples[Math.floor(Math.random()*samples.length)];
    themeInput.value = pick.theme; actionA.value = pick.a; actionB.value = pick.b;
    renderChecklist(pick.theme,pick.a,pick.b);
  });

  // Print function: open printable area in new window
  printBtn.addEventListener('click', ()=>{
    const wrapper = document.createElement('div');
    wrapper.id='printableChecklist';
    wrapper.innerHTML = '<h2>'+challengeTitle.textContent+'</h2>' + challengeList.outerHTML + '<p>Created: '+new Date().toLocaleString()+'</p>';
    document.body.appendChild(wrapper);
    window.print();
    setTimeout(()=>{document.body.removeChild(wrapper);},500);
  });

  // Save to device as JSON
  saveBtn.addEventListener('click', ()=>{
    const items = Array.from(challengeList.querySelectorAll('li')).map(li=>li.textContent.trim());
    const payload = {title:challengeTitle.textContent,items:items,created:new Date().toISOString()};
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='challenge.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  // Close modal on Escape
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') close(); });
})();