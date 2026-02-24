document.addEventListener('DOMContentLoaded',function(){
  // Mobile nav toggle
  var navToggle=document.querySelector('.nav-toggle');
  if(navToggle){
    navToggle.addEventListener('click',function(){
      var expanded=this.getAttribute('aria-expanded')==='true';
      this.setAttribute('aria-expanded',!expanded);
      document.querySelectorAll('.main-nav a').forEach(function(a){a.style.display = expanded ? '' : 'inline-block';});
    });
  }

  // Testimonial rotation
  var testimonials = Array.from(document.querySelectorAll('.testimonial'));
  var current = 0;
  function showTestimonial(idx){
    testimonials.forEach(function(t,i){
      t.classList.toggle('active', i===idx);
    });
  }
  function nextTestimonial(){ current = (current+1) % testimonials.length; showTestimonial(current); }
  function prevTestimonial(){ current = (current-1 + testimonials.length) % testimonials.length; showTestimonial(current); }

  document.getElementById('next').addEventListener('click',function(){ nextTestimonial(); resetRotator(); });
  document.getElementById('prev').addEventListener('click',function(){ prevTestimonial(); resetRotator(); });

  var rotator = setInterval(nextTestimonial, 5000);
  function resetRotator(){ clearInterval(rotator); rotator = setInterval(nextTestimonial,5000); }

  // Pricing comparator with animated numbers
  var toggleButtons = document.querySelectorAll('.toggle-btn');
  var priceCards = document.querySelectorAll('.price-card');
  var activeView = 'monthly';

  function animateNumber(el, start, end, duration){
    var startTime=null;
    function step(timestamp){
      if(!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime)/duration,1);
      var value = Math.round(start + (end-start)*progress);
      el.textContent = '$' + value;
      if(progress < 1) requestAnimationFrame(step);
      else if(String(end).length>3) el.textContent = '$' + end; // final write
    }
    requestAnimationFrame(step);
  }

  function setPricing(view){
    priceCards.forEach(function(card){
      var monthly = parseFloat(card.getAttribute('data-monthly'))||0;
      var pkg = parseFloat(card.getAttribute('data-package'))||0;
      var amountEl = card.querySelector('.amount');
      var currentVal = parseInt(amountEl.textContent.replace(/[^0-9]/g,''))||0;
      var target = view === 'monthly' ? Math.round(monthly) : Math.round(pkg);
      // If package, show total; if monthly, show per session
      animateNumber(amountEl, currentVal, target, 600);
      var unitEl = card.querySelector('.unit');
      unitEl.textContent = view === 'monthly' ? '/session' : (view === 'package' ? ' total' : '');
    });
  }

  toggleButtons.forEach(function(btn){
    btn.addEventListener('click',function(){
      toggleButtons.forEach(function(b){b.classList.remove('active')});
      btn.classList.add('active');
      activeView = btn.getAttribute('data-view');
      setPricing(activeView);
    });
  });

  // Initialize pricing to monthly
  setPricing('monthly');

  // Accessibility: allow badges to show tooltip on focus
  document.querySelectorAll('.badge').forEach(function(b){
    b.setAttribute('tabindex','0');
    b.addEventListener('focus',function(){
      // Show pseudo tooltip by temporarily adding title attribute
      var tip = this.getAttribute('data-tooltip');
      this.setAttribute('title', tip);
    });
    b.addEventListener('blur',function(){ this.removeAttribute('title'); });
  });

  // Set year
  var y = new Date().getFullYear(); document.getElementById('year').textContent = y;
});