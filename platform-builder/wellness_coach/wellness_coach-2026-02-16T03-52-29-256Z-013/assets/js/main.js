// Main JS for small interactions
document.addEventListener('DOMContentLoaded',function(){
  // year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  if(toggle){
    toggle.addEventListener('click',function(){
      document.querySelector('.nav').classList.toggle('open');
    });
  }

  // Diagnostic logic
  var diagBtn = document.getElementById('diag-run');
  if(diagBtn){
    diagBtn.addEventListener('click',function(e){
      e.preventDefault();
      var eVal = parseInt(document.getElementById('energy').value,10);
      var sVal = parseInt(document.getElementById('sleep').value,10);
      var rVal = parseInt(document.getElementById('rituals').value,10);
      var score = eVal + sVal + rVal; // 3-9
      var result = document.getElementById('diag-result');
      var text = '';
      if(score <= 4){
        text = '<strong>Next step:</strong> Start with one 3-minute anchor — a simple breath+stretch each morning. Tiny, consistent, grounding.';
      } else if(score <= 7){
        text = '<strong>Next step:</strong> Stabilize with a daily mini-ritual and a weekly reflection. Consider a Seed cohort to build steady routine.';
      } else {
        text = '<strong>Next step:</strong> Focus on integration — add social accountability and a tailored micro-habit plan to deepen gains.';
      }
      result.innerHTML = text;
    });
  }

  // Micro-habits persistent toggles
  var habitChecks = document.querySelectorAll('#habits-list input[type=checkbox]');
  habitChecks.forEach(function(cb){
    var key = 'habit_'+cb.dataset.habit;
    if(localStorage.getItem(key)==='true') cb.checked = true;
    cb.addEventListener('change',function(){
      localStorage.setItem(key,cb.checked);
    });
  });

});

// Lead magnet: fake send
function leadForm(e){
  e.preventDefault();
  var email = document.getElementById('lead-email');
  if(!email || !email.value) return alert('Please enter your email');
  email.value = '';
  alert('Thank you — the 7-Day Tiny Rituals guide will arrive at your inbox.');
}
