(function(){
  // Utilities
  function qs(sel, ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Year in footer
  var yr = qs('#yr'); if(yr) yr.textContent = new Date().getFullYear();

  // Scroll-triggered reveal (with prefers-reduced-motion support)
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealTargets = qsa('[data-reveal]');
  if(prefersReduced){ revealTargets.forEach(function(el){ el.classList.add('revealed'); }); }
  else if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('revealed'); io.unobserve(e.target); }
      });
    },{rootMargin:'-10% 0px',threshold:0.08});
    revealTargets.forEach(function(el){ io.observe(el); });
  } else { revealTargets.forEach(function(el){ el.classList.add('revealed'); }); }

  // Session Planner widget
  var form = qs('#planner-form');
  var buildBtn = qs('#build-plan');
  var copyBtn = qs('#copy-plan');
  var downloadBtn = qs('#download-plan');
  var output = qs('#plan-output');

  function gatherForm(){
    var data = {};
    var f = new FormData(form);
    data.name = (f.get('name')||'').trim();
    data.goal = (f.get('goal')||'').trim();
    data.days = f.get('days')||'3';
    data.minutes = f.get('minutes')||'10';
    data.barriers = (f.get('barriers')||'').trim();
    var focuses = f.getAll('focus')||[];
    data.focuses = focuses;
    return data;
  }

  function buildPlanText(d){
    var lines = [];
    lines.push('Cohort Plan — ' + (d.name || 'Participant'));
    lines.push('Primary goal: ' + (d.goal || '—'));
    lines.push('Commitment: ' + d.days + ' days/week, ' + d.minutes + ' minutes/day');
    if(d.focuses && d.focuses.length){
      lines.push('Focus areas: ' + d.focuses.join(', '));
    } else {
      lines.push('Focus areas: (none selected)');
    }
    if(d.barriers) lines.push('Anticipated barriers: ' + d.barriers);

    // Simple micro-habit suggestions (non-medical)
    lines.push('\nSuggested micro-practices:');
    if(d.focuses.indexOf('Movement')>-1) lines.push('- Movement: 7-minute mobility sequence after waking (3x/wk build to daily)');
    if(d.focuses.indexOf('Sleep')>-1) lines.push('- Sleep: 10-minute wind-down with reduced screen time + breathing cues 30m before bed');
    if(d.focuses.indexOf('Nutrition')>-1) lines.push('- Nutrition: One 200-calorie protein-rich snack between meals on training days');
    if(d.focuses.indexOf('Stress')>-1) lines.push('- Stress & calm: Two short grounding exercises (2–5 mins) during midday dips');
    if(d.focuses.indexOf('Routines')>-1) lines.push('- Routines: 3-step morning anchor to start the day consistently');

    lines.push('\nWeek-by-week plan:');
    lines.push('Week 1: orient + pick baseline micro-habit');
    lines.push('Weeks 2–4: layer practices; weekly lab to refine technique');
    lines.push('Weeks 5–6: consolidate, craft a sustainable maintenance template');

    lines.push('\nNotes: This is coaching guidance focused on habits and frameworks, not medical advice.\n');
    return lines.join('\n');
  }

  buildBtn && buildBtn.addEventListener('click', function(){
    var data = gatherForm();
    if(!data.goal){ output.textContent = 'Please add a clear primary goal to get a tailored plan.'; copyBtn.disabled=true; downloadBtn.disabled=true; return; }
    var text = buildPlanText(data);
    output.textContent = text;
    copyBtn.disabled = false; downloadBtn.disabled = false;
  });

  copyBtn && copyBtn.addEventListener('click', function(){
    var text = output.textContent || '';
    if(!text) return;
    navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text).then(function(){
      copyBtn.textContent = 'Copied!'; setTimeout(function(){ copyBtn.textContent='Copy text'; },1500);
    }) : (function(){
      // fallback
      var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy'); copyBtn.textContent='Copied!'; setTimeout(function(){ copyBtn.textContent='Copy text'; },1500);}catch(e){} ta.remove();
    })();
  });

  downloadBtn && downloadBtn.addEventListener('click', function(){
    var text = output.textContent || '';
    if(!text) return;
    var blob = new Blob([text],{type:'text/plain'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'cohort-plan.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  // Accessible enhancements: keyboard focus visible for buttons
  document.addEventListener('keyup', function(e){ if(e.key==='Tab') document.body.classList.add('show-focus'); });
})();
