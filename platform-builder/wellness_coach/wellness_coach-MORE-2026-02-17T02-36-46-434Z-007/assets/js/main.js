(function(){
  // Utilities
  function q(sel,ctx){return (ctx||document).querySelector(sel)}
  function qa(sel,ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Fill year
  document.addEventListener('DOMContentLoaded',function(){
    var y = new Date().getFullYear();
    var el = q('#year'); if(el) el.textContent = y;
  });

  // Menu toggle for small screens
  var menuToggle = q('.menu-toggle');
  if(menuToggle){
    menuToggle.addEventListener('click',function(){
      var nav = q('.site-nav');
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      if(nav) nav.style.display = expanded ? '' : 'flex';
    });
  }

  // Scroll-triggered reveals with prefers-reduced-motion
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function revealAllInstant(){
    qa('.reveal').forEach(function(el){el.classList.add('revealed');el.style.transition='none'});
  }
  if(prefersReduced){
    revealAllInstant();
  } else if('IntersectionObserver' in window){
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('revealed');
          obs.unobserve(e.target);
        }
      });
    },{rootMargin:'-10% 0px',threshold:0.12});
    qa('.reveal').forEach(function(el){obs.observe(el)});
  } else {
    // Fallback
    revealAllInstant();
  }

  // Session Planner widget
  var plannerForm = q('#planner-form');
  var planOutput = q('#plan-output');
  var copyBtn = q('#copy-plan');

  function generatePlan(data){
    // Build a plain-text summary. No medical claims. Focus on outcomes, habits, frameworks.
    var lines = [];
    lines.push((document.title || 'Plan') + ' — Personal Plan');
    lines.push('Focus: ' + data.focus);
    lines.push('Daily commitment: ' + data.dailyMinutes + ' minutes');
    lines.push('Style: ' + data.style);
    lines.push('Accountability: ' + data.accountability);
    lines.push('');
    lines.push('Core daily micro-habits:');
    // Suggest 3 micro-habits adapted to dailyMinutes
    var mins = parseInt(data.dailyMinutes,10);
    if(mins <= 10){
      lines.push('- Morning anchor (3 min): breath + intention');
      lines.push('- Midday pause (2 min): check-in & reset');
      lines.push('- Evening micro-reflection (5 min)');
    } else if(mins <= 20){
      lines.push('- Movement or breath sequence (7–10 min)');
      lines.push('- Focused planning slot (5–7 min)');
      lines.push('- Short reflection and wins note (3–5 min)');
    } else {
      lines.push('- Movement and energy reset (10–15 min)');
      lines.push('- Intentional planning and priorities (10 min)');
      lines.push('- Brief evening synthesis (5 min)');
    }
    lines.push('');
    lines.push('Weekly framework:');
    lines.push('- Choose 1 day as an anchor review. Spend 20–40 minutes reviewing wins, obstacles, and scheduling the week.');
    lines.push('- Midweek micro-check to adjust priorities.');
    lines.push('');
    lines.push('Implementation cues:');
    lines.push('- Attach the morning anchor to an existing habit (e.g., after brushing teeth).');
    lines.push('- Use a single checklist or note file for ease of tracking.');
    if(data.accountability && data.accountability.toLowerCase().includes('weekly')){
      lines.push('- Expect a short weekly accountability touchpoint to reflect and refine.');
    }
    if(data.accountability && data.accountability.toLowerCase().includes('daily')){
      lines.push('- Daily micro-prompts will help maintain streaks; set a consistent notification.');
    }
    lines.push('');
    lines.push('Next steps:');
    lines.push('- Start with the morning anchor for 7 days as a pilot.');
    lines.push('- Tweak the timing and intensity based on ease and measurable improvement.');
    lines.push('');
    lines.push('Coach contact: ' + '{{EMAIL}}' + ' • ' + '{{PHONE}}');
    return lines.join('\n');
  }

  if(plannerForm){
    plannerForm.addEventListener('submit',function(ev){
      ev.preventDefault();
      var fm = new FormData(plannerForm);
      var data = {};
      fm.forEach(function(v,k){data[k]=v});
      var plan = generatePlan(data);
      if(planOutput) planOutput.textContent = plan;
      if(copyBtn){copyBtn.disabled = false}
    });
  }

  if(copyBtn){
    copyBtn.addEventListener('click',function(){
      var text = planOutput ? planOutput.textContent : '';
      if(!text) return;
      // Copy to clipboard
      navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text).then(function(){
        copyBtn.textContent = 'Copied';
        setTimeout(function(){copyBtn.textContent='Copy summary'},1200);
      }).catch(function(){
        // Fallback
        var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy'); copyBtn.textContent='Copied';}catch(e){} ta.remove(); setTimeout(function(){copyBtn.textContent='Copy summary'},1200);
      }) : null;
    });
  }

})();