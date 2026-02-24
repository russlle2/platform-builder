(function(){
  // Year in footer
  document.addEventListener('DOMContentLoaded',function(){
    var y = new Date().getFullYear();
    var el = document.getElementById('year'); if(el) el.textContent = y;

    // Simple mobile menu
    var btn = document.querySelector('.menu-toggle');
    var nav = document.querySelector('.main-nav');
    if(btn && nav){
      btn.addEventListener('click',function(){
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        nav.style.display = open ? '' : 'flex';
      });
    }

    // Scroll-reveal
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var items = document.querySelectorAll('.reveal');
    if(prefersReduced){
      items.forEach(function(i){ i.classList.add('is-visible'); });
    } else if('IntersectionObserver' in window){
      var obs = new IntersectionObserver(function(entries){
        entries.forEach(function(e){ if(e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); } });
      },{threshold:0.12});
      items.forEach(function(i){ obs.observe(i); });
    } else {
      // fallback
      items.forEach(function(i){ i.classList.add('is-visible'); });
    }

    // Session Planner logic
    var form = document.getElementById('planner-form');
    var buildBtn = document.getElementById('build-plan');
    var copyBtn = document.getElementById('copy-plan');
    var output = document.getElementById('plan-output');

    function getFormData(){
      var fd = {};
      if(!form) return fd;
      var f = new FormData(form);
      fd.intention = (f.get('intention')||'').trim();
      fd.mood = f.get('mood')||'';
      fd.length = f.get('length')||'';
      fd.scent = f.get('scent')||'';
      fd.pets = f.get('pets')?true:false;
      fd.pregnancy = f.get('pregnancy')?true:false;
      return fd;
    }

    function buildPlanText(data){
      var lines = [];
      lines.push('{{BUSINESS_NAME}} — session sketch');
      lines.push('Intention: ' + (data.intention || '—')); 
      lines.push('Mood: ' + data.mood);
      lines.push('Length: ' + data.length + ' minutes');
      lines.push('Suggested scent family: ' + data.scent);
      lines.push('Notes:');
      lines.push('- Brief intake to explore scent history and sensitivities.');
      lines.push('- Guided scent sampling (we will suggest gentle dilutions).');
      lines.push('- Simple at-home ritual to try for 1–2 weeks.');

      if(data.pets) lines.push('- Pet note: recommendations will avoid oils known to irritate animals and include storage guidance.');
      if(data.pregnancy) lines.push('- Pregnancy/nursing note: we will select pregnancy-safe options and suggest patch testing.');

      lines.push('Safety reminder: No medical claims are made. Scents may support wellbeing for some people; we emphasize dilution and patch tests.');
      lines.push('Contact: {{PHONE}} | {{EMAIL}}');
      return lines.join('\n');
    }

    if(buildBtn){
      buildBtn.addEventListener('click',function(){
        var data = getFormData();
        var txt = buildPlanText(data);
        output.textContent = txt;
      });
    }

    if(copyBtn){
      copyBtn.addEventListener('click',function(){
        var text = output.textContent || '';
        if(!text) return;
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(text).then(function(){
            copyBtn.textContent = 'Copied';
            setTimeout(function(){ copyBtn.textContent = 'Copy Summary'; },1400);
          }).catch(function(){ fallbackCopy(text); });
        } else {
          fallbackCopy(text);
        }
      });
    }

    function fallbackCopy(text){
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try{ document.execCommand('copy'); }catch(e){}
      document.body.removeChild(ta);
      alert('Plan copied to clipboard');
    }

  });
})();