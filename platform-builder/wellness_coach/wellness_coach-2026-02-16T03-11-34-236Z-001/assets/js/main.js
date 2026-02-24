(function(){
  // Simple interactions: mobile nav, diagnostic scoring, year
  document.getElementById('year').textContent = new Date().getFullYear();

  var toggle = document.querySelector('.nav-toggle');
  toggle && toggle.addEventListener('click', function(){
    var nav = document.querySelector('.nav');
    if(nav.style.display==='block'){nav.style.display=''}else{nav.style.display='block'}
  });

  // Diagnostic form scoring
  var diagBtn = document.getElementById('diagnostic-submit');
  var diagForm = document.getElementById('diagnostic-form');
  var resultBox = document.getElementById('diagnostic-result');
  function interpret(score){
    if(score<=8) return 'Emerging habits — Seed Cohort is a match. Focus on small anchors and daily rituals.';
    if(score<=14) return 'Gaining traction — Embody Cohort will help you deepen consistency and community support.';
    return 'Ready for deeper integration — consider the Deep Path for extended practice and a capstone.';
  }
  if(diagBtn){
    diagBtn.addEventListener('click', function(){
      var form = new FormData(diagForm); var total=0;
      for(var pair of form.entries()){ total += parseInt(pair[1])||0 }
      resultBox.textContent = interpret(total);
      resultBox.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }

  // Smooth anchor links for CTAs
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault(); var id = this.getAttribute('href').slice(1); var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth'});
    });
  });
})();