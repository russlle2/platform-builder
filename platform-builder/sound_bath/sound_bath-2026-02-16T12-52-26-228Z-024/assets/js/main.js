(function(){
  // Insert current year
  var y = new Date().getFullYear();
  var el = document.getElementById('year'); if(el) el.textContent = y;

  // Toggle mobile menu
  var toggle = document.getElementById('menu-toggle');
  var nav = document.getElementById('main-nav');
  if(toggle && nav){
    toggle.addEventListener('click', function(){
      nav.classList.toggle('open');
      if(nav.classList.contains('open')){
        nav.style.display = 'flex';
        toggle.textContent = '✕';
      } else {
        nav.style.display = '';
        toggle.textContent = '☰';
      }
    });
  }

  // Diagnostic quick suggestion logic
  var diagBtn = document.getElementById('diagnostic-btn');
  if(diagBtn){
    diagBtn.addEventListener('click', function(){
      var form = document.getElementById('diagnostic-form');
      var sel = form.querySelector('input[name="state"]:checked');
      var out = document.getElementById('diagnostic-suggestion');
      if(!sel){ out.textContent = 'Select one option to get a tailored micro-practice.'; return; }
      var v = sel.value;
      var msg = '';
      if(v==='stressed') msg = 'Try a 4-7-8 breathing cycle pre-session and book a grounding spot near the back of the room.';
      if(v==='sleepless') msg = 'Ask for a recording after your session and commit to a 7-minute evening tone ritual for five nights.';
      if(v==='flat') msg = 'Start with humming for three minutes and a soft chime to scaffold emotional sensation.';
      out.textContent = msg;
    });
  }

  // Habit toggle
  var habitToggle = document.getElementById('habit-toggle');
  var habitMore = document.getElementById('habit-more');
  if(habitToggle && habitMore){
    habitToggle.addEventListener('click', function(){
      habitMore.classList.toggle('hidden');
      habitToggle.textContent = habitMore.classList.contains('hidden') ? 'More tips' : 'Hide tips';
    });
  }

  // Insert NEXT_EVENT_DATE placeholder into Next event card if present
  var next = document.getElementById('next-event');
  if(next){
    var raw = next.textContent.trim();
    if(raw.indexOf('{{NEXT_EVENT_DATE}}')>-1 || raw===''){
      // Friendly default if placeholder not replaced
      next.textContent = '{{NEXT_EVENT_DATE}}';
    }
  }

})();