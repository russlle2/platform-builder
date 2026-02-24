(function(){
  document.addEventListener('DOMContentLoaded',function(){
    // Year
    var y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();

    // Nav toggle for mobile
    var toggle = document.getElementById('navToggle');
    var list = document.getElementById('navList');
    if(toggle && list){
      toggle.addEventListener('click',function(){
        var expanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded',!expanded);
        list.classList.toggle('show');
      });
    }

    // Smooth scroll for same-page anchors
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        e.preventDefault();
        var id = this.getAttribute('href').slice(1);
        var el = document.getElementById(id);
        if(el){ el.scrollIntoView({behavior:'smooth',block:'start'}); }
      });
    });

    // Simple diagnostic form handler (educational only)
    var quick = document.getElementById('quickDiagnostic');
    if(quick){
      quick.addEventListener('submit',function(e){
        e.preventDefault();
        var fd = new FormData(quick);
        var notes = [];
        if(fd.get('sleep') !== 'Restful') notes.push('Sleep shows room for improvement.');
        if(fd.get('energy') !== 'Good') notes.push('Energy may respond to nutrition and sleep fixes.');
        if(fd.get('digestion') !== 'Comfortable') notes.push('Consider a gentle digestive review.');
        if(!notes.length) notes.push('Your quick responses look generally balanced.');
        alert('Quick insights:\n\n' + notes.join('\n'));
      });
    }

    // Accessibility: allow Esc to close nav
    document.addEventListener('keydown',function(e){
      if(e.key === 'Escape'){ if(list && list.classList.contains('show')) list.classList.remove('show'); if(toggle) toggle.setAttribute('aria-expanded','false'); }
    });
  });
})();