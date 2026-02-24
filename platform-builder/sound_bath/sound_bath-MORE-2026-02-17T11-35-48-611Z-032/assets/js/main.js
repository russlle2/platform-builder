(function(){
  // Respect reduced motion
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll-triggered reveal
  function setupReveals(){
    const items = document.querySelectorAll('.reveal');
    if(reduceMotion){
      items.forEach(i => i.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e => {
        if(e.isIntersecting){
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    },{threshold:0.12});
    items.forEach(i => io.observe(i));
  }

  // Mobile nav toggle
  function setupNav(){
    const btn = document.querySelector('.mobile-toggle');
    const nav = document.querySelector('.nav-list');
    if(!btn || !nav) return;
    btn.addEventListener('click',()=>{
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      nav.style.display = open ? 'none' : 'flex';
    });
  }

  // Session Planner widget
  function buildPlanSummary(instance){
    const length = instance.querySelector('select[name="length"]').value;
    const aim = instance.querySelector('select[name="aim"]').value;
    const notes = (instance.querySelector('input[name="notes"]') || {value:''}).value || '';
    const elementNodes = instance.querySelectorAll('input[name="elements"]');
    const elements = [];
    elementNodes.forEach(n => { if(n.checked) elements.push(n.value); });
    // Friendly labels map
    const labels = { 'singing-bowls':'Singing bowls', 'gong':'Gong touch', 'voice':'Guided voice', 'breath':'Breath cueing' };
    const elementText = elements.length ? elements.map(e => labels[e]||e).join(', ') : 'Standard set (bowls + voice)';

    const summary = [];
    summary.push('Session Plan — quick export');
    summary.push('Length: ' + length);
    summary.push('Focus: ' + aim);
    summary.push('Elements: ' + elementText);
    if(notes) summary.push('Notes: ' + notes);
    summary.push('\nSuggested structure:');
    summary.push('- Arrival & orientation (5-10 min) — set intention, safety check.');
    summary.push('- Focused sound phase (' + Math.max(10, parseInt(length) - 20) + ' min) — guided layers with clear timing.');
    summary.push('- Reintegration (5-10 min) — short practice to keep.');
    summary.push('\nPlease mention any medical considerations when booking.');
    return summary.join('\n');
  }

  function setupPlanners(){
    const planners = document.querySelectorAll('.session-planner');
    planners.forEach(planner => {
      const output = planner.querySelector('.planner-output');
      const action = planner.querySelector('.planner-action');
      const copyBtn = planner.querySelector('.copy-plan');
      const resetBtn = planner.querySelector('.reset-plan');

      if(action){
        action.addEventListener('click',()=>{
          const summary = buildPlanSummary(planner);
          if(output.tagName === 'PRE') output.textContent = summary; else output.textContent = summary;
        });
      }
      if(copyBtn){
        copyBtn.addEventListener('click',async()=>{
          const current = output.textContent.trim();
          if(!current){
            // Generate then copy
            const summary = buildPlanSummary(planner);
            try{ await navigator.clipboard.writeText(summary); copyBtn.textContent = 'Copied!'; setTimeout(()=>copyBtn.textContent='Copy summary',1500);}catch(e){fallbackCopy(summary,copyBtn)}
            return;
          }
          try{
            await navigator.clipboard.writeText(current);
            copyBtn.textContent = 'Copied!';
            setTimeout(()=>{ copyBtn.textContent = 'Copy summary'; },1500);
          }catch(e){fallbackCopy(current,copyBtn)}
        });
      }

      if(resetBtn){
        resetBtn.addEventListener('click',()=>{
          const inputs = planner.querySelectorAll('input,select');
          inputs.forEach(i => { if(i.type==='checkbox') i.checked=false; else if(i.tagName==='SELECT') i.selectedIndex=0; else i.value=''; });
          if(output) output.textContent = '';
        });
      }
    });

    // Copy fallback
    function fallbackCopy(text,btn){
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try{ document.execCommand('copy'); btn.textContent='Copied!'; setTimeout(()=>btn.textContent='Copy summary',1500);}catch(e){ alert('Copy failed — please select and copy manually'); }
      document.body.removeChild(ta);
    }
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded',()=>{
    setupReveals();
    setupNav();
    setupPlanners();
  });
})();