(function(){
  // Pricing comparator
  var toggle = document.getElementById('priceToggle');
  var amounts = document.querySelectorAll('.amount');
  var currentMode = 'month'; // 'month' or 'package'

  function animateValue(el, start, end, duration){
    var startTime = null;
    function step(timestamp){
      if(!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var value = Math.round(start + (end - start) * progress);
      el.textContent = '$' + value;
      if(progress < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function setPrices(mode){
    amounts.forEach(function(el){
      var from = parseInt(el.textContent.replace(/[^0-9]/g,''),10) || 0;
      var to = parseInt(el.getAttribute(mode === 'month' ? 'data-month' : 'data-package'),10) || 0;
      // adjust small label if needed
      var small = el.parentElement.querySelector('small');
      if(mode === 'month') small.textContent = '/mo';
      else small.textContent = mode === 'package' && el.parentElement.querySelector('h4').textContent === 'Focus' ? '/session' : '/engagement';
      animateValue(el, from, to, 600);
    });
  }

  if(toggle){
    toggle.addEventListener('click', function(){
      currentMode = currentMode === 'month' ? 'package' : 'month';
      toggle.setAttribute('aria-pressed', currentMode === 'package');
      setPrices(currentMode);
    });
  }

  // Mood-to-Method (one in diagnostic section)
  var moodButtons = document.querySelectorAll('#moodSelector .mood');
  var methodPanel = document.getElementById('methodPanel');
  var methodCta = document.getElementById('methodCta');
  var primaryCta = document.getElementById('primaryCta');

  var MAPPINGS = {
    stressed: {
      title: 'Short re-tune — breath + low tone',
      copy: 'A focused 12-minute breath and low-tone sequence to release shoulder tension and quiet the mind. Best as a quick reset before an intense meeting.',
      cta: 'Book a brief reset',
      href: 'private-sessions.html'
    },
    fuzzy: {
      title: 'Clarity set — grounding resonance',
      copy: 'A 20-minute guided session using rhythmic belling and sustained textures to sharpen attention and settle scattered thoughts.',
      cta: 'Reserve a clarity session',
      href: 'events.html'
    },
    wired: {
      title: 'Slow the nervous system',
      copy: 'Vocalized tones and paced pauses to dampen adrenaline and create a stable heartbeat rhythm—30 minutes recommended.',
      cta: 'Schedule a calming session',
      href: 'private-sessions.html'
    },
    tired: {
      title: 'Gentle descent',
      copy: 'Low-volume bowls and long exhalation patterns to ease into rest. Useful as a pre-sleep routine or midday recalibration.',
      cta: 'Try a restful session',
      href: 'book.html'
    }
  };

  function applyMood(key){
    var map = MAPPINGS[key];
    if(!map) return;
    methodPanel.querySelector('.method-title').textContent = map.title;
    methodPanel.querySelector('.method-copy').textContent = map.copy;
    methodCta.textContent = map.cta;
    methodCta.setAttribute('href', map.href);
    // subtle visual morph
    methodPanel.animate([{transform:'translateY(6px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:280,easing:'cubic-bezier(.2,.9,.3,1)'});
    // update main CTA phrasing as well
    if(primaryCta){
      primaryCta.textContent = map.cta;
      primaryCta.setAttribute('href', map.href);
    }
  }

  moodButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      moodButtons.forEach(function(b){b.classList.remove('active')});
      btn.classList.add('active');
      var key = btn.getAttribute('data-key');
      applyMood(key);
      // store preference
      try{ localStorage.setItem('sb_mood', key);}catch(e){}
    });
  });

  // Micro-habits second selector
  var habitSelect = document.getElementById('habitMood');
  var habitCard = document.getElementById('habitCard');
  var habitCta = document.getElementById('habitCta');
  var HABITS = {
    stressed: {
      practice: 'Two breaths in 10 seconds: inhale 4s, hold 1s, exhale 5s. Repeat twice. Finish with a single low hum for 5s.',
      cta: 'Book a 30-min reset',
      href: 'private-sessions.html'
    },
    fuzzy: {
      practice: 'Focus on one tone for 60s. Follow it with a 30s silent inward scan. Note three things you can act on right now.',
      cta: 'Join a clarity session',
      href: 'events.html'
    },
    wired: {
      practice: 'Slow exhale sequence: exhale for 6s, inhale for 3s. Repeat 8 times. End with palms over ears for 10s.',
      cta: 'Schedule calming work',
      href: 'private-sessions.html'
    },
    tired: {
      practice: 'Soft, continuous hum for 45s while lying down. Let the hum follow full exhalations.',
      cta: 'Reserve a restful slot',
      href: 'book.html'
    }
  };

  function updateHabit(){
    var key = habitSelect.value;
    var info = HABITS[key];
    habitCard.querySelector('.habit-copy').textContent = info.practice;
    habitCta.textContent = info.cta;
    habitCta.setAttribute('href', info.href);
    habitCard.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:280});
    try{ localStorage.setItem('sb_habit', key);}catch(e){}
  }

  if(habitSelect){
    habitSelect.addEventListener('change', updateHabit);
  }

  // Initialize with stored preferences
  try{
    var savedMood = localStorage.getItem('sb_mood');
    if(savedMood){
      var btn = document.querySelector('#moodSelector .mood[data-key="'+savedMood+'"]');
      if(btn){ btn.classList.add('active'); applyMood(savedMood); }
    }
    var savedHabit = localStorage.getItem('sb_habit');
    if(savedHabit && habitSelect){ habitSelect.value = savedHabit; updateHabit(); }
  }catch(e){}

  // Set initial prices to month values
  setPrices('month');

  // Simple mobile toggle
  var mobileToggle = document.querySelector('.mobile-toggle');
  mobileToggle && mobileToggle.addEventListener('click', function(){
    var nav = document.querySelector('.nav');
    var expanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', !expanded);
    if(nav) nav.style.display = expanded ? 'none' : 'flex';
  });

})();