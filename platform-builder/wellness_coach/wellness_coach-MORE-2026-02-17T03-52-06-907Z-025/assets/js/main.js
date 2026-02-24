(function(){
  "use strict";

  // Scroll-triggered reveal with prefers-reduced-motion support
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setupReveal(){
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if(prefersReduced || !('IntersectionObserver' in window)){
      nodes.forEach(function(n){n.classList.add('active');});
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('active');
          io.unobserve(e.target);
        }
      });
    },{threshold:0.12});

    nodes.forEach(function(n){io.observe(n);});
  }

  // Session Planner logic
  function setupPlanner(){
    var form = document.getElementById('planner-form');
    var buildBtn = document.getElementById('build-plan');
    var copyBtn = document.getElementById('copy-plan');
    var downloadBtn = document.getElementById('download-plan');
    var output = document.getElementById('plan-output');

    function gather(){
      var data = {};
      var fd = new FormData(form);
      data.name = (fd.get('name')||'').trim();
      data.focus = fd.get('focus') || 'clarity';
      data.duration = parseInt(fd.get('duration')||30,10);
      data.habits = fd.getAll('habits');
      return data;
    }

    function buildText(d){
      var lines = [];
      var greet = d.name?('Plan for '+d.name):'Personal plan';
      lines.push(greet);
      lines.push('Focus: '+(d.focus||'clarify priorities'));
      lines.push('Session length: '+d.duration+' minutes');
      lines.push('Includes: '+(d.habits.length?d.habits.join(', '):'none'));
      lines.push('\nSteps:');

      // Simple composition algorithm
      var core = Math.max(10, Math.min(60, d.duration));
      var anchor = Math.round(core * 0.2);
      var practice = Math.round(core * 0.5);
      var review = core - anchor - practice;

      lines.push('1) Anchor ('+anchor+' min) — a short cue to arrive: '+(d.habits.indexOf('breath')>-1? 'breath practice':'silent check-in'));
      lines.push('2) Practice ('+practice+' min) — focused work: choose 1 task aligned with your focus');
      lines.push('3) Review ('+review+' min) — quick notes and a single tweak for next time');

      lines.push('\nMicro-habits to keep:');
      if(d.habits.indexOf('breath')>-1) lines.push('- 1-minute breath cue at start');
      if(d.habits.indexOf('movement')>-1) lines.push('- brief standing stretch at midpoint');
      if(d.habits.indexOf('intake')>-1) lines.push('- water check after session');
      if(d.habits.indexOf('reflection')>-1) lines.push('- jot one sentence of what changed');

      lines.push('\nWeekly checkpoint: choose one short question to answer on Sunday: What move mattered most?');
      lines.push('\nNotes: This plan is a practical framework — small, repeatable changes to steady your days.');
      return lines.join('\n');
    }

    function setOutput(text){
      output.textContent = text;
      copyBtn.disabled = !text;
      downloadBtn.disabled = !text;
    }

    buildBtn.addEventListener('click', function(){
      var data = gather();
      var text = buildText(data);
      setOutput(text);
    });

    copyBtn.addEventListener('click', function(){
      var txt = output.textContent;
      if(!txt) return;
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(txt).then(function(){
          copyBtn.textContent = 'Copied';
          setTimeout(function(){copyBtn.textContent='Copy summary';},1600);
        });
      } else {
        var ta = document.createElement('textarea');
        ta.value = txt; document.body.appendChild(ta); ta.select();
        try{document.execCommand('copy'); copyBtn.textContent='Copied'; setTimeout(function(){copyBtn.textContent='Copy summary';},1600);}catch(e){}
        document.body.removeChild(ta);
      }
    });

    downloadBtn.addEventListener('click', function(){
      var txt = output.textContent;
      if(!txt) return;
      var blob = new Blob([txt],{type:'text/plain;charset=utf-8'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'session-plan.txt';
      document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(url);document.body.removeChild(a);},100);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    setupReveal();
    setupPlanner();
  });
})();
