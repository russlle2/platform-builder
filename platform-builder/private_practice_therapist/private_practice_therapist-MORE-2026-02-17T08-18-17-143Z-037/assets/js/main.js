(function(){
  // Scroll-triggered reveal
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function revealInit(){
    var els = document.querySelectorAll('.reveal');
    if(prefersReduced){
      els.forEach(function(el){el.classList.add('is-visible')});
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    },{threshold:0.12});
    els.forEach(function(el){io.observe(el)});
  }
  // Session Planner widget
  function plannerInit(){
    var form = document.getElementById('planner-form');
    if(!form) return;
    var buildBtn = document.getElementById('build-plan');
    var output = document.getElementById('plan-output');
    var copyBtn = document.getElementById('copy-plan');
    var downloadBtn = document.getElementById('download-plan');

    function buildPlan(){
      var data = new FormData(form);
      var concern = (data.get('concern')||'').trim();
      var goal = (data.get('goal')||'').trim();
      var pace = (data.get('pace')||'').trim();
      var constraints = (data.get('constraints')||'').trim();

      var planLines = [];
      planLines.push('Session Plan');
      planLines.push('------------');
      planLines.push('Primary concern: ' + (concern||'[not specified]'));
      planLines.push('Three-session goal: ' + (goal||'[not specified]'));
      planLines.push('Suggested rhythm: ' + (pace||'Biweekly'));
      if(constraints) planLines.push('Constraints / notes: ' + constraints);
      planLines.push('');
      planLines.push('Suggested focus by session:');
      planLines.push('1) Clarify patterns and choose one small experiment to try.');
      planLines.push('2) Review the experiment, troubleshoot barriers, and refine the plan.');
      planLines.push('3) Consolidate what helped and identify maintenance steps.');
      planLines.push('');
      planLines.push('Practical next steps:');
      planLines.push('- Bring specific examples for session 1 (times, triggers, attempts).');
      planLines.push('- Note any scheduling constraints for follow-ups.');
      planLines.push('');
      planLines.push('Confidentiality note: Sessions are confidential within legal and ethical limits; this plan is for your use. If you are in crisis, contact emergency services or a crisis line.');

      var text = planLines.join('\n');
      output.textContent = text;
      output.setAttribute('data-plan', text);
    }

    buildBtn.addEventListener('click', buildPlan);

    copyBtn.addEventListener('click', function(){
      var text = output.getAttribute('data-plan') || output.textContent;
      if(!text) return;
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(function(){
          copyBtn.textContent = 'Copied';
          setTimeout(function(){copyBtn.textContent = 'Copy Plan'},1600);
        }, function(){
          fallbackCopy(text);
        });
      } else {
        fallbackCopy(text);
      }
    });

    function fallbackCopy(text){
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select();
      try{document.execCommand('copy');
        copyBtn.textContent = 'Copied';
        setTimeout(function(){copyBtn.textContent = 'Copy Plan'},1600);
      }catch(e){
        alert('Copy failed. You can select the plan and press Ctrl/Cmd+C.');
      }
      document.body.removeChild(ta);
    }

    downloadBtn.addEventListener('click', function(){
      var text = output.getAttribute('data-plan') || output.textContent || '';
      if(!text) return;
      var blob = new Blob([text],{type:'text/plain'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'session-plan.txt';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });
  }

  // Year in footer
  function setYear(){
    var y = new Date().getFullYear();
    var el = document.getElementById('year'); if(el) el.textContent = y;
  }

  document.addEventListener('DOMContentLoaded', function(){
    revealInit();
    plannerInit();
    setYear();
  });
})();