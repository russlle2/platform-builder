(function(){
  // Basic helpers
  function qs(sel,root=document){return root.querySelector(sel)}
  function qsa(sel,root=document){return Array.from(root.querySelectorAll(sel))}

  // Blend builder logic
  const vibes = {
    calm: {name:'Calm', oils:[{o:'Lavender',pct:40},{o:'Sweet Marjoram',pct:20},{o:'Frankincense',pct:20},{o:'Roman Chamomile',pct:20}]},
    uplift: {name:'Uplift', oils:[{o:'Sweet Orange',pct:45},{o:'Bergamot',pct:25},{o:'Grapefruit',pct:30}]},
    focus: {name:'Focus', oils:[{o:'Rosemary',pct:40},{o:'Lemon',pct:30},{o:'Peppermint',pct:30}]},
    ground: {name:'Grounding', oils:[{o:'Vetiver',pct:35},{o:'Cedarwood',pct:35},{o:'Patchouli',pct:30}]}
  }

  function pickBlend(vibeKey,volumeML,strengthPct,safetyNote){
    const spec = vibes[vibeKey];
    if(!spec) return null;
    const totalDrops = Math.round((volumeML * (strengthPct/100)) * 20); // ~20 drops/mL
    // allocate drops by oil pct
    const oils = spec.oils.map(x=>({name:x.o, drops:Math.max(1,Math.round(totalDrops * (x.pct/100)))}));
    // adjust to exact total
    let sum = oils.reduce((s,i)=>s+i.drops,0);
    while(sum < totalDrops){ oils[0].drops++; sum++; }
    while(sum > totalDrops && oils.some(o=>o.drops>1)){ oils.find(o=>o.drops>1).drops--; sum--; }
    // dilution suggestion string
    const dilution = `${strengthPct}% dilution — ${totalDrops} drops into ${volumeML} mL carrier oil.`;
    // safety advisories
    const notes = [];
    notes.push('Patch test prior to first use (small amount on inner forearm, wait 24 hours).');
    if(safetyNote==='pets') notes.push('Use low diffusing time and ventilate rooms; some oils may be unsafe for animals. Consult your vet.');
    if(safetyNote==='pregnant') notes.push('If pregnant or nursing, consult your healthcare provider before using essential oils.');
    if(safetyNote==='sensitive') notes.push('Use lower dilutions (0.5% or less) and avoid known irritants.');
    return {title:spec.name, oils,dilution,notes};
  }

  function renderBlend(resultEl,blend){
    if(!blend){ resultEl.innerHTML='<p class="muted">No blend yet — pick a vibe to begin.</p>'; return; }
    const container = document.createElement('div');
    container.className='blend-card';
    container.innerHTML = `<h4>${blend.title} blend</h4>`;
    const list = document.createElement('ul');
    list.style.margin='8px 0';
    blend.oils.forEach(o=>{ const li=document.createElement('li'); li.textContent = `${o.name}: ${o.drops} drops`; list.appendChild(li); });
    const dil = document.createElement('p'); dil.className='muted small'; dil.textContent = blend.dilution;
    const note = document.createElement('p'); note.className='muted small'; note.textContent = blend.notes.join(' ');
    container.appendChild(list); container.appendChild(dil); container.appendChild(note);
    // share/print buttons
    const actions = document.createElement('div'); actions.style.marginTop='10px';
    const copyBtn = document.createElement('button'); copyBtn.className='btn ghost'; copyBtn.textContent='Copy card';
    copyBtn.addEventListener('click',()=>{ navigator.clipboard && navigator.clipboard.writeText(container.innerText).then(()=>{ copyBtn.textContent='Copied'; setTimeout(()=>copyBtn.textContent='Copy card',900); }); });
    actions.appendChild(copyBtn);
    container.appendChild(actions);
    resultEl.innerHTML=''; resultEl.appendChild(container);
  }

  // Form bindings
  const buildBtn = qs('#buildBlend');
  const clearBtn = qs('#clearBlend');
  const resultEl = qs('#blendResult');
  buildBtn.addEventListener('click',()=>{
    const vibe = qs('#vibe').value;
    const volume = Math.max(5,Number(qs('#volume').value)||10);
    const strengthOpt = Number(qs('#strength').value);
    const notes = qs('#notes').value;
    // strengthOpt is in percent; form uses 0.5,1,2
    const blend = pickBlend(vibe,volume,strengthOpt,notes);
    renderBlend(resultEl,blend);
  });
  clearBtn.addEventListener('click',()=>{ qs('#vibe').value='calm'; qs('#volume').value=10; qs('#strength').value='0.5'; qs('#notes').value='none'; renderBlend(resultEl,null); });

  // Initialize
  renderBlend(resultEl,null);

  // Guided exercise modal logic
  const modal = qs('#exerciseModal');
  const tryNowBtn = qs('#tryNowBtn');
  const closeModal = qs('#closeModal');
  const startExerciseBtn = qs('#startExerciseBtn');
  const cancelExerciseBtn = qs('#cancelExerciseBtn');
  const exerciseBody = qs('#exerciseBody');
  let exerciseTimer = null;
  let countdown = 0;

  function openModal(type){
    modal.setAttribute('aria-hidden','false');
    modal.style.display='flex';
    // populate body depending on type
    if(!type) type='breath';
    renderExercise(type);
  }
  function close(){ modal.setAttribute('aria-hidden','true'); modal.style.display='none'; stopTimer(); }

  function renderExercise(type){
    exerciseBody.innerHTML='';
    const title = document.createElement('div'); title.className='muted';
    const timer = document.createElement('div'); timer.className='timer'; timer.id='exerciseTimer';
    const prompt = document.createElement('p'); prompt.className='muted';
    if(type==='breath'){
      title.textContent='Grounding breath — 3 minutes'; prompt.textContent='Breathe in for 4, hold 2, out 6. Repeat. Use a gentle aroma at a distance.'; countdown=180;
    } else if(type==='intention'){
      title.textContent='Intent pause — 2 minutes'; prompt.textContent='Close your eyes, name one intention for the next hour. Breathe naturally.'; countdown=120;
    } else if(type==='journal'){
      title.textContent='Quick journal — 4 minutes'; prompt.textContent='Write freely: What do I need right now? Let sentences flow.'; countdown=240;
    } else { title.textContent='Practice'; prompt.textContent='Follow the prompts.'; countdown=120; }
    exerciseBody.appendChild(title); exerciseBody.appendChild(timer); exerciseBody.appendChild(prompt);
    qs('#startExerciseBtn').textContent='Start';
    qs('#startExerciseBtn').onclick = ()=>{ startExerciseTimer(timer,countdown); qs('#startExerciseBtn').disabled=true; };
  }

  function startExerciseTimer(timerEl,seconds){
    let s = seconds; timerEl.textContent=formatTime(s);
    exerciseTimer = setInterval(()=>{
      s--; timerEl.textContent=formatTime(s);
      if(s<=0){ stopTimer(); timerEl.textContent='Done'; setTimeout(()=>close(),1200); }
    },1000);
  }
  function stopTimer(){ if(exerciseTimer){ clearInterval(exerciseTimer); exerciseTimer=null; qs('#startExerciseBtn') && (qs('#startExerciseBtn').disabled=false); } }

  function formatTime(s){ const m = Math.floor(s/60); const sec = s%60; return `${m}:${sec.toString().padStart(2,'0')}`; }

  tryNowBtn.addEventListener('click',()=>openModal('breath'));
  qsa('.startExercise').forEach(btn=>{ btn.addEventListener('click',(e)=>{ const t=e.currentTarget.dataset.type; openModal(t); }); });
  closeModal.addEventListener('click',close);
  cancelExerciseBtn.addEventListener('click',close);
  window.addEventListener('keydown',(e)=>{ if(e.key==='Escape') close(); });

  // Accessibility: focus trap minimal
  modal.addEventListener('click',(e)=>{ if(e.target===modal) close(); });

})();