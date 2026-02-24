// Minimal interactivity for accordions, habits, and simple booking modal
document.addEventListener('DOMContentLoaded',function(){
  // Accordions
  var acc = document.getElementsByClassName('accordion');
  for(var i=0;i<acc.length;i++){
    acc[i].addEventListener('click',function(){
      this.classList.toggle('active');
      var panel = this.nextElementSibling;
      if(panel.style.display==='block'){panel.style.display='none'}else{panel.style.display='block'}
    });
  }

  // Habits: save to localStorage
  var saveBtn = document.getElementById('saveHabits');
  var resetBtn = document.getElementById('resetHabits');
  function getHabitsState(){
    var checks = document.querySelectorAll('.habits input[type="checkbox"]');
    var state = {};
    checks.forEach(function(c){state[c.dataset.habit]=c.checked});
    return state;
  }
  function restoreHabits(){
    try{
      var raw = localStorage.getItem('micro_habits');
      if(!raw) return;
      var obj = JSON.parse(raw);
      var checks = document.querySelectorAll('.habits input[type="checkbox"]');
      checks.forEach(function(c){c.checked = !!obj[c.dataset.habit]});
    }catch(e){console.warn(e)}
  }
  if(saveBtn){saveBtn.addEventListener('click',function(){
    var state = getHabitsState();
    localStorage.setItem('micro_habits',JSON.stringify(state));
    alert('Micro-practices saved to local browser note.');
  })}
  if(resetBtn){resetBtn.addEventListener('click',function(){
    var checks = document.querySelectorAll('.habits input[type="checkbox"]');
    checks.forEach(function(c){c.checked=false});
    localStorage.removeItem('micro_habits');
  })}
  restoreHabits();

  // Basic CTA: smooth scroll for internal anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id = this.getAttribute('href').substring(1);
      var el = document.getElementById(id);
      if(el){el.scrollIntoView({behavior:'smooth'});}    
    });
  });
});