// Main interactive JS: scroll reveal + Session Planner widget (no libraries)
(function(){
  // utilities
  function qs(sel, ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // reveal on scroll with prefers-reduced-motion support
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = qsa('[data-reveal]');

  function revealNow(el){ el.classList.add('is-visible'); }
  function observeReveal(){
    if(prefersReduced){ revealEls.forEach(revealNow); return }
    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(e){ if(e.isIntersecting){ revealNow(e.target); io.unobserve(e.target); } });
      },{threshold:0.12});
      revealEls.forEach(function(el){ io.observe(el); });
    } else { revealEls.forEach(revealNow); }
  }
  document.addEventListener('DOMContentLoaded', observeReveal);

  // Footer year
  document.addEventListener('DOMContentLoaded',function(){
    var y = new Date().getFullYear(); var el = qs('#year'); if(el) el.textContent = y;
  });

  // Session Planner logic
  document.addEventListener('DOMContentLoaded',function(){
    var form = qs('#planner-form');
    if(!form) return;
    var buildBtn = qs('#build-plan');
    var output = qs('#plan-output');
    var planText = qs('#plan-text');
    var copyBtn = qs('#copy-plan');
    var copyConfirm = qs('#copy-confirm');
    var bookLink = qs('#book-link');

    function collect(){
      var fd = new FormData(form);
      var goal = (fd.get('goal')||'').trim();
      var time = fd.get('time');
      var intensity = fd.get('intensity');
      var notes = (fd.get('notes')||'').trim();
      var areas = fd.getAll('areas');
      return {goal,time,intensity,notes,areas};
    }

    function planFor(data){
      var lines = [];
      lines.push('Session summary — ' + (data.goal||'Untitled goal'));
      lines.push('Commitment: ' + (data.time==='30'? '≈30 min/week' : data.time==='60' ? '≈1 hour/week' : '≈2.5+ hours/week'));
      lines.push('Approach: ' + (data.intensity==='gentle'? 'Low-burden adjustments' : data.intensity==='balanced'? 'Mixed small steps' : 'Stronger interventions with check-ins'));
      if(data.areas && data.areas.length){
        lines.push('Focus areas: ' + data.areas.join(', '));
      }
      lines.push('');
      lines.push('Top 3 actions:');

      // craft actions heuristically
      var actions = [];
      if(data.areas.includes('sleep')){
        actions.push('- Evening anchor: consistent wind-down 30–60 min before bed (no screens)');
      }
      if(data.areas.includes('stress')){
        actions.push('- Daily 5–10 min breathing practice at a fixed time');
      }
      if(data.areas.includes('movement')){
        actions.push('- 2 short movement sessions/week (20–30 min), emphasize consistency');
      }
      if(data.areas.includes('nutrition')||data.areas.includes('digestion')){
        actions.push('- Simple meal pattern: add one fiber-rich meal daily and note responses');
      }
      if(actions.length<3){
        // fill generic actions based on intensity
        if(data.intensity==='gentle') actions.push('- Small habit: pick one micro-step to do 3x/week');
        else if(data.intensity==='balanced') actions.push('- Establish a weekly check-in and one actionable change');
        else actions.push('- Start a 2-week focused experiment and track outcomes');
      }
      // trim to 3
      actions = actions.slice(0,3);
      actions.forEach(function(a){ lines.push(a); });
      lines.push('');
      lines.push('Safety notes:');
      lines.push('- Review medications or recent test results with your clinician before starting new supplements or changes.');
      if(data.notes) lines.push('Context notes: ' + data.notes);
      lines.push('');
      lines.push('Next steps:');
      lines.push('- Book a follow-up in 2 weeks to review effects and adapt the plan.');

      return lines.join('\n');
    }

    buildBtn.addEventListener('click',function(){
      var data = collect();
      var summary = planFor(data);
      planText.textContent = summary;
      output.hidden = false;
      // set booking link to include goal summary anchor (basic)
      if(bookLink){ try{ var url = new URL(bookLink.href, location.href); url.searchParams.set('goal', data.goal || ''); bookLink.href = url.toString(); }catch(e){} }
      planText.focus();
    });

    copyBtn.addEventListener('click',function(){
      var text = planText.textContent || '';
      if(!text) return;
      navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text).then(function(){
        copyConfirm.classList.add('show'); copyConfirm.setAttribute('aria-hidden','false');
        setTimeout(function(){ copyConfirm.classList.remove('show'); copyConfirm.setAttribute('aria-hidden','true'); },1500);
      },function(){
        // fallback
        var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e){} ta.remove();
      }) : (function(){ var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e){} ta.remove(); })();
    });

  });
})();