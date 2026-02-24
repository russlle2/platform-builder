(function(){
  // Basic DOM helpers
  function qs(sel, ctx){ return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx){ return Array.from((ctx || document).querySelectorAll(sel)); }

  // Mobile nav toggle
  var toggle = qs('.nav-toggle');
  var navList = qs('#nav-list');
  if(toggle){
    toggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      if(!expanded){ navList.style.display = 'flex'; } else { navList.style.display = ''; }
    });
  }

  // Scroll reveal using IntersectionObserver with prefers-reduced-motion support
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = qsa('.reveal');
  if(prefersReduced){
    // immediately show
    reveals.forEach(function(el){ el.classList.add('visible'); });
  } else if('IntersectionObserver' in window){
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    },{threshold:0.12});
    reveals.forEach(function(el){ obs.observe(el); });
  } else {
    // fallback
    reveals.forEach(function(el){ el.classList.add('visible'); });
  }

  // Modal & Guided Exercise
  var modal = qs('#exercise-modal');
  var tryBtn = qs('#try-exercise');
  var closeBtn = qs('#modal-close');
  var cancelBtn = qs('#cancel-exercise');
  var startBtn = qs('#start-exercise');
  var exerciseArea = qs('#exercise-area');

  function openModal(){ modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; modal.focus && modal.focus(); }
  function closeModal(){ modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; stopExercise(); }

  if(tryBtn) tryBtn.addEventListener('click', openModal);
  if(closeBtn) closeBtn.addEventListener('click', closeModal);
  if(cancelBtn) cancelBtn.addEventListener('click', closeModal);

  // Guided exercises state
  var timer = null;
  var tickInterval = null;
  var timeLeft = 0;

  function stopExercise(){
    if(timer){ clearTimeout(timer); timer = null; }
    if(tickInterval){ clearInterval(tickInterval); tickInterval = null; }
    var area = exerciseArea;
    if(area){ area.innerHTML = ''; }
    startBtn.disabled = false;
  }

  function renderBreathing(){
    exerciseArea.innerHTML = '';
    var guide = document.createElement('div');
    guide.className = 'breathing-guide';
    var circle = document.createElement('div');
    circle.style.width = '80px';
    circle.style.height = '80px';
    circle.style.borderRadius = '50%';
    circle.style.margin = '1rem auto';
    circle.style.background = 'radial-gradient(circle at 30% 20%, rgba(138,90,59,0.2), rgba(201,166,107,0.08))';
    circle.style.transition = 'transform 3s ease-in-out';
    guide.appendChild(circle);
    var label = document.createElement('p');
    label.textContent = 'Follow a slow breathing pattern: inhale 4s — hold 2s — exhale 6s.';
    label.style.textAlign = 'center';
    exerciseArea.appendChild(guide);

    // animation loop for 2 minutes
    var inhale = true;
    timeLeft = 120; // seconds
    tickInterval = setInterval(function(){
      // pulse
      circle.style.transform = inhale ? 'scale(1.25)' : 'scale(0.9)';
      inhale = !inhale;
      timeLeft -= 4; if(timeLeft<=0) { stopExercise(); }
    }, 4000);
  }

  function renderJournaling(){
    exerciseArea.innerHTML = '';
    var prompt = "Write for five minutes on: 'A small step I could try this week to feel a little steadier.'";
    var p = document.createElement('p'); p.textContent = prompt; exerciseArea.appendChild(p);
    var ta = document.createElement('textarea'); ta.rows = 6; ta.style.width='100%'; ta.placeholder='Write here (this stays in your browser)';
    exerciseArea.appendChild(ta);
    // no timer by default; offer a gentle 5-minute reminder
    timeLeft = 300;
    tickInterval = setInterval(function(){ timeLeft -= 1; if(timeLeft<=0){ stopExercise(); } }, 1000);
  }

  function renderIntention(){
    exerciseArea.innerHTML = '';
    var p = document.createElement('p'); p.textContent = 'Take a minute to choose one small intention. Make it clear and specific.';
    exerciseArea.appendChild(p);
    var list = document.createElement('ul'); list.style.margin='0.6rem 0';
    ['One clear task','One check-in with a friend','One brief self-care action'].forEach(function(text){
      var li = document.createElement('li'); li.textContent = text; list.appendChild(li);
    });
    exerciseArea.appendChild(list);
    // countdown 60s
    var counter = document.createElement('div'); counter.style.fontWeight='700'; counter.style.marginTop='0.6rem';
    counter.textContent = 'Time left: 60s'; exerciseArea.appendChild(counter);
    timeLeft = 60;
    tickInterval = setInterval(function(){ timeLeft -= 1; if(timeLeft<=0){ stopExercise(); } else { counter.textContent = 'Time left: ' + timeLeft + 's'; } }, 1000);
  }

  startBtn.addEventListener('click', function(){
    startBtn.disabled = true;
    var chosen = qs('input[name="exercise"]:checked').value;
    stopExercise();
    if(chosen === 'breathing'){ renderBreathing(); }
    else if(chosen === 'journaling'){ renderJournaling(); }
    else if(chosen === 'intention'){ renderIntention(); }
  });

  // close on overlay click
  modal.addEventListener('click', function(e){ if(e.target === modal){ closeModal(); } });

  // accessibility: close on Escape
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false'){ closeModal(); } });

})();