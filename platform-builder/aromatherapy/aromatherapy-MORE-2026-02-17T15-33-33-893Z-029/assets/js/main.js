(function(){
  // Year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Pricing toggle
  var billingToggle = document.getElementById('billingToggle');
  var billingLabel = document.getElementById('billingLabel');
  var prices = document.querySelectorAll('.animate-price');
  var isMonthly = true;

  function animateValue(el, start, end, duration){
    var startTime = null;
    function step(ts){
      if(!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var value = Math.round(start + (end - start) * progress);
      el.textContent = value;
      if(progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function updatePrices(monthly){
    prices.forEach(function(el){
      var m = parseFloat(el.getAttribute('data-month')) || 0;
      var p = parseFloat(el.getAttribute('data-package')) || 0;
      var from = parseFloat(el.textContent) || (monthly? p : m);
      var to = monthly? m : p;
      animateValue(el, from, to, 420);
      var freq = el.parentElement.querySelector('.freq');
      if(freq){
        freq.textContent = monthly ? '/mo' : (el.getAttribute('data-package') ? '/one-time' : '/package');
      }
    });
  }

  function setBilling(monthly){
    isMonthly = monthly;
    billingToggle.setAttribute('aria-checked', String(monthly));
    billingLabel.textContent = monthly ? 'Monthly' : 'Up-front package';
    updatePrices(monthly);
  }

  billingToggle.addEventListener('click', function(){ setBilling(!isMonthly); });
  billingToggle.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBilling(!isMonthly); } });

  // Initialize prices
  setBilling(true);

  // Proof Gallery rotation
  var quotes = Array.prototype.slice.call(document.querySelectorAll('#testimonials .quote'));
  var idx = 0;
  function showQuote(i){
    quotes.forEach(function(q){ q.classList.remove('active'); });
    var q = quotes[i];
    if(q){ q.classList.add('active'); }
  }
  showQuote(0);
  var autoRotate = setInterval(function(){ idx = (idx + 1) % quotes.length; showQuote(idx); }, 6000);

  document.getElementById('prevTestimonial').addEventListener('click', function(){ clearInterval(autoRotate); idx = (idx - 1 + quotes.length) % quotes.length; showQuote(idx); });
  document.getElementById('nextTestimonial').addEventListener('click', function(){ clearInterval(autoRotate); idx = (idx + 1) % quotes.length; showQuote(idx); });

  // Simple tooltip activation for badges (for keyboard users)
  var badges = document.querySelectorAll('.badge');
  badges.forEach(function(b){
    b.setAttribute('tabindex', '0');
    b.addEventListener('focus', function(){ b.classList.add('focus'); });
    b.addEventListener('blur', function(){ b.classList.remove('focus'); });
  });

  // Small: reveal on scroll (progressive enhancement)
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){ if(entry.isIntersecting){ entry.target.classList.add('in-view'); } });
  }, {threshold:0.08});
  document.querySelectorAll('.step, .card, .plan, .quote').forEach(function(el){ io.observe(el); });

})();