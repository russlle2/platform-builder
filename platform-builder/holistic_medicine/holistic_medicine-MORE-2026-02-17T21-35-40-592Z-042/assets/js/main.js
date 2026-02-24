(function(){
  // Utility
  function qs(sel,ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel,ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Respect prefers-reduced-motion
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll reveal
  function setupReveal(){
    const targets = qsa('.reveal');
    if(reduce){ targets.forEach(t=>t.classList.add('visible')); return; }
    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    },{threshold:0.12});
    targets.forEach(t=>obs.observe(t));
  }

  // Planner logic
  function makePlanSummary(data){
    // Build a readable plan with gentle language and measurable steps
    const lines = [];
    lines.push('Session Plan — ' + new Date().toLocaleDateString());
    lines.push('Concern: ' + (data.concern||'[not provided]'));
    lines.push('Snapshot: energy '+(data.energy||'n/a')+', sleep '+(data.sleep||'n/a')+', stress '+(data.stress||'n/a'));
    if(data.prefs) lines.push('Preferences / constraints: ' + data.prefs);
    lines.push('');

    // Simple prioritized recommendations
    lines.push('Top priorities (3 small tests):');
    // Create three suggestions based on simple rules
    const sugg = [];
    if((data.sleep||'').toLowerCase().includes('poor') || data.energy<=4){
      sugg.push('Evening rhythm: keep lights low 60–90 minutes before bed; limit heavy meals and screens.');
    } else {
      sugg.push('Maintain current evening routine; consider adding a 10-minute wind-down if sleep fluctuates.');
    }
    if(data.stress>=7){
      sugg.push('Micro stress practices: 3 short pauses per day (1–3 minutes) focused on breathing or grounding.');
    } else {
      sugg.push('Maintain current stress supports; add a short midday movement break if feasible.');
    }
    if(data.prefs && /digest/i.test(data.prefs)){
      sugg.push('Diet check: keep a simple 1-week food-and-symptom log; review patterns after 7–14 days.');
    } else {
      sugg.push('Light movement: 10–20 minutes most days; choose timing that fits your schedule.');
    }
    sugg.slice(0,3).forEach((s,i)=>lines.push((i+1)+'. '+s));

    lines.push('');
    lines.push('Measures: pick 2 simple signals to watch (eg, sleep hours, energy rating, bowel pattern) and log nightly.');
    lines.push('Review: plan a brief check-in in 2 weeks to adjust.');
    lines.push('Notes: This is educational guidance. Coordinate with other clinicians as needed.');
    return lines.join('\n');
  }

  function wirePlanner(rootForm, outputEl, exportWrap){
    const form = rootForm;
    const output = outputEl;
    const exportBox = exportWrap;
    function getData(){
      const fd = new FormData(form);
      return {
        concern: fd.get('concern')||'',
        energy: Number(fd.get('energy')||5),
        sleep: fd.get('sleep')||'',
        stress: Number(fd.get('stress')||6),
        prefs: fd.get('prefs')||''
      };
    }
    function renderPlan(){
      const data = getData();
      const txt = makePlanSummary(data);
      output.textContent = txt.split('\n').slice(0,6).join('\n'); // short preview
      // Prepare export
      const ta = exportBox.querySelector('#plan-text');
      if(ta){ ta.value = txt; exportBox.hidden = false; const dl = exportBox.querySelector('#download-plan'); dl.href = 'data:text/plain;charset=utf-8,'+encodeURIComponent(txt); }
    }
    function reset(){ form.reset(); output.textContent = ''; if(exportBox){ exportBox.hidden=true; } }

    // Buttons
    const build = form.querySelector('#build-plan');
    const resetBtn = form.querySelector('#reset-plan');
    if(build) build.addEventListener('click', renderPlan);
    if(resetBtn) resetBtn.addEventListener('click', reset);

    // Copy handler
    const copyBtn = document.getElementById('copy-plan');
    if(copyBtn){ copyBtn.addEventListener('click', function(){ const ta = document.getElementById('plan-text'); if(!ta) return; navigator.clipboard && navigator.clipboard.writeText(ta.value).then(()=>{ copyBtn.textContent='Copied'; setTimeout(()=>copyBtn.textContent='Copy summary',1800); }).catch(()=>{ try{ ta.select(); document.execCommand('copy'); copyBtn.textContent='Copied'; setTimeout(()=>copyBtn.textContent='Copy summary',1800); }catch(e){alert('Copy failed: select and copy manually.');}}); }); }
  }

  // Compact planner
  function wireCompact(){
    const form = qs('#session-planner-compact');
    if(!form) return;
    const btn = qs('#build-compact');
    const out = qs('#compact-output');
    btn.addEventListener('click', function(){
      const fd = new FormData(form);
      const concern = fd.get('concern')||'[no concern]';
      const priority = fd.get('priority')||'Priority';
      const txt = ['Quick Plan','Concern: '+concern,'Priority: '+priority,'1. Pick one small, measurable step to try for 7–14 days','2. Track one signal and note change','3. Reassess after the trial'].join('\n');
      out.textContent = txt;
    });
  }

  // On DOM ready
  document.addEventListener('DOMContentLoaded', function(){
    setupReveal();

    // Year
    const y = new Date().getFullYear(); qs('#year').textContent = y;

    // Phone button
    const phoneBtn = qs('#phone-btn'); if(phoneBtn){ phoneBtn.addEventListener('click',()=>{ window.location.href = 'tel:'+encodeURIComponent('{{PHONE}}'); }); }

    // Wire planners
    const sp = qs('#session-planner'); const out = qs('#plan-output'); const expWrap = qs('#plan-export'); if(sp && out){ wirePlanner(sp,out,expWrap); }
    // Also handle copy button (global)
    const copyBtn = qs('#copy-plan'); if(copyBtn){ copyBtn.addEventListener('click', ()=>{}); }

    wireCompact();

  });
})();