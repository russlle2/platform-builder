(function(){
  'use strict';
  // Scroll-triggered reveals with prefers-reduced-motion support
  function setupReveals(){
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var items = document.querySelectorAll('[data-reveal]');
    if(prefersReduced){
      items.forEach(function(el){el.classList.add('revealed')});
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('revealed');
          io.unobserve(entry.target);
        }
      });
    },{threshold:0.12});
    items.forEach(function(el){io.observe(el)});
  }

  // Session Planner widget
  function setupPlanner(){
    var goal = document.getElementById('goal');
    var duration = document.getElementById('duration');
    var notes = document.getElementById('notes');
    var buildBtn = document.getElementById('buildPlan');
    var copyBtn = document.getElementById('copyPlan');
    var planText = document.getElementById('planText');

    function gatherModalities(){
      var boxes = document.querySelectorAll('input[name="mod"]');
      var chosen = [];
      boxes.forEach(function(b){ if(b.checked) chosen.push(b.value)});
      return chosen;
    }

    function buildPlaintext(){
      var g = (goal && goal.value) ? goal.value.trim() : 'General well-being';
      var d = duration ? duration.value : '4 weeks';
      var m = gatherModalities();
      var n = notes && notes.value ? notes.value.trim() : '';

      var lines = [];
      lines.push('{{BUSINESS_NAME}} — Personalized Plan Summary');
      lines.push('Primary focus: '+g);
      lines.push('Timeframe: '+d);
      lines.push('Suggested modalities: '+(m.length? m.join(', '):'None selected'));
      lines.push('Core steps:');
      // Produce a simple plan scaffold
      lines.push('- Initial session: assessment + prioritized next steps');
      if(m.indexOf('Nutrition')>-1) lines.push('- Nutrition: 2 quick adjustments + simple meal rhythm');
      if(m.indexOf('Lifestyle Coaching')>-1) lines.push('- Weekly coaching check-ins for habit support');
      if(m.indexOf('Mind-Body')>-1) lines.push('- Small daily mind-body practice (5–10 minutes)');
      if(m.indexOf('Targeted Therapy')>-1) lines.push('- Targeted therapy visits to manage symptoms');
      lines.push('- Brief progress review mid-cycle and simple metrics you can track');
      if(n) lines.push('Constraints: '+n);
      lines.push('Estimated visit cadence: once every 1–2 weeks, adjusted by progress');
      lines.push('\nIf you choose to book, we will refine this into a clear, actionable sequence you can follow.');

      return lines.join('\n');
    }

    function renderPlan(){
      planText.textContent = buildPlaintext();
    }

    buildBtn.addEventListener('click',function(e){e.preventDefault();renderPlan();buildBtn.blur();});

    copyBtn.addEventListener('click',function(e){
      e.preventDefault();
      var text = buildPlaintext();
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(function(){
          copyBtn.textContent = 'Copied';
          setTimeout(function(){copyBtn.textContent = 'Copy summary'},1600);
        });
      } else {
        // fallback
        var ta = document.createElement('textarea');ta.value = text;document.body.appendChild(ta);ta.select();
        try{document.execCommand('copy');copyBtn.textContent='Copied';setTimeout(function(){copyBtn.textContent='Copy summary'},1600);}catch(e){alert('Copy not supported');}
        document.body.removeChild(ta);
      }
    });

    // allow live update as user types
    [goal,duration,notes].forEach(function(el){ if(el) el.addEventListener('input',renderPlan)});
    var modboxes = document.querySelectorAll('input[name="mod"]');
    modboxes.forEach(function(b){b.addEventListener('change',renderPlan)});
  }

  document.addEventListener('DOMContentLoaded',function(){
    setupReveals();
    setupPlanner();
  });
})();