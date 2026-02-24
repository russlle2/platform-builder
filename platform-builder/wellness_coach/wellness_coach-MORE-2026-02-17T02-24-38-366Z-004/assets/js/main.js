(function(){
  // Mood-to-Method modules (two instances)
  function initMoodModule(rootId, copyId, ctaId){
    var root = document.getElementById(rootId);
    if(!root) return;
    var buttons = root.querySelectorAll('.mood-btn');
    var copyEl = document.getElementById(copyId);
    var ctaEl = document.getElementById(ctaId);

    var methods = {
      micro: {
        title: 'Micro-series: focus and repeat',
        text: 'A concentrated 2-week plan with daily prompts and an evening habit to lock progress.',
        cta: 'Try a 2-week micro-series',
        url: '{{PRIMARY_CTA_URL}}'
      },
      rhythm: {
        title: 'Monthly Rhythm: steady practice',
        text: 'Group sessions and short checkpoints that turn one practice into a weekly rhythm.',
        cta: 'Join the Monthly Rhythm',
        url: '{{PRIMARY_CTA_URL}}'
      },
      reset: {
        title: 'Reset Session: quick clarity',
        text: 'A focused 60-minute plan that prioritizes one actionable habit you can start tomorrow.',
        cta: 'Book a Reset Session',
        url: '{{PRIMARY_CTA_URL}}'
      },
      explore: {
        title: 'Short Labs: experiment and learn',
        text: 'Short guided labs to test different approaches before committing to a longer series.',
        cta: 'Explore Short Labs',
        url: '{{PRIMARY_CTA_URL}}'
      }
    };

    buttons.forEach(function(btn){
      btn.addEventListener('click', function(){
        buttons.forEach(function(b){b.classList.remove('active')});
        btn.classList.add('active');
        var key = btn.getAttribute('data-method');
        var entry = methods[key] || methods.micro;
        if(copyEl) copyEl.textContent = entry.title + ' — ' + entry.text;
        if(ctaEl){ ctaEl.textContent = entry.cta; ctaEl.href = entry.url; }
        // Also update top primary CTA to reflect state if present
        var topCta = document.getElementById('primaryCtaTop');
        var bottomCta = document.getElementById('primaryCtaBottom');
        if(topCta) topCta.textContent = entry.cta;
        if(bottomCta) bottomCta.textContent = entry.cta;
      });
    });
  }

  initMoodModule('moodHero','methodCopy','moodCta');
  initMoodModule('moodFramework','methodCopy2','moodCta2');

  // Pricing comparator toggle with animated numbers
  var priceToggle = document.getElementById('priceToggle');
  var pricingGrid = document.getElementById('pricingGrid');
  var monthly = true;

  function animateNumber(el, start, end, duration){
    var startTime = null;
    function step(ts){
      if(!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var current = Math.round(start + (end - start) * progress);
      el.textContent = '$' + current;
      if(progress < 1){
        requestAnimationFrame(step);
      } else {
        // micro bounce
        el.classList.remove('change');
        void el.offsetWidth;
      }
    }
    requestAnimationFrame(step);
    el.classList.add('change');
  }

  function updatePrices(toMonthly){
    var plans = pricingGrid.querySelectorAll('.plan');
    plans.forEach(function(plan){
      var monthlyVal = parseInt(plan.getAttribute('data-monthly'),10)||0;
      var packageVal = parseInt(plan.getAttribute('data-package'),10)||0;
      var amountEl = plan.querySelector('.price-amount');
      var labelEl = plan.querySelector('.price-label');
      var from = parseInt(amountEl.textContent.replace(/[^0-9]/g,''),10)||0;
      var to = toMonthly ? monthlyVal : packageVal;
      animateNumber(amountEl, from, to, 500);
      labelEl.textContent = toMonthly ? '/month' : '/package';
    });
  }

  if(priceToggle){
    priceToggle.addEventListener('click', function(){
      monthly = !monthly;
      priceToggle.textContent = monthly ? 'Monthly' : 'Package';
      updatePrices(monthly);
    });
  }

  // Setup initial values to reflect data attributes (graceful load)
  document.addEventListener('DOMContentLoaded', function(){
    // Set initial price values from data-monthly
    var plans = document.querySelectorAll('.plan');
    plans.forEach(function(plan){
      var monthlyVal = plan.getAttribute('data-monthly');
      var el = plan.querySelector('.price-amount');
      if(el && monthlyVal) el.textContent = '$' + monthlyVal;
    });
  });
})();