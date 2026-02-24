(function(){
  // Simple utilities
  function q(sel,ctx){return (ctx||document).querySelector(sel)}
  function qa(sel,ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Year in footer
  q('#yr').textContent = new Date().getFullYear();

  // Scroll-trigger reveal respecting prefers-reduced-motion
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = qa('[data-reveal]');
  if(prefersReduced){
    reveals.forEach(function(el){el.classList.add('is-visible')});
  } else if('IntersectionObserver' in window){
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('is-visible');
          obs.unobserve(e.target);
        }
      });
    },{threshold:0.12});
    reveals.forEach(function(r){obs.observe(r)});
  } else {
    // fallback: show all
    reveals.forEach(function(el){el.classList.add('is-visible')});
  }

  // Session Planner
  var sp = {
    concern: q('#sp-concern'),
    goals: qa('input[name="goal"]'),
    time: q('#sp-time'),
    timeVal: q('#sp-time-val'),
    budget: q('#sp-budget'),
    mods: {
      coach: q('#mod-coach'),
      nutrition: q('#mod-nutrition'),
      movement: q('#mod-movement'),
      tele: q('#mod-tele')
    },
    genBtn: q('#sp-generate'),
    copyBtn: q('#sp-copy'),
    summary: q('#sp-summary')
  };

  // reflect time range
  function updateTime(){sp.timeVal.textContent = sp.time.value}
  sp.time.addEventListener('input', updateTime);
  updateTime();

  function collectGoals(){
    return sp.goals.filter(function(g){return g.checked}).map(function(g){return g.value});
  }
  function collectMods(){
    var out = [];
    if(sp.mods.coach.checked) out.push('Coaching');
    if(sp.mods.nutrition.checked) out.push('Nutrition');
    if(sp.mods.movement.checked) out.push('Movement & breath');
    if(sp.mods.tele.checked) out.push('Tele check-ins');
    return out;
  }

  function generatePlanText(){
    var concern = sp.concern.value.trim() || '[No concern provided]';
    var goals = collectGoals();
    var time = sp.time.value;
    var budget = sp.budget.value;
    var mods = collectMods();

    var goalLine = goals.length ? goals.join(', ') : 'Unspecified goals';
    var modLine = mods.length ? mods.join(', ') : 'No modality preference';

    var budgetNote = {
      low: 'Intro-level recommendations and low-cost resources.',
      medium: 'Mixed model: focused sessions with select check-ins.',
      high: 'Flexible scope with more frequent touchpoints.'
    }[budget] || '';

    var plan = [];
    plan.push('Session planner summary');
    plan.push('-----------------------');
    plan.push('Primary concern: ' + concern);
    plan.push('Goals: ' + goalLine);
    plan.push('Weekly time available: ' + time + ' hours');
    plan.push('Modality preferences: ' + modLine);
    plan.push('Budget framing: ' + budget + ' – ' + budgetNote);
    plan.push('');

    // Small recommended starter plan (educational tone)
    plan.push('Suggested starter sequence (educational):');
    if(time >= 5){
      plan.push('- Weekly 45–60 min session for first 4 weeks; daily 10–20 minute practices.');
    } else if(time >= 2){
      plan.push('- Two 45 min sessions across four weeks with short daily anchors (5–10 min).');
    } else if(time > 0){
      plan.push('- One focused consult; short, tangible tasks you can test 3x/week.');
    } else {
      plan.push('- Brief consult to prioritize one low-effort experiment to try.');
    }

    plan.push('- Track 2 simple signals (sleep quality, energy, mood) and revisit after 4 weeks.');
    plan.push('');
    plan.push('Notes for first visit:');
    plan.push('- Bring a recent 3-day log of sleep and main meals if available.');
    plan.push('- Be ready to pick one small experiment to try in week 1.');
    plan.push('');
    plan.push('This summary is for educational planning. It is not medical advice.');

    return plan.join('\n');
  }

  sp.genBtn.addEventListener('click', function(){
    try{
      var txt = generatePlanText();
      sp.summary.value = txt;
      sp.copyBtn.disabled = false;
    }catch(e){
      sp.summary.value = 'Unable to generate plan at this time.';
    }
  });

  sp.copyBtn.addEventListener('click', function(){
    var txt = sp.summary.value;
    if(!txt) return;
    navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(txt).then(function(){
      sp.copyBtn.textContent = 'Copied!';
      setTimeout(function(){sp.copyBtn.textContent = 'Copy summary'},1500);
    },function(){
      fallbackCopy(txt);
    }) : fallbackCopy(txt);
  });

  function fallbackCopy(text){
    var ta = document.createElement('textarea');
    ta.value = text;document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');
      sp.copyBtn.textContent = 'Copied!';
      setTimeout(function(){sp.copyBtn.textContent = 'Copy summary'},1500);
    }catch(e){alert('Copy failed — select and copy the text manually.')}
    document.body.removeChild(ta);
  }

})();