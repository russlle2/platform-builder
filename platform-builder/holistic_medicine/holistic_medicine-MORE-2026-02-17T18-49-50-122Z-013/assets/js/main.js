document.addEventListener('DOMContentLoaded',function(){
  // Scroll-triggered reveal
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealItems = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if(prefersReduced){
    revealItems.forEach(function(el){el.classList.add('revealed')});
  } else if('IntersectionObserver' in window){
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    },{rootMargin:'0px 0px -10% 0px',threshold:0.05});
    revealItems.forEach(function(el){obs.observe(el)});
  } else {
    // fallback
    revealItems.forEach(function(el){el.classList.add('revealed')});
  }

  // Session Planner
  var form = document.getElementById('session-planner');
  var buildBtn = document.getElementById('build-plan');
  var planText = document.getElementById('plan-text');
  var copyBtn = document.getElementById('copy-plan');
  var bookWith = document.getElementById('book-with');

  function collectModalities(){
    var boxes = form.querySelectorAll('input[name="modalities"]');
    var chosen = [];
    boxes.forEach(function(b){ if(b.checked) chosen.push(b.value); });
    return chosen;
  }

  function buildPlan(){
    var data = new FormData(form);
    var goal = (data.get('goal')||'A personal priority').trim();
    var horizon = data.get('horizon')||'6 weeks';
    var frequency = data.get('frequency')||'1';
    var budget = data.get('budget')||'';
    var modalities = collectModalities();

    var lines = [];
    lines.push('{{BUSINESS_NAME}} — Personal plan summary');
    lines.push('Intention: ' + goal);
    lines.push('Time frame: ' + horizon);
    lines.push('Check-ins per week: ' + frequency);
    if(budget) lines.push('Estimated monthly budget: $' + budget);
    lines.push('Suggested focal practices:');

    if(modalities.length){
      modalities.forEach(function(m,idx){ lines.push((idx+1)+'. ' + m); });
    } else {
      lines.push('- Breath-based pauses, gentle evening rhythm, and a simple nutrition nudge.');
    }

    lines.push('A short first-week plan:');
    lines.push('- Day 1: Orientation & gentle baseline: 20-min check-in and a simple breathing practice.');
    lines.push('- Days 2–7: Two short practices per day (5–12 minutes). Choose one movement and one breath or nutrition habit.');
    lines.push('Reflection guidance: Journal one note after each practice: what felt different, what felt doable.');
    lines.push('Notes: This is educational support. Please share this with other care providers as needed.');

    return lines.join('\n');
  }

  buildBtn.addEventListener('click',function(){
    var text = buildPlan();
    planText.value = text;
    planText.focus();
    planText.select();
  });

  copyBtn.addEventListener('click',function(){
    if(!planText.value){
      // build if empty
      planText.value = buildPlan();
    }
    navigator.clipboard && navigator.clipboard.writeText(planText.value).then(function(){
      copyBtn.textContent = 'Copied';
      setTimeout(function(){ copyBtn.textContent = 'Copy summary'; },1500);
    }).catch(function(){
      // fallback
      planText.select();
      try{ document.execCommand('copy'); copyBtn.textContent = 'Copied'; setTimeout(function(){ copyBtn.textContent = 'Copy summary'; },1500);}catch(e){alert('Copy failed — select and copy manually.');}
    });
  });

  // Prefill booking link with a short query when available
  if(bookWith){
    bookWith.addEventListener('click',function(){
      // no-op; link goes to /book.html — a future integration could pass the plan summary
    });
  }

});