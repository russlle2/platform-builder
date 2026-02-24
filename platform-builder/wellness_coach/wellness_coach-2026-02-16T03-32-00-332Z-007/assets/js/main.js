// Minimal interactive behaviors: diagnostic, nav toggle, year
(function(){
  document.getElementById('year').textContent = new Date().getFullYear();

  // Mobile nav
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if(toggle && nav){
    toggle.addEventListener('click', function(){
      nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
    });
  }

  // Diagnostic quick-response
  var form = document.getElementById('diagnostic-form');
  var result = document.getElementById('diagnostic-result');
  if(form && result){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var area = form.elements['area'].value;
      var ritual = form.elements['ritual'].value;
      var msg = '';
      if(area === 'energy') msg = 'Focus: gentle evening routines and a 14-day sleep-friendly window.';
      if(area === 'stress') msg = 'Focus: boundary scripting and two brief mid-day resets.';
      if(area === 'movement') msg = 'Focus: micro-strength sessions (10 minutes) paired with daily walking.';
      if(area === 'nutrition') msg = 'Focus: simple protein-forward breakfasts and hydration anchors.';
      if(ritual === 'rarely') msg += ' You’ll likely benefit from a daily pairing ritual to build momentum.';
      if(ritual === 'sometimes') msg += ' You have habits to refine — try 7-day consistency challenges.';
      if(ritual === 'regularly') msg += ' Great foundation — let’s iterate for alignment and next-level gains.';
      result.textContent = msg;
      result.classList.remove('hidden');
      result.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }

  // Simple micro-habit toggles (local state)
  var habitBoxes = document.querySelectorAll('.habit');
  habitBoxes.forEach(function(h,idx){
    h.addEventListener('click', function(){
      var key = 'habit-'+idx;
      var done = localStorage.getItem(key) === '1';
      if(done){
        localStorage.removeItem(key);
        h.style.opacity = '1';
        h.style.transform='none';
      } else {
        localStorage.setItem(key,'1');
        h.style.opacity = '0.65';
        h.style.transform='translateY(2px)';
      }
    });
    // restore
    if(localStorage.getItem('habit-'+idx) === '1'){
      h.style.opacity = '0.65';
      h.style.transform='translateY(2px)';
    }
  });
})();
