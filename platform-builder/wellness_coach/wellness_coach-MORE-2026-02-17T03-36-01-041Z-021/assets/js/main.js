(function(){
  // Scroll-triggered reveal with prefers-reduced-motion support
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function revealInit(){
    var items = document.querySelectorAll('.reveal');
    if(prefersReduced){
      items.forEach(function(it){ it.classList.add('visible'); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){ entry.target.classList.add('visible'); io.unobserve(entry.target); }
      });
    },{root:null,rootMargin:'0px 0px -8% 0px',threshold:0.05});
    items.forEach(function(it){ io.observe(it); });
  }
  document.addEventListener('DOMContentLoaded',revealInit);

  // Session Planner widget
  function textForPlan(data){
    var lines = [];
    lines.push('{{BUSINESS_NAME}} — Session Plan');
    lines.push('Focus: ' + data.focusLabel);
    lines.push('Daily practice: ' + data.minutes + ' minutes');
    if(data.constraints.length) lines.push('Constraints: ' + data.constraints.join(', '));
    if(data.notes) lines.push('\nNotes:\n' + data.notes);

    lines.push('\nRecommended micro-habits:');
    // base recommendations by focus
    if(data.focus === 'energy'){
      lines.push('- Morning 6-min anchor: hydration + targeted breathing');
      lines.push('- Midday 10-min energy reset (short movement + intake check)');
    } else if(data.focus === 'flow'){
      lines.push('- Two protected deep blocks (25–50 min) with single-task rule');
      lines.push('- Pre-block 3-min setup ritual: clear intent + zero-distraction checklist');
    } else if(data.focus === 'rest'){
      lines.push('- Evening wind-down (15 min): low light, device curfew, predictable sequence');
      lines.push('- Bedtime anchor: 5-min gentle breath + transition phrase');
    } else if(data.focus === 'planning'){
      lines.push('- Friday 20-min review: outcomes, blockers, calendar alignment');
      lines.push('- Daily 5-min top-3 plan each morning');
    }

    lines.push('\nStructure & cadence:');
    lines.push('- Start with a 7-day trial of the micro-habits. Adjust time if constraints make adherence difficult.');
    lines.push('- Use the same trigger each day to anchor the habit (e.g., after breakfast, before bed).');
    lines.push('\nSimple tracking: tick a single column in your calendar or checklist daily. Accountability increases follow-through.');

    lines.push('\nNext steps:');
    lines.push('- Book a VIP Day to map these into your week and create accountability check-ins: {{PRIMARY_CTA_URL}}');
    return lines.join('\n');
  }

  function getFocusLabel(val){
    var map = {energy:'Steadier daily energy',flow:'Protected deep work time',rest:'Improved evening routine',planning:'Weekly planning and priorities'};
    return map[val]||val;
  }

  document.addEventListener('DOMContentLoaded',function(){
    var form = document.getElementById('planner-form');
    if(!form) return;
    var buildBtn = document.getElementById('build-plan');
    var copyBtn = document.getElementById('copy-plan');
    var dlBtn = document.getElementById('download-plan');
    var out = document.getElementById('plan-output');

    function readForm(){
      var focus = document.getElementById('focus').value;
      var minutes = (parseInt(document.getElementById('minutes').value,10) || 10);
      var notes = document.getElementById('notes').value.trim();
      var constraints = Array.prototype.slice.call(form.querySelectorAll('input[name="constraint"]:checked')).map(function(n){ return n.value; });
      return {focus:focus,minutes:minutes,notes:notes,constraints:constraints,focusLabel:getFocusLabel(focus)};
    }

    buildBtn.addEventListener('click',function(){
      var data = readForm();
      var text = textForPlan(data);
      out.textContent = text;
      out.scrollIntoView({behavior:'smooth',block:'center'});
    });

    copyBtn.addEventListener('click',function(){
      var text = out.textContent;
      if(!text) return;
      navigator.clipboard && navigator.clipboard.writeText(text).then(function(){
        copyBtn.textContent = 'Copied'; setTimeout(function(){ copyBtn.textContent = 'Copy'; },1600);
      }).catch(function(){
        // fallback
        var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); copyBtn.textContent='Copied'; setTimeout(function(){copyBtn.textContent='Copy';},1600);}catch(e){} ta.remove();
      });
    });

    dlBtn.addEventListener('click',function(){
      var text = out.textContent;
      if(!text) return;
      var blob = new Blob([text],{type:'text/plain;charset=utf-8'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = 'session-plan.txt'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(url); },1500);
    });

  });

  // Simple nav toggle for small screens
  document.addEventListener('DOMContentLoaded',function(){
    var btn = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.main-nav');
    if(!btn || !nav) return;
    btn.addEventListener('click',function(){
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      nav.style.display = open ? 'none' : 'flex';
    });
  });

})();