(function(){
  // Utility: set current year
  document.addEventListener('DOMContentLoaded',function(){
    var y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();
  });

  // Scroll reveal respecting prefers-reduced-motion
  function initReveal(){
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var items = document.querySelectorAll('[data-reveal]');
    if(prefersReduced){
      items.forEach(function(it){ it.classList.add('visible'); });
      return;
    }
    if('IntersectionObserver' in window){
      var obs = new IntersectionObserver(function(entries){
        entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); } });
      },{threshold:0.12});
      items.forEach(function(it){ obs.observe(it); });
    } else {
      // fallback: reveal on load
      items.forEach(function(it){ it.classList.add('visible'); });
    }
  }
  initReveal();

  // Session Planner: works for multiple instances
  function buildPlanner(container){
    var goal = container.querySelector('.sp-goal');
    var length = container.querySelector('.sp-length');
    var sens = container.querySelector('.sp-sens');
    var checks = Array.from(container.querySelectorAll('.notes-checks input[type=checkbox]'));
    var output = container.querySelector('.sp-output');

    function gather(){
      var chosen = checks.filter(function(c){ return c.checked; }).map(function(c){ return c.value; }).slice(0,3);
      var minutes = parseInt(length.value,10)||10;
      var g = goal.value||'calm';
      var sensText = (sens.value||'none provided').trim();
      // Simple dilution logic: shorter session -> smaller total volume
      var totalCarrier = minutes <= 10 ? 5 : (minutes <= 20 ? 10 : 15); // ml
      // Drop suggestion: 1% = ~6 drops per 10ml; we'll approximate
      var percent = minutes <= 10 ? 1 : (minutes <= 20 ? 1.5 : 2);
      var dropsPer10ml = 6;
      var drops = Math.round((percent/1)*dropsPer10ml*(totalCarrier/10));
      if(drops < 1) drops = 1;

      var notesLine = chosen.length ? chosen.join(', ') : 'no specific notes chosen';

      var summary = [];
      summary.push('Session planner summary');
      summary.push('-----------------------');
      summary.push('Focus: ' + g);
      summary.push('Length: ' + minutes + ' minutes');
      summary.push('Preferred notes: ' + notesLine);
      summary.push('Sensitivity info: ' + sensText);
      summary.push('');
      summary.push('Suggested blend (for topical use or diffuser carrier):');
      summary.push('- Carrier: ' + totalCarrier + ' ml');
      summary.push('- Essential oil drops: ~' + drops + ' drops total');
      summary.push('- Approx. dilution: ' + percent.toFixed(1) + '%');
      summary.push('');
      summary.push('Safety reminders:');
      summary.push('- Perform a patch test for topical use (apply 1 drop diluted, observe 24h).');
      summary.push('- If you have pets, pregnancy, or medical conditions, consult intake guidance before use.');
      summary.push('- These suggestions may support comfort; they are not medical treatment.');

      return summary.join('\n');
    }

    function update(){ output.value = gather(); }

    // Actions
    container.addEventListener('click',function(e){
      var btn = e.target.closest('button'); if(!btn) return;
      var action = btn.getAttribute('data-action');
      if(action === 'build'){ update(); }
      if(action === 'clear'){
        goal.selectedIndex = 0; length.selectedIndex = 0; sens.value=''; checks.forEach(function(c){ c.checked=false }); output.value='';
      }
      if(action === 'copy'){
        // copy output to clipboard
        try{
          navigator.clipboard.writeText(output.value).then(function(){
            btn.textContent = 'Copied'; setTimeout(function(){ btn.textContent='Copy summary'; },1400);
          }, function(){ fallbackCopy(output.value,btn); });
        }catch(err){ fallbackCopy(output.value,btn); }
      }
    });

    // fallback copy
    function fallbackCopy(text,btn){
      var ta = document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select();
      try{ document.execCommand('copy'); btn.textContent='Copied'; setTimeout(function(){ btn.textContent='Copy summary'; },1400); }catch(e){}
      document.body.removeChild(ta);
    }

  }

  // Initialize planners
  document.addEventListener('DOMContentLoaded', function(){
    var planners = document.querySelectorAll('.session-planner');
    planners.forEach(function(p){ buildPlanner(p); });
  });

})();