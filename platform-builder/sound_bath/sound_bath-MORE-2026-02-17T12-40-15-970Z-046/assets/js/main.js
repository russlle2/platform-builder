document.addEventListener('DOMContentLoaded',function(){
  // Pricing comparator
  var toggle = document.getElementById('price-toggle');
  var amounts = Array.from(document.querySelectorAll('.price-card .amount'));

  function animateNumber(el, start, end, duration){
    var startTime = null;
    duration = duration || 400;
    function step(timestamp){
      if(!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime)/duration,1);
      var value = Math.round(start + (end - start) * ease(progress));
      el.textContent = '$' + value;
      if(progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function ease(t){ return (--t)*t*t+1 }

  function updatePrices(usePackage){
    amounts.forEach(function(el){
      var m = parseFloat(el.getAttribute('data-month'))||0;
      var p = parseFloat(el.getAttribute('data-package'))||0;
      var from = parseFloat(el.textContent.replace('$',''))||0;
      var to = usePackage ? p : m;
      animateNumber(el, from, to, 420);
    });
  }

  // initialize from markup
  updatePrices(false);
  toggle.addEventListener('change',function(){
    updatePrices(toggle.checked);
  });

  // Mood-to-Method selector
  var moodButtons = Array.from(document.querySelectorAll('.mood-btn'));
  var moodMethod = document.getElementById('mood-method');
  var moodDesc = document.getElementById('mood-desc');
  var moodCta = document.getElementById('mood-cta');
  var moodMap = {
    wired: {
      title: 'Calibrated Anchor',
      desc: 'Brief breath-led grounding with deep, even tones to slow a racing system.',
      cta: 'Book a grounding pass',
      color: '#2b9eb3'
    },
    foggy: {
      title: 'Clarity Sequence',
      desc: 'Clear, spacious timbres with gentle movement to help sharpen attention and settle brain-fog.',
      cta: 'Reserve a clarity seat',
      color: '#6ad1d9'
    },
    heavy: {
      title: 'Lift & Unload',
      desc: 'Low-frequency supports and slow transitions to ease felt weight and encourage release.',
      cta: 'Schedule a private lift',
      color: '#2b9eb3'
    },
    restless: {
      title: 'Rhythmic Regulate',
      desc: 'A paced rhythm and melodic anchor to reorganize scattered attention into steady cycles.',
      cta: 'Try a rhythmic session',
      color: '#6ad1d9'
    }
  };

  function setActive(btn){
    moodButtons.forEach(function(b){b.classList.remove('active')});
    btn.classList.add('active');
  }

  moodButtons.forEach(function(btn){
    btn.addEventListener('click',function(){
      var mood = btn.getAttribute('data-mood');
      var map = moodMap[mood];
      if(!map) return;
      setActive(btn);
      // morph text
      moodMethod.style.opacity = 0; moodDesc.style.opacity = 0; moodCta.style.opacity = 0;
      setTimeout(function(){
        moodMethod.textContent = map.title;
        moodDesc.textContent = map.desc;
        moodCta.textContent = map.cta;
        moodCta.style.background = map.color;
      },180);
      setTimeout(function(){
        moodMethod.style.opacity = 1; moodDesc.style.opacity = 1; moodCta.style.opacity = 1;
      },300);

      // update link behavior: primary CTA leads to book page with mood param
      moodCta.onclick = function(){ location.href = 'book.html?mood='+encodeURIComponent(mood); };
    });
  });

  // Accessibility: keyboard toggle for mood
  moodButtons.forEach(function(b){ b.addEventListener('keydown', function(e){ if(e.key==='Enter') b.click(); }) });

  // Small utility: link primary ctas to placeholder if missing
  var allCtas = Array.from(document.querySelectorAll('.primary-cta'));
  allCtas.forEach(function(c){ if(!c.onclick && c.getAttribute('href')===null){ c.addEventListener('click', function(){ if('{{PRIMARY_CTA_URL}}' && '{{PRIMARY_CTA_URL}}'!=='') location.href='{{PRIMARY_CTA_URL}}'; }); } });
});