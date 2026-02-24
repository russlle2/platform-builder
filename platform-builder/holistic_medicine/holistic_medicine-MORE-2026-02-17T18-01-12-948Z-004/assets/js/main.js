(function(){
  // Utilities
  function qs(sel,ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel,ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Add year
  var y = new Date().getFullYear(); var yearEl = qs('#year'); if(yearEl) yearEl.textContent = y;

  // Scroll reveal
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = qsa('.reveal');
  function showIfVisible(el){
    var rect = el.getBoundingClientRect();
    if(rect.top < (window.innerHeight || document.documentElement.clientHeight) - 80){
      el.classList.add('in');
    }
  }
  if(prefersReduced){reveals.forEach(function(r){r.classList.add('in')});}
  else{
    // initial check
    reveals.forEach(showIfVisible);
    window.addEventListener('scroll', function(){reveals.forEach(showIfVisible)} ,{passive:true});
    window.addEventListener('resize', function(){reveals.forEach(showIfVisible)});
  }

  // Session Planner logic - supports multiple instances
  function buildSummary(data){
    var lines = [];
    lines.push('Personalized Session Plan');
    lines.push('=========================');
    if(data.goal) lines.push('Goal: ' + data.goal);
    if(data.concerns) lines.push('Concerns: ' + data.concerns);
    if(data.time) lines.push('Weekly time: ' + data.time);
    if(data.intensity) lines.push('Intensity: ' + data.intensity);
    if(data.modalities && data.modalities.length) lines.push('Modalities: ' + data.modalities.join(', '));
    lines.push('');
    lines.push('Suggested steps:\n- Session format: ' + (data.time==='90+ min'||data.time==='60+ min' ? 'Long form deep session' : 'Focused short sessions'));
    lines.push('- Week 1: Map priorities and set 1 small habit');
    lines.push('- Week 2-3: Introduce 1 targeted practice and monitor response');
    lines.push('- Week 4+: Adjust intensity, review progress, plan check-in');
    lines.push('');
    lines.push('Notes: This is educational and not a substitute for medical care. For urgent concerns, consult a licensed clinician.');
    return lines.join('\n');
  }

  function wirePlanner(root){
    var el = typeof root === 'string' ? document.getElementById(root) : root;
    if(!el) return;
    var buildBtn = el.querySelector('.build');
    var resultBox = el.querySelector('.result');
    var textarea = el.querySelector('.result textarea');
    var copyBtn = el.querySelector('.copy');
    var dlBtn = el.querySelector('.download');

    function gather(){
      var goal = el.querySelector('input[name="goal"]') ? el.querySelector('input[name="goal"]').value.trim() : '';
      var concerns = el.querySelector('textarea[name="concerns"]') ? el.querySelector('textarea[name="concerns"]').value.trim() : '';
      var time = el.querySelector('select[name="time"]') ? el.querySelector('select[name="time"]').value : '';
      var intensity = el.querySelector('select[name="intensity"]') ? el.querySelector('select[name="intensity"]').value : '';
      var mods = Array.from(el.querySelectorAll('input[name="modality"]:checked')).map(function(i){return i.value});
      return {goal:goal,concerns:concerns,time:time,intensity:intensity,modalities:mods};
    }

    if(buildBtn){
      buildBtn.addEventListener('click',function(){
        var data = gather();
        var text = buildSummary(data);
        if(resultBox) resultBox.style.display = 'block';
        if(textarea) textarea.value = text;
      });
    }

    if(copyBtn){
      copyBtn.addEventListener('click', function(){
        if(!textarea) return; textarea.select(); textarea.setSelectionRange(0,99999);
        try{document.execCommand('copy'); copyBtn.textContent='Copied'; setTimeout(function(){copyBtn.textContent='Copy'},1600);}catch(e){console.warn('Copy failed',e)}
      });
    }

    if(dlBtn){
      dlBtn.addEventListener('click', function(){
        if(!textarea) return; var blob = new Blob([textarea.value],{type:'text/plain'});
        var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'session-plan.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      });
    }
  }

  // Initialize planners on page
  document.addEventListener('DOMContentLoaded', function(){
    // Some pages include two planners; support both ids
    ['planner-compact','planner-full'].forEach(wirePlanner);
  });

})();
