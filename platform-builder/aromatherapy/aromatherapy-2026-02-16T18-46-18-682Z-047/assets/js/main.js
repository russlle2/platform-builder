(function(){
  // Simple site interactions: nav toggle, diagnostic suggestion, habit save
  var navToggle=document.getElementById('navToggle');
  if(navToggle){navToggle.addEventListener('click',function(){document.body.classList.toggle('nav-open');})}

  // Year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // Diagnostic form
  var diag=document.getElementById('diagForm');
  if(diag){diag.addEventListener('submit',function(e){e.preventDefault();var form=new FormData(diag);var goal=form.get('goal');var strength=form.get('strength');var note='Suggested: a gentle blend with light top-notes and soft base notes. Try low dilution and patch-test first.'; if(goal==='gentle sleep'){note='Suggested: calming middle-notes with subtle base — use in a diffuser at low intensity and always patch-test.'} else if(goal==='uplift'){note='Suggested: bright top-notes (citrus/herb) used sparingly; avoid direct skin contact.'}
    var el=document.getElementById('diagResult'); if(el){el.textContent=note}
  })}

  // Habits persistence
  var saveBtn=document.getElementById('saveHabits');
  var checkboxes=document.querySelectorAll('.habit-list input[type=checkbox]');
  function loadHabits(){checkboxes.forEach(function(cb){try{cb.checked=localStorage.getItem('habit:'+cb.dataset.habit)==='1'}catch(e){}})}
  function saveHabits(){checkboxes.forEach(function(cb){try{localStorage.setItem('habit:'+cb.dataset.habit,cb.checked? '1':'0')}catch(e){}}); if(saveBtn){saveBtn.textContent='Saved'} setTimeout(function(){if(saveBtn)saveBtn.textContent='Save habits'},1200)}
  if(saveBtn){saveBtn.addEventListener('click',saveHabits)}; loadHabits();

  // Small accessibility enhancement: close nav when clicking outside on mobile
  document.addEventListener('click',function(e){if(document.body.classList.contains('nav-open') && !e.target.closest('.nav') && !e.target.closest('#navToggle')){document.body.classList.remove('nav-open')}})
})();