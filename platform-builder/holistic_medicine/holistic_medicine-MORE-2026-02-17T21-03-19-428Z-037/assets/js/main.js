// Interactive features: inventory -> agenda, and guided short practices
document.addEventListener('DOMContentLoaded',function(){
  // Year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Inventory logic
  const form = document.getElementById('inventory-form');
  const createBtn = document.getElementById('create-agenda');
  const clearBtn = document.getElementById('clear-inventory');
  const output = document.getElementById('agenda-output');

  function summarizeSelections(selected){
    if(selected.length===0) return {title:'No areas selected', bullets:['Choose 1–3 domains to focus on in a first conversation.']};
    // build agenda: top 3 priorities then suggested checks
    const title = 'Consultation agenda — prioritized topics';
    const bullets = [];
    const priorities = selected.slice(0,3);
    bullets.push('Top priorities: ' + priorities.join(', '));
    bullets.push('Suggested measurements: sleep log, 7-day food & symptom notes, brief mood rating twice daily.');
    if(selected.includes('Sleep')) bullets.push('Sleep window review and 1–2 behavioral adjustments (timing, light exposure).');
    if(selected.includes('Nutrition')||selected.includes('Digestion')||selected.includes('Energy')) bullets.push('Diet & digestion snapshot and possible elimination trial design.');
    if(selected.includes('Stress')||selected.includes('Mood')) bullets.push('Brief stress mapping and one micro-practice to lower reactivity.');
    bullets.push('Immediate 1–3 small, measurable actions to try before the follow-up.');
    return {title,bullets};
  }

  function createCadence(selected){
    // cadence depends on complexity
    const base = [{week:0,visit:'Initial review (45–60 min)'}];
    if(selected.length<=2){
      base.push({week:4,visit:'Brief progress check (20–30 min)'});
      base.push({week:8,visit:'Review & next steps (30–45 min)'});
    } else if(selected.length<=5){
      base.push({week:2,visit:'Check-in and adjustments (20 min)'});
      base.push({week:6,visit:'Progress review (30–45 min)'});
    } else {
      base.push({week:1,visit:'Early check & troubleshooting (20 min)'});
      base.push({week:4,visit:'Formal review & measurement (30–45 min)'});
      base.push({week:8,visit:'Implementation planning (45 min)'});
    }
    return base;
  }

  createBtn.addEventListener('click',function(){
    const checked = Array.from(form.querySelectorAll('input[name="areas"]:checked')).map(i=>i.value);
    const summary = summarizeSelections(checked);
    const cadence = createCadence(checked);
    const lines = [];
    lines.push('<strong>'+escapeHtml(summary.title)+'</strong>');
    lines.push('<ul>');
    summary.bullets.forEach(b=>lines.push('<li>'+escapeHtml(b)+'</li>'));
    lines.push('</ul>');
    lines.push('<strong>Suggested follow-up cadence</strong>');
    lines.push('<ol>');
    cadence.forEach(c=>lines.push('<li>Week '+c.week+': '+escapeHtml(c.visit)+'</li>'));
    lines.push('</ol>');
    lines.push('<p class="muted">This is an educational outline, not a medical diagnosis. Use it to structure a conversation with your clinician.</p>');
    output.innerHTML = lines.join('');
    output.scrollIntoView({behavior:'smooth'});
  });

  clearBtn.addEventListener('click',function(){
    form.querySelectorAll('input[name="areas"]').forEach(i=>i.checked=false);
    output.innerHTML='';
  });

  // Guided exercise modal
  const modal = document.getElementById('exercise-modal');
  const openBtn = document.getElementById('open-exercise');
  const closeBtn = document.getElementById('close-modal');
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const tabContent = document.getElementById('tab-content');
  const nextBtn = document.getElementById('next-step');
  const skipBtn = document.getElementById('skip-step');

  const modes = {
    breath: {
      title:'Simple paced breathing (4-minute)',
      steps:[
        'Find a comfortable seated position. Rest hands in lap, lengthen your spine.',
        'Close your eyes softly. Inhale for 4 counts.',
        'Hold for 1 count. Exhale for 6 counts. Repeat for 4 minutes.',
        'Open your eyes and notice any change in ease or rhythm.'
      ],
      guide:true
    },
    journal: {
      title:'Quick journaling (6 prompts, 6 minutes)',
      steps:[
        'Set a timer for 6 minutes and write continuously.',
        'Prompt 1: What felt heavy in the last 48 hours?',
        'Prompt 2: Name one small win.',
        'Prompt 3: What is one question you would like to explore?',
        'Prompt 4: One concrete next step (even small).',
        'Finish with 30 seconds: read a line you liked and close the page.'
      ],
      guide:false
    },
    intention: {
      title:'Intention setting (3 minutes)',
      steps:[
        'Place one hand on your chest and one on your belly.',
        'Breathe twice, noticing contact and warmth.',
        'Name a single intention for this hour or day and say it silently three times.'
      ],
      guide:false
    }
  };

  function showModal(modeKey){
    modal.setAttribute('aria-hidden','false');
    modal.style.display='flex';
    modal.dataset.mode = modeKey;
    tabContent.innerHTML = renderStep(modeKey,0);
    nextBtn.textContent = modes[modeKey].guide ? 'Begin' : 'Start';
  }

  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    modal.style.display='none';
    // stop any running timers
    stopBreathTimer();
  }

  function renderStep(modeKey,stepIdx){
    const m = modes[modeKey];
    let html = '<h4>'+escapeHtml(m.title)+'</h4>';
    if(m.guide){
      html += '<p class="muted">A paced breathing guide will show a simple animation and counts.</p>';
      html += '<div id="breath-visual" class="breath-visual">';
      html += '<svg width="220" height="80" viewBox="0 0 220 80"><circle cx="110" cy="40" r="22" fill="#e9f9ee"></circle></svg>';
      html += '<div id="breath-count" style="margin-top:8px;color:var(--muted)">Ready</div>';
      html += '</div>';
    } else {
      html += '<ol>';
      m.steps.forEach(s=>html += '<li>'+escapeHtml(s)+'</li>');
      html += '</ol>';
    }
    return html;
  }

  // Tab switching
  tabs.forEach(t=>t.addEventListener('click',function(){
    tabs.forEach(x=>x.classList.remove('active'));
    this.classList.add('active');
    const mode = this.dataset.mode;
    showModal(mode);
  }));

  openBtn.addEventListener('click',function(){
    // default to breath
    tabs.forEach(x=>x.classList.remove('active'));
    tabs[0].classList.add('active');
    showModal('breath');
  });

  closeBtn.addEventListener('click',closeModal);
  skipBtn.addEventListener('click',closeModal);

  // breath guide implementation
  let breathInterval = null; let breathTimer = null; let breathStart = null;
  nextBtn.addEventListener('click',function(){
    const mode = modal.dataset.mode || 'breath';
    if(mode==='breath'){
      // start a 4-minute guided cycle: 4s in, 1s hold, 6s out => 11s cycle x ~22 cycles -> we'll do 4 minutes (240s)
      startBreathGuide(240);
      nextBtn.disabled = true; nextBtn.textContent='Running...';
    } else if(mode==='journal'){
      // open lightweight prompt for journaling
      tabContent.innerHTML = '<p class="muted">Set a timer for 6 minutes. Use the prompts on screen and write freely. Close when done.</p><ol>' + modes.journal.steps.map(s=>'<li>'+escapeHtml(s)+'</li>').join('') + '</ol>';
      nextBtn.disabled = true; nextBtn.textContent='Timer set';
      setTimeout(()=>{ nextBtn.disabled=false; nextBtn.textContent='Start'; }, 500);
    } else if(mode==='intention'){
      tabContent.innerHTML = '<p class="muted">Sit quietly for 3 minutes. Name one intention and repeat it. Notice one physical sensation after.</p>';
      nextBtn.disabled = true; nextBtn.textContent='In progress';
      setTimeout(()=>{ nextBtn.disabled=false; nextBtn.textContent='Start'; }, 500);
    }
  });

  function startBreathGuide(seconds){
    stopBreathTimer();
    const visual = document.getElementById('breath-visual');
    const count = document.getElementById('breath-count');
    let elapsed = 0;
    function cycle(){
      // inhale 4
      animateCircle(1.0,4000);
      count.textContent='Inhale 4';
      setTimeout(()=>{ count.textContent='Hold 1'; },4000);
      setTimeout(()=>{ animateCircle(0.3,6000); count.textContent='Exhale 6'; },5000);
    }
    cycle();
    breathInterval = setInterval(function(){
      elapsed += 11;
      if(elapsed>=seconds){ stopBreathTimer(); count.textContent='Complete'; document.getElementById('next-step').textContent='Done'; document.getElementById('next-step').disabled=false; }
      else cycle();
    },11000);

    // simple circle animation using CSS transform
    function animateCircle(scale,duration){
      const svg = visual.querySelector('svg');
      svg.style.transition = 'transform '+(duration/1000)+'s ease-in-out';
      svg.style.transform = 'scale('+scale+')';
    }
  }
  function stopBreathTimer(){
    if(breathInterval){ clearInterval(breathInterval); breathInterval=null; }
    const svgs = document.querySelectorAll('#breath-visual svg');
    svgs.forEach(s=>{ if(s) s.style.transform = 'scale(1)'; });
  }

  // small safe helpers
  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g,function(s){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[s];});
  }

});