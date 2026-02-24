// Minimal interactions: diagnostic result and year + nav smooth scroll
document.addEventListener('DOMContentLoaded',function(){
  var year = document.getElementById('year'); if(year) year.textContent = new Date().getFullYear();

  var form = document.getElementById('mini-diagnostic');
  if(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var data = new FormData(form);
      var concern = data.get('concern');
      var frequency = data.get('frequency');
      var goal = data.get('goal') || '';
      var history = data.get('history');
      var result = document.getElementById('diagnostic-result');
      var suggestions = [];

      if(concern === 'anxiety') suggestions.push('Focus: simple breathing routines and behavioral experiments.');
      if(concern === 'trauma') suggestions.push('Focus: safety-building, stabilizing resources before deeper processing.');
      if(concern === 'relationships') suggestions.push('Focus: communication clarity and boundary practices.');
      if(concern === 'life') suggestions.push('Focus: meaning-focused inquiry and decision support.');

      if(frequency==='daily') suggestions.push('We might begin with weekly sessions to create consistency.');
      if(history==='no') suggestions.push('We will orient you carefully and co-create a supportive plan.');

      var out = 'Suggested next step: ' + suggestions.join(' ');
      if(goal) out += ' Your goal note: "' + goal.trim().slice(0,200) + '"';
      if(result) result.textContent = out;
    });
  }

  var diagOpen = document.getElementById('diagnostic-open');
  if(diagOpen){
    diagOpen.addEventListener('click',function(){
      var el = document.getElementById('diagnostic');
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }

  // Simple smooth scroll for nav links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault(); var target = document.querySelector(this.getAttribute('href')); if(target) target.scrollIntoView({behavior:'smooth'});
    });
  });
});