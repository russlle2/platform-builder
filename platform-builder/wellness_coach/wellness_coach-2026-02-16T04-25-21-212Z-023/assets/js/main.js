/* main.js — interactivity for diagnostic, habits, pricing */
(function(){
  // Year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Diagnostic
  function calcScore(form){
    var f = new FormData(form);
    var total = 0;
    ['energy','sleep','stress','movement','restore'].forEach(function(k){
      var v = parseInt(f.get(k)||'0',10);
      total += v;
    });
    return total;
  }
  var diagForm = document.getElementById('diagForm');
  var diagRun = document.getElementById('diagRun');
  var diagResult = document.getElementById('diagResult');
  diagRun && diagRun.addEventListener('click', function(){
    var score = calcScore(diagForm);
    var msg = '';
    if(score <= 7){
      msg = '<strong>Your focus: Stabilize & restore</strong><br>Start with rhythm and a daily restorative micro-habit. Try the Seed Path for steady structure.';
    } else if(score <= 11){
      msg = '<strong>Your focus: Build momentum</strong><br>Introduce simple progressive habits and 1:1 design sessions. Flow Path fits this season.';
    } else {
      msg = '<strong>Your focus: Integration</strong><br>You have foundations — the Embody Path supports integration into leadership and long-term resilience.';
    }
    // Suggest 3 micro-habits
    var habits = ['4-minute morning breath','10-minute midday walk','Evening wind-down journaling'];
    diagResult.innerHTML = '<div class="result-copy">'+msg+'<div style="margin-top:10px"><em>Try these this week:</em><ul style="margin:8px 0 0;padding-left:18px"><li>'+habits.join('</li><li>')+'</li></ul></div></div>';
    diagResult.scrollIntoView({behavior:'smooth', block:'center'});
  });

  // Micro-habits: save to localStorage
  var habitsList = document.getElementById('habitsList');
  var saveHabits = document.getElementById('saveHabits');
  var clearHabits = document.getElementById('clearHabits');
  var habitToast = document.getElementById('habitToast');
  function loadHabits(){
    try{
      var data = JSON.parse(localStorage.getItem('wc_habits')||'[]');
      if(!habitsList) return;
      var checkboxes = habitsList.querySelectorAll('input[type=checkbox]');
      checkboxes.forEach(function(cb){
        cb.checked = data.indexOf(cb.getAttribute('data-habit')) !== -1;
      });
    }catch(e){}
  }
  function persistHabits(){
    var boxes = habitsList.querySelectorAll('input[type=checkbox]');
    var out = [];
    boxes.forEach(function(cb){ if(cb.checked) out.push(cb.getAttribute('data-habit')); });
    localStorage.setItem('wc_habits', JSON.stringify(out));
    habitToast.textContent = out.length ? 'Saved ' + out.length + ' habit(s) for the week.' : 'No habits saved.';
    setTimeout(function(){ habitToast.textContent = ''; }, 3000);
  }
  saveHabits && saveHabits.addEventListener('click', persistHabits);
  clearHabits && clearHabits.addEventListener('click', function(){ localStorage.removeItem('wc_habits'); loadHabits(); habitToast.textContent='Cleared.'; setTimeout(function(){ habitToast.textContent=''; },2000); });
  loadHabits();

  // Pricing selection
  document.querySelectorAll('.price-card button').forEach(function(btn){
    btn.addEventListener('click', function(){
      var plan = btn.getAttribute('data-plan') || btn.textContent.trim();
      alert('Selected: ' + plan + '. You will be directed to booking to complete enrollment.');
      window.location = '/book.html?plan='+encodeURIComponent(plan);
    });
  });
})();
