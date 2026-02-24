// Minimal interactive script for diagnostic and habits
document.addEventListener('DOMContentLoaded',function(){
  // diagnostic
  var diagRun = document.getElementById('diagRun');
  var diagForm = document.getElementById('diagForm');
  var diagResult = document.getElementById('diagResult');
  diagRun.addEventListener('click', function(){
    var form = new FormData(diagForm);
    var s = 0; ['q1','q2','q3'].forEach(function(k){ s += Number(form.get(k) || 0); });
    var text = '';
    if(s <= 2){
      text = '<strong>Start with Rituals.</strong> Your result shows opportunity in consistent anchors. Try a 5-minute morning breath and a 3-line evening journal.';
    } else if(s <=4){
      text = '<strong>Focus on Regulation.</strong> Small, frequent pulses of movement and breath will raise baseline resilience. Begin with a lunchtime walk and a breathing check.';
    } else {
      text = '<strong>Deepen Practice.</strong> You have steady habits—use weekly mapping and community to refine and make them sustainable.';
    }
    diagResult.querySelector('.result-text').innerHTML = text + '<p class="muted">You can save this starter into the cohort onboarding.</p>';
  });

  // habits save + load
  var saveBtn = document.getElementById('saveHabits');
  var clearBtn = document.getElementById('clearHabits');
  var habitStatus = document.getElementById('habitStatus');
  var habitList = document.getElementById('habitList');
  function loadHabits(){
    var saved = JSON.parse(localStorage.getItem('wc_habits_v1')||'[]');
    habitList.querySelectorAll('input[type=checkbox]').forEach(function(cb){
      cb.checked = saved.indexOf(cb.dataset.habit) !== -1;
    });
  }
  function saveHabits(){
    var chosen = [];
    habitList.querySelectorAll('input[type=checkbox]').forEach(function(cb){ if(cb.checked) chosen.push(cb.dataset.habit); });
    localStorage.setItem('wc_habits_v1', JSON.stringify(chosen));
    habitStatus.textContent = chosen.length ? 'Saved '+chosen.length+' habit(s) — you can bring these to your cohort.' : 'No habits saved.';
    setTimeout(function(){ habitStatus.textContent = ''; },4000);
  }
  saveBtn.addEventListener('click', saveHabits);
  clearBtn.addEventListener('click', function(){ localStorage.removeItem('wc_habits_v1'); loadHabits(); habitStatus.textContent='Cleared.'; setTimeout(function(){ habitStatus.textContent=''; },2000); });
  loadHabits();

  // simple menu toggle
  var menuToggle = document.querySelector('.menu-toggle');
  menuToggle && menuToggle.addEventListener('click', function(){
    var nav = document.querySelector('.nav');
    if(nav.style.display === 'flex') nav.style.display = '';
    else nav.style.display = 'flex';
  });

  // smooth scroll for anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();var t=document.querySelector(this.getAttribute('href'));
      if(t) t.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
});