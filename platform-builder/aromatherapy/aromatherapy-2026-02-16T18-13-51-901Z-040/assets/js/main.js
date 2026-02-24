(function(){
  // Simple interactions: mobile menu, mini diagnostic, smooth scroll
  document.addEventListener('DOMContentLoaded',function(){
    var toggle = document.querySelector('.menu-toggle');
    var nav = document.querySelector('.main-nav');
    if(toggle){
      toggle.addEventListener('click',function(){
        var open = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!open));
        if(nav) nav.style.display = open ? 'none' : 'flex';
      });
    }

    // Smooth scroll for internal links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        var target = document.querySelector(this.getAttribute('href'));
        if(target){
          e.preventDefault();
          target.scrollIntoView({behavior:'smooth',block:'start'});
        }
      });
    });

    // Mini diagnostic handling — safety-forward tips
    var form = document.getElementById('mini-diagnostic');
    var result = document.getElementById('mini-result');
    if(form){
      form.addEventListener('submit',function(e){
        e.preventDefault();
        var data = new FormData(form);
        var family = data.get('family');
        var safety = data.getAll('safety');
        var tips = [];
        if(safety.includes('pregnancy')){
          tips.push('Pregnancy noted: several oils are avoided; choose physician-reviewed alternatives.');
        }
        if(safety.includes('pets')){
          tips.push('Pets present: prefer low-volatility options and limit room diffusion time.');
        }
        if(safety.includes('sensitivities')){
          tips.push('Sensitivity: use very low dilution and patch-test before topical use.');
        }
        if(tips.length===0){
          if(family==='calm') tips.push('Try a 1–2% lavender roll-on for a gentle bedtime cue. Patch test first.');
          if(family==='citrus') tips.push('Citrus inhaler (no topical use if photosensitivity risk). Use brief, occasional inhalation.');
          if(family==='earth') tips.push('Herbal blends can be grounding; dilute conservatively (1–3%).');
        }
        result.textContent = tips.join(' ');
      });
    }

    // Small accessibility enhancement: announce nav state
    if(toggle){
      toggle.addEventListener('click',function(){
        var expanded = this.getAttribute('aria-expanded');
        this.setAttribute('aria-label', expanded === 'true' ? 'Close menu' : 'Open menu');
      });
    }
  });
})();
