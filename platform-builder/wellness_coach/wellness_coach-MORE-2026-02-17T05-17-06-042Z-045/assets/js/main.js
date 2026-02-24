(function(){
  // Progress meter: choices -> 30-day path map
  const form = document.getElementById('goal-form');
  const checkboxes = Array.from(form.querySelectorAll('input[name="goals"]'));
  const timeline = document.getElementById('timeline');
  const daysFilledEl = document.getElementById('days-filled');
  const microList = document.getElementById('micro-list');

  const goalMicro = {
    sleep: ['Wind-down 15m','Limit screens','Set wake time'],
    movement: ['5-12 min move','Short walk','Stretch sequence'],
    focus: ['25-min block','Remove distractions','Single priority'],
    stress: ['3-min breathing','Posture check','Mini-break'],
    nutrition: ['Protein at breakfast','Hydrate','Plate balance']
  };

  function buildTimeline(selected){
    // selected: array of goal keys
    const days = 30;
    timeline.innerHTML = '';
    // Determine distribution: more goals => sparser per-goal allocation
    const basePerGoal = Math.floor(days / Math.max(selected.length,1));
    const extra = days - basePerGoal * Math.max(selected.length,1);

    // For visual mapping, create 30 rects; fill based on combined plan
    const svgNS = 'http://www.w3.org/2000/svg';
    const width = 900; const height = 60;
    const dayW = width / days;

    // For each day decide which goal (if any) is primary
    const plan = new Array(days).fill(null);
    if(selected.length === 0){
      // minimal guide: restorative prompts every 5th day
      for(let d=0; d<days; d++){
        if(d%7===6) plan[d] = 'rest';
      }
    } else {
      // rotate through selected goals but weight by number of micro-habits
      let i=0;
      for(let g=0; g<selected.length; g++){
        const count = basePerGoal + (g < extra ? 1 : 0);
        for(let k=0;k<count;k++){
          if(i<days) plan[i++] = selected[g];
        }
      }
      while(i<days) plan[i++] = selected[0];
    }

    // Render day segments
    plan.forEach((p, idx)=>{
      const rect = document.createElementNS(svgNS,'rect');
      rect.setAttribute('x', (idx*dayW).toString());
      rect.setAttribute('y', '8');
      rect.setAttribute('width', Math.max(2, dayW-2).toString());
      rect.setAttribute('height', '44');
      rect.setAttribute('rx','6');
      rect.setAttribute('data-day', (idx+1).toString());
      rect.classList.add('day-seg');
      if(!p) { rect.setAttribute('fill','#062028'); }
      else if(p==='rest') { rect.setAttribute('fill','#2b4750'); }
      else {
        const color = colorForGoal(p);
        rect.setAttribute('fill', color);
        rect.setAttribute('data-goal', p);
      }
      rect.addEventListener('mouseenter', onSegHover);
      rect.addEventListener('focus', onSegHover);
      timeline.appendChild(rect);
    });

    // Micro-list: show first 7 days overview
    microList.innerHTML = '';
    const previewDays = 7;
    for(let d=0; d<previewDays; d++){
      const g = plan[d];
      const el = document.createElement('div');
      el.className = 'micro-item';
      el.textContent = 'Day '+(d+1)+': ' + (g ? (goalMicro[g] ? goalMicro[g][0] : 'Restorative prompt') : 'Rest day');
      microList.appendChild(el);
    }

    // Update filled counter
    const filled = plan.filter(p=>p).length;
    daysFilledEl.textContent = filled;
  }

  function onSegHover(e){
    const goal = e.target.getAttribute('data-goal');
    if(!goal) return;
    const title = goal.charAt(0).toUpperCase()+goal.slice(1);
    const actions = goalMicro[goal] ? goalMicro[goal].slice(0,2).join(' • ') : '';
    const tip = title + ' — ' + actions;
    // simple tooltip near cursor
    let tipEl = document.getElementById('seg-tip');
    if(!tipEl){
      tipEl = document.createElement('div'); tipEl.id='seg-tip';
      tipEl.style.position='absolute';tipEl.style.background='#042029';tipEl.style.color='#bff0e6';
      tipEl.style.padding='6px 10px';tipEl.style.borderRadius='6px';tipEl.style.pointerEvents='none';
      document.body.appendChild(tipEl);
    }
    tipEl.textContent = tip;
    const rect = e.target.getBoundingClientRect();
    tipEl.style.left = (rect.left + window.scrollX + 8)+'px';
    tipEl.style.top = (rect.top + window.scrollY - 34)+'px';
    tipEl.style.display='block';
    e.target.addEventListener('mouseleave',()=>{tipEl.style.display='none'})
  }

  function colorForGoal(key){
    switch(key){
      case 'sleep': return '#6ad1b6';
      case 'movement': return '#60b5ff';
      case 'focus': return '#f6c86a';
      case 'stress': return '#ff9f7a';
      case 'nutrition': return '#b38cff';
      default: return '#6e7b83'
    }
  }

  // Form interactions
  checkboxes.forEach(cb=>cb.addEventListener('change', ()=>{
    const selected = checkboxes.filter(c=>c.checked).map(c=>c.value).slice(0,3);
    // enforce max 3
    if(selected.length>=3){
      checkboxes.forEach(c=>{ if(!c.checked) c.disabled=true; });
    } else { checkboxes.forEach(c=>c.disabled=false); }
    buildTimeline(selected);
  }));

  // Initial empty timeline
  buildTimeline([]);

  // Proof Gallery: rotating testimonials + badge tooltips
  const proofs = Array.from(document.querySelectorAll('#proof-gallery .testimonial'));
  let proofIndex = 0; let proofTimer = null;
  const prevBtn = document.getElementById('proof-prev');
  const nextBtn = document.getElementById('proof-next');

  function showProof(i){
    proofs.forEach(p=>p.hidden=true);
    const t = proofs[i]; if(t) t.hidden=false;
    proofIndex = i;
  }

  prevBtn.addEventListener('click', ()=>{ showProof((proofIndex-1+proofs.length)%proofs.length); resetProofTimer(); });
  nextBtn.addEventListener('click', ()=>{ showProof((proofIndex+1)%proofs.length); resetProofTimer(); });

  function rotateProofs(){
    showProof((proofIndex+1)%proofs.length);
  }
  function resetProofTimer(){ clearInterval(proofTimer); proofTimer = setInterval(rotateProofs,5000); }
  resetProofTimer();

  // Badges tooltips
  const badges = document.querySelectorAll('.badge');
  const badgeTip = document.getElementById('badge-tip');
  badges.forEach(b=>{
    b.addEventListener('mouseenter', (ev)=>{
      badgeTip.textContent = b.getAttribute('data-tip');
      badgeTip.style.display='block';
      const r = b.getBoundingClientRect();
      badgeTip.style.left = (r.left + window.scrollX)+'px';
      badgeTip.style.top = (r.bottom + window.scrollY + 8)+'px';
      badgeTip.setAttribute('aria-hidden','false');
    });
    b.addEventListener('mouseleave', ()=>{ badgeTip.style.display='none'; badgeTip.setAttribute('aria-hidden','true'); });
    b.addEventListener('focus', (ev)=>{ b.dispatchEvent(new Event('mouseenter')); });
    b.addEventListener('blur', ()=>{ b.dispatchEvent(new Event('mouseleave')); });
  });

})();