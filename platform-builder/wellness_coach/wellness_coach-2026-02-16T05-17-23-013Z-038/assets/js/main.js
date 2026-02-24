// Interactivity for the wellness coach template
document.addEventListener('DOMContentLoaded',function(){
  // Diagnostic quiz
  var run = document.getElementById('diagnostic-run');
  var form = document.getElementById('diagnostic-form');
  var result = document.getElementById('diagnostic-result');
  if(run){
    run.addEventListener('click',function(){
      var score = 0;
      try{
        var data = new FormData(form);
        for(var pair of data.entries()){ score += Number(pair[1]||0); }
      }catch(e){ score = 0 }
      var msg = '';
      if(score <= 3) msg = 'Rest and reset: focus on one tiny practice and predictably schedule rest.';
      else if(score <=7) msg = 'Shaping momentum: you have seeds of rhythm — anchor them with weekly commitments.'n
      else msg = 'Aligned cadence: you are ready to deepen with peer support and integration.';
      result.textContent = msg;
    });
  }

  // Habit selection
  var habits = document.querySelectorAll('#habit-grid .habit');
  var habitPicked = document.getElementById('habit-picked');
  var habitChoose = document.getElementById('habit-choose');
  var selected = null;
  habits.forEach(function(h){
    h.addEventListener('click',function(){
      habits.forEach(x=>x.classList.remove('active'));
      h.classList.add('active');
      selected = h.getAttribute('data-habit');
      habitPicked.textContent = '';
    });
  });
  if(habitChoose){
    habitChoose.addEventListener('click',function(){
      if(!selected){ habitPicked.textContent = 'Please choose one habit first.'; return }
      var label = document.querySelector('#habit-grid .habit.active').textContent;
      habitPicked.textContent = 'Nice choice — "' + label + '". Check in after 7 days.';
    });
  }

  // Pricing toggle
  var toggles = document.querySelectorAll('.toggle-btn');
  toggles.forEach(function(btn){
    btn.addEventListener('click',function(){
      toggles.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      // Could swap pricing grid content — simplified here
    });
  });

  // Smooth scroll for anchor links to sections
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor){
    anchor.addEventListener('click',function(e){
      e.preventDefault();
      var target = document.querySelector(this.getAttribute('href'));
      if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // Minimal accessibility fix: ensure elements with live regions are announced
});
