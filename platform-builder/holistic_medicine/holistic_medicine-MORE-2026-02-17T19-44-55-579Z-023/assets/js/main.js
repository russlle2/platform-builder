(function(){
  // Scroll reveal with prefers-reduced-motion support
  function initReveal(){
    var preferReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var elements = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if(preferReduced){
      elements.forEach(function(el){el.classList.add('visible')});
      return;
    }
    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        })
      },{threshold:0.12});
      elements.forEach(function(el){io.observe(el)});
    } else {
      // fallback: show all
      elements.forEach(function(el){el.classList.add('visible')});
    }
  }

  // Session Planner widget
  function initPlanner(){
    var form = document.getElementById('planner-form');
    if(!form) return;
    var create = document.getElementById('create-plan');
    var reset = document.getElementById('reset-plan');
    var copy = document.getElementById('copy-plan');
    var emailBtn = document.getElementById('email-plan');
    var summary = document.getElementById('plan-summary');

    function buildPlainText(data){
      var lines = [];
      lines.push('Session Planner — ' + (new Date()).toLocaleDateString());
      lines.push('Primary concern: ' + (data.concern || '—'));
      if(data.goal) lines.push('3-month focus: ' + data.goal);
      lines.push('Weekly time available: ' + (data.time || '—'));
      if(data.supports) lines.push('Current supports: ' + data.supports);
      if(data.budget) lines.push('Budget note: ' + data.budget);

      // Simple plan generator heuristics
      lines.push('');
      lines.push('Suggested first steps:');
      // Step 1: prioritize
      lines.push('- Clarify the single highest-priority symptom to track this week.');
      // Step 2: micro-experiment
      if(data.time === '<30'){
        lines.push('- Micro-experiments: choose one 10–20 minute practice 4x this week (sleep hygiene, short walk, breathing).');
      } else if(data.time === '30-60'){
        lines.push('- Micro-experiments: commit to 30 minutes 3x per week of a new routine (gentle movement, meal prep, focused sleep routine).');
      } else {
        lines.push('- Deeper practice: combine a 45–60 minute weekly review plus 2 shorter practices during the week.');
      }
      // Step 3: measurement
      lines.push('- Track one simple metric daily (sleep hours, mood score 1–5, symptom presence).');
      lines.push('');
      lines.push('Notes for session: bring any recent labs, a typical 3-day food log (if digestive), and any medication/supplement list.');
      return lines.join('\n');
    }

    function gather(){
      return {
        concern: document.getElementById('concern').value.trim(),
        goal: document.getElementById('goal').value.trim(),
        time: document.getElementById('time').value,
        supports: document.getElementById('supports').value.trim(),
        budget: document.getElementById('budget').value.trim()
      };
    }

    create.addEventListener('click', function(ev){
      ev.preventDefault();
      var data = gather();
      var text = buildPlainText(data);
      summary.value = text;
      // set email mailto
      var subject = encodeURIComponent('Session plan — ' + (data.concern || 'Intake'));
      var body = encodeURIComponent(text + '\n\n(Prepared via session planner)');
      emailBtn.setAttribute('href', 'mailto:{{EMAIL}}?subject=' + subject + '&body=' + body);
      // focus for screen readers
      summary.focus();
    });

    copy.addEventListener('click', function(){
      if(!summary.value) return;
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(summary.value).then(function(){
          copy.textContent = 'Copied';
          setTimeout(function(){copy.textContent = 'Copy Summary'},1200);
        });
      } else {
        // fallback
        summary.select();
        try{document.execCommand('copy');copy.textContent = 'Copied';setTimeout(function(){copy.textContent = 'Copy Summary'},1200);}catch(e){alert('Copy failed — select the text and copy manually.');}
      }
    });

    reset.addEventListener('click', function(){
      summary.value = '';
      emailBtn.setAttribute('href','#');
    });
  }

  // Footer year
  function setYear(){
    var y = document.getElementById('year');
    if(y) y.textContent = new Date().getFullYear();
  }

  document.addEventListener('DOMContentLoaded', function(){
    initReveal();
    initPlanner();
    setYear();
  });

})();
