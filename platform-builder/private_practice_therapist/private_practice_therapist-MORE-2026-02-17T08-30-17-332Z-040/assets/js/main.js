(function(){
  // Basic helpers
  function el(id){return document.getElementById(id)}
  function escape(s){return String(s||'').replace(/\n/g,'\\n')}

  // Planner
  var buildBtn = el('planner-build');
  var plannerOutput = el('planner-output');
  var plannerCopy = el('planner-copy');

  function buildPlan(){
    var focus = el('planner-focus').value;
    var goal = el('planner-goal').value.trim();
    var style = el('planner-style').value;
    var horizon = el('planner-horizon').value;
    var summary = [];
    summary.push('Personalized Intensive Plan');
    summary.push('Primary focus: ' + focus);
    summary.push('Stated goal: ' + (goal || 'Not provided'));
    summary.push('Session style: ' + style);
    summary.push('Suggested format: ' + horizon);
    summary.push('Suggested first steps:');
    if(focus==='decision'){
      summary.push('- Clarify decision criteria and short-term tradeoffs');
      summary.push('- Outline 2 small experiments to gather information');
    } else if(focus==='transition'){
      summary.push('- Map immediate practical needs and emotional landscape');
      summary.push('- Identify one manageable next step for the week');
    } else if(focus==='relationships'){
      summary.push('- Define communication goals and boundaries');
      summary.push('- Practice a short script or approach to try');
    } else if(focus==='self'){
      summary.push('- Identify 1–2 routines to support energy and attention');
      summary.push('- Plan a brief check-in to notice change over two weeks');
    } else {
      summary.push('- Clarify the issue together in session and set concrete next steps');
    }
    var text = summary.join('\n');
    plannerOutput.textContent = text;
    plannerOutput.setAttribute('data-plain', text);
  }

  function copyPlanner(){
    var text = plannerOutput.getAttribute('data-plain') || plannerOutput.textContent || '';
    navigator.clipboard && navigator.clipboard.writeText(text).then(function(){
      plannerCopy.textContent = 'Copied';
      setTimeout(function(){plannerCopy.textContent='Copy summary'},1200);
    },function(){
      alert('Copy failed — select and copy manually.');
    });
  }

  buildBtn && buildBtn.addEventListener('click', buildPlan);
  plannerCopy && plannerCopy.addEventListener('click', copyPlanner);

  // Wizard
  var wizard = (function(){
    var form = el('wizard-form');
    var next1 = el('wizard-next-1');
    var next2 = el('wizard-next-2');
    var back2 = el('wizard-back-2');
    var back3 = el('wizard-back-3');
    var finish = el('wizard-finish');
    var results = el('wizard-results');
    var copyBtn = el('wizard-copy');

    function showStep(n){
      var steps = form.querySelectorAll('.step');
      steps.forEach(function(s){
        s.hidden = (s.getAttribute('data-step') !== String(n));
      });
    }

    function generateQuestions(){
      var area = el('wizard-area').value;
      var duration = el('wizard-duration').value;
      var outcome = el('wizard-outcome').value;
      var q = [];
      q.push('Brief context: "Right now I am most concerned about: ' + area + ' (' + duration + ')"');
      q.push('I hope to achieve: ' + outcome + '.');
      q.push('Background items to share: short timeline, key stressors, supports you have.');
      q.push('What I notice in my day-to-day (symptoms, patterns, triggers): list 3 examples.');
      q.push('What has helped or not helped before: note brief examples.');
      q.push('Preferred outcomes for a short intensive: 2–3 practical next steps I can try.');
      results.textContent = q.join('\n\n');
      results.setAttribute('data-plain', results.textContent);
    }

    next1 && next1.addEventListener('click', function(){ showStep(2); });
    back2 && back2.addEventListener('click', function(){ showStep(1); });
    next2 && next2.addEventListener('click', function(){ showStep(3); });
    back3 && back3.addEventListener('click', function(){ showStep(2); });
    finish && finish.addEventListener('click', function(){ generateQuestions(); });
    copyBtn && copyBtn.addEventListener('click', function(){
      var t = results.getAttribute('data-plain') || results.textContent || '';
      navigator.clipboard && navigator.clipboard.writeText(t).then(function(){
        copyBtn.textContent = 'Copied';
        setTimeout(function(){copyBtn.textContent='Copy questions'},1200);
      },function(){ alert('Copy failed.'); });
    });

    // Initialize
    showStep(1);
    return {generate:generateQuestions};
  }());

  // Footer year
  var y = new Date().getFullYear();
  var yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = y;

})();
