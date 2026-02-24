(function(){
  // Accessibility: prefer-reduced-motion
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll reveal
  function initReveal(){
    var items = document.querySelectorAll('[data-reveal]');
    if(reduced){
      items.forEach(function(it){it.classList.add('is-visible')});
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    },{root:null,threshold:0.12});
    items.forEach(function(it){io.observe(it)});
  }

  // Session Planner logic
  function initPlanner(){
    var buildBtn = document.getElementById('build-plan');
    var copyBtn = document.getElementById('copy-plan');
    var exportLink = document.getElementById('export-plan');
    var output = document.getElementById('plan-output');
    var form = document.getElementById('planner-form');

    function gather(){
      var formData = new FormData(form);
      var focus = formData.get('focus');
      var length = formData.get('length');
      var freq = formData.get('frequency');
      var notes = formData.get('notes')||'';
      var supports = formData.getAll('support');
      return {focus,length,freq,notes,supports};
    }

    function humanizeFocus(code){
      var map={sleep:'Sleep support',energy:'Daytime energy',stress:'Stress resilience',movement:'Movement ease',digestion:'Digestive care'};
      return map[code]||code;
    }

    function craftPlan(){
      var d=gather();
      var lines=[];
      lines.push('Personal session plan — generated');
      lines.push('Focus: '+humanizeFocus(d.focus));
      lines.push('Session length: '+d.length+' minutes');
      lines.push('Suggested cadence: '+d.freq);
      if(d.supports.length){
        lines.push('Supports: '+d.supports.join(', '));
      } else {
        lines.push('Supports: none selected');
      }
      lines.push('Practices to try:');

      // lightweight rule-based suggestions
      if(d.focus==='sleep'){
        lines.push('- Evening wind-down: 10 min breath + screen tuck 60–90 minutes before bed');
        lines.push('- Gentle stretch to cue parasympathetic state');
      } else if(d.focus==='stress'){
        lines.push('- 3-min paced breath (inhale 4, exhale 6) mid-afternoon');
        lines.push('- Micro posture breaks each hour');
      } else if(d.focus==='energy'){
        lines.push('- Morning activation: light movement + 30 sec energizing breath');
        lines.push('- Midday 7-min walk with mindful steps');
      } else if(d.focus==='movement'){
        lines.push('- Short mobility sequence focusing on joints that feel tight');
        lines.push('- Daily 5-minute body scan to notice asymmetry');
      } else {
        lines.push('- Start with 5 minutes of noticing breath and gentle movement');
      }

      if(d.supports.includes('nutrition')){
        lines.push('- Quick meal check: note when you feel most alert after eating');
      }
      if(d.notes.trim()){ lines.push('Notes: '+d.notes.trim()); }
      lines.push('Plan created: '+(new Date()).toLocaleString());
      return lines.join('\n');
    }

    function updateOutput(text){
      output.textContent = text;
      // update download link
      var blob = new Blob([text],{type:'text/plain'});
      var url = URL.createObjectURL(blob);
      exportLink.href = url;
    }

    buildBtn.addEventListener('click',function(){
      var txt = craftPlan();
      updateOutput(txt);
    });

    copyBtn.addEventListener('click',function(){
      var txt = output.textContent || '';
      if(!txt){
        copyBtn.textContent = 'Nothing to copy';
        setTimeout(function(){copyBtn.textContent='Copy summary'},1500);
        return;
      }
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(txt).then(function(){
          copyBtn.textContent = 'Copied!';
          setTimeout(function(){copyBtn.textContent='Copy summary'},1300);
        });
      } else {
        // fallback
        var ta = document.createElement('textarea');
        ta.value = txt;document.body.appendChild(ta);ta.select();
        try{document.execCommand('copy');copyBtn.textContent='Copied!';}
        catch(e){copyBtn.textContent='Copy failed'}
        document.body.removeChild(ta);
        setTimeout(function(){copyBtn.textContent='Copy summary'},1300);
      }
    });
  }

  // Mobile menu simple
  function initMenu(){
    var btn = document.querySelector('.menu-toggle');
    var nav = document.querySelector('.nav');
    if(!btn) return;
    btn.addEventListener('click',function(){
      var open = this.getAttribute('aria-expanded')==='true';
      this.setAttribute('aria-expanded', String(!open));
      if(open){nav.style.display='none'}else{nav.style.display='flex'}
    });
  }

  document.addEventListener('DOMContentLoaded',function(){
    initReveal();
    initPlanner();
    initMenu();
  });
})();