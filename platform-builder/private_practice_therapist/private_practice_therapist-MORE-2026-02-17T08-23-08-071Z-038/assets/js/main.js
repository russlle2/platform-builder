(function(){
  // Nav toggle for small screens
  var navToggle = document.getElementById('navToggle');
  var navList = document.getElementById('navList');
  if(navToggle){
    navToggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !expanded);
      navList.classList.toggle('show');
    });
  }

  // Pricing comparator
  var priceNumber = document.getElementById('priceNumber');
  var modeButtons = document.querySelectorAll('.mode-btn');
  // Define prices (unique program naming)
  var prices = {
    monthly: 160,
    package: 1400 // package for 10 sessions
  };
  var animId = null;

  function animateNumber(el, start, end, duration){
    var startTime = null;
    if (animId) cancelAnimationFrame(animId);
    function tick(ts){
      if(!startTime) startTime = ts;
      var t = Math.min((ts - startTime)/duration, 1);
      var val = Math.round(start + (end - start) * (1 - Math.pow(1 - t, 2))); // ease-out
      el.textContent = '$' + val + (end === prices.package ? ' package' : '');
      if(t < 1){
        animId = requestAnimationFrame(tick);
      }
    }
    animId = requestAnimationFrame(tick);
  }

  modeButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      modeButtons.forEach(function(b){b.classList.remove('active')});
      this.classList.add('active');
      var mode = this.getAttribute('data-mode');
      var current = parseInt(priceNumber.textContent.replace(/[^0-9]/g,'')) || prices.monthly;
      animateNumber(priceNumber, current, prices[mode], 700);
    });
  });

  // Set initial label format
  priceNumber.textContent = '$' + prices.monthly;

  // Mood-to-Method selector
  var moodButtons = document.querySelectorAll('.mood-btn');
  var methodRec = document.getElementById('methodRec');
  var methodTitle = methodRec.querySelector('.method-title');
  var methodList = methodRec.querySelector('.method-features');
  var methodCta = document.getElementById('methodCta');

  var methods = {
    stabilize:{
      title:'Stabilizing plan',
      features:['Short, practical skills to reduce urgent distress','Weekly check-ins to adjust strategies','Clear steps to support daily functioning'],
      cta:'Book a stabilizing session',
      url:'{{PRIMARY_CTA_URL}}'
    },
    clarify:{
      title:'Clarity-focused work',
      features:['Explore values and priorities','Small experiments to test choices','Decision support and accountability'],
      cta:'Schedule a clarity consult',
      url:'{{PRIMARY_CTA_URL}}'
    },
    focus:{
      title:'Task-focused coaching',
      features:['Goal mapping and time-bound plans','Practical strategies to reduce friction','Weekly review to keep momentum'],
      cta:'Start a planning session',
      url:'{{PRIMARY_CTA_URL}}'
    },
    transition:{
      title:'Transition navigation',
      features:['Process the change compassionately','Identify practical next steps','Support integrating new roles and routines'],
      cta:'Explore transition support',
      url:'{{PRIMARY_CTA_URL}}'
    }
  };

  moodButtons.forEach(function(btn){
    btn.addEventListener('click', function(e){
      moodButtons.forEach(function(b){b.classList.remove('active')});
      this.classList.add('active');
      var key = this.getAttribute('data-method');
      var m = methods[key];
      // animate text change: simple fade
      methodRec.style.opacity = 0.25;
      setTimeout(function(){
        methodTitle.textContent = m.title;
        // rebuild list
        methodList.innerHTML = '';
        m.features.forEach(function(f){
          var li = document.createElement('li'); li.textContent = f; methodList.appendChild(li);
        });
        methodCta.textContent = m.cta;
        methodCta.setAttribute('href', m.url);
        methodRec.style.opacity = 1;
      },220);
    });
  });

  // Accessibility: allow keyboard activation for mood buttons
  document.querySelectorAll('.mood-btn, .mode-btn').forEach(function(el){
    el.addEventListener('keyup', function(e){ if(e.key === 'Enter' || e.key === ' ') el.click(); });
  });

})();
