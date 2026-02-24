(function(){
  // Utility
  function $(sel){return document.querySelector(sel)}
  function $all(sel){return Array.from(document.querySelectorAll(sel))}

  // Year
  var y = new Date().getFullYear();
  var yearEl = $('#year'); if(yearEl) yearEl.textContent = y;

  // Diagnostic form
  var diagForm = $('#diag-form');
  var diagResult = $('#diag-result');
  var diagReset = $('#diag-reset');

  function interpret(score){
    if(score<=3) return {m:'You might be starting. A single two-minute habit would move the needle.',t:'Beginner'};
    if(score<=6) return {m:'You have budding rhythms. Focus on making one daily small practice easier to keep.',t:'Emerging'};
    if(score<=8) return {m:'You maintain meaningful rituals. A cohort can deepen reflection and sustain growth.',t:'Established'};
    return {m:'You live with steady practices. Consider mentoring others or refining deeper tendings.',t:'Anchored'};
  }

  if(diagForm){
    diagForm.addEventListener('submit',function(e){
      e.preventDefault();
      var data = new FormData(diagForm);
      var total = 0;
      for(var v of data.values()){ total += Number(v); }
      var out = interpret(total);
      diagResult.innerHTML = '<strong>Rhythm score: '+total+' — '+out.t+'</strong><p>'+out.m+'</p><p><a class="btn primary" href="{{PRIMARY_CTA_URL}}">Join the next cohort</a> <a class="btn ghost" href="/contact.html">Ask a question</a></p>';
      diagResult.scrollIntoView({behavior:'smooth'});
    });
  }
  if(diagReset){ diagReset.addEventListener('click',function(){ diagForm.reset(); diagResult.innerHTML = ''; }); }

  // Habit toggles: persist in localStorage
  var toggles = $all('.habit-toggle');
  toggles.forEach(function(cb, i){
    var key = 'habit_'+i;
    var saved = localStorage.getItem(key);
    if(saved==='true') cb.checked = true;
    cb.addEventListener('change',function(){ localStorage.setItem(key, cb.checked); });
  });

  // Simple smooth scrolling for anchor links
  $all('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var id = a.getAttribute('href');
      if(id.length>1){ e.preventDefault(); var el = document.querySelector(id); if(el) el.scrollIntoView({behavior:'smooth'}); }
    });
  });

  // Hamburger toggle
  var ham = document.querySelector('.hamburger');
  var nav = document.querySelector('.main-nav');
  if(ham && nav){ ham.addEventListener('click',function(){ nav.classList.toggle('open'); }); }
})();
