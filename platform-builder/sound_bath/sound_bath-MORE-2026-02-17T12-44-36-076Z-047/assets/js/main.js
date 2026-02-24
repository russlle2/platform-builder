(function(){
  // Set year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Mixer logic
  var mixButtons = document.querySelectorAll('.mix-btn');
  var recsEl = document.getElementById('recs');

  var programs = {
    gentle: ['Drift-Light: tonal lull and guided breath','Soft Arc: single-bowl resonance and micro-guidance'],
    medium: ['Resonant Weave: layered bowls and vocal tones','Evening Loom: pacing for release and wakeful rest'],
    intense: ['Deep Field: sustained harmonic immersion','Foundry: dense overtones for somatic work']
  };

  function setActiveLevel(level){
    mixButtons.forEach(function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-level')===level);
    });
    // Update recs
    recsEl.innerHTML = '';
    programs[level].forEach(function(p){
      var li = document.createElement('li'); li.textContent = p; recsEl.appendChild(li);
    });
  }

  mixButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      setActiveLevel(this.getAttribute('data-level'));
    });
  });

  // default
  setActiveLevel('gentle');

  // Testimonials rotation
  var quotes = Array.prototype.slice.call(document.querySelectorAll('.quote'));
  var current = 0;
  function showQuote(i){
    quotes.forEach(function(q){ q.classList.remove('active'); });
    quotes[i].classList.add('active');
  }
  showQuote(0);
  setInterval(function(){
    current = (current + 1) % quotes.length;
    showQuote(current);
  },5000);

  // Badges tooltips (simple keyboard access)
  var badges = document.querySelectorAll('.badge');
  badges.forEach(function(b){
    b.setAttribute('tabindex','0');
    b.addEventListener('focus',function(){
      var tip = b.getAttribute('data-tip');
      var el = document.createElement('div');
      el.className = 'badge-tip';
      el.textContent = tip;
      el.style.position = 'absolute';
      el.style.left = '110%';
      el.style.top = '50%';
      el.style.transform = 'translateY(-50%)';
      el.style.padding = '8px 10px';
      el.style.background = '#0f172a';
      el.style.color = '#fff';
      el.style.borderRadius = '8px';
      el.style.fontSize = '13px';
      el.dataset.tmp = '1';
      b.appendChild(el);
    });
    b.addEventListener('blur',function(){
      var tmp = b.querySelector('[data-tmp]');
      if(tmp) b.removeChild(tmp);
    });
  });

  // Accessibility: allow arrow keys to change mixer
  document.getElementById('mixer').addEventListener('keydown', function(e){
    var key = e.key;
    if(key==='ArrowLeft' || key==='ArrowRight'){
      var activeIndex = Array.prototype.findIndex.call(mixButtons, function(b){ return b.classList.contains('active'); });
      if(activeIndex === -1) activeIndex = 0;
      if(key==='ArrowLeft') activeIndex = Math.max(0, activeIndex-1);
      if(key==='ArrowRight') activeIndex = Math.min(mixButtons.length-1, activeIndex+1);
      var level = mixButtons[activeIndex].getAttribute('data-level');
      setActiveLevel(level);
    }
  });

  // Small utility: if coming from book CTA, focus mixer
  if(location.hash === '#tune'){
    mixButtons[0].focus();
  }
})();
