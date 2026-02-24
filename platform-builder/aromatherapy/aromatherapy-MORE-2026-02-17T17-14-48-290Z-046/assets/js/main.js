(function(){
  // Mobile nav toggle
  var toggle=document.querySelector('.mobile-toggle');
  var nav=document.querySelector('.main-nav');
  if(toggle){toggle.addEventListener('click',function(){nav.style.display=(nav.style.display==='flex')?'none':'flex'});}

  // Mood-to-Method (instance A)
  var moodA=document.querySelectorAll('label.mood-pill[data-method]');
  var resA=document.getElementById('moodResultA');
  var ctaA=document.getElementById('moodCtaA');
  var mapA={
    grounding:{title:'Grounding Breath & Pocket Inhaler',copy:'A short inhalation routine with a grounding blend may support a settled nervous system. We recommend an inhaler to carry the practice with you.',cta:'Schedule a grounding consult',href:'/book.html?focus=grounding'},
    clarity:{title:'Warm Citrus Clarity',copy:'A bright inhalation sequence using a citrus-forward profile may support clear thinking for a short period. Try a 3-breath reset.',cta:'Try a clarity mini-session',href:'/blends.html?type=clarity'},
    rest:{title:'Soothing Roll-on Routine',copy:'A gentle roll-on blend combined with a 2-minute progressive breath may support reduced tension. Patch-test first on skin.',cta:'Book a soothing consult',href:'/book.html?focus=soothing'}
  };
  moodA.forEach(function(label){
    label.addEventListener('click',function(){
      var key=this.getAttribute('data-method');
      var info=mapA[key];
      if(info){
        resA.querySelector('.approach-title').textContent=info.title;
        resA.querySelector('.approach-copy').textContent=info.copy;
        ctaA.textContent=info.cta;
        ctaA.setAttribute('href',info.href);
      }
    });
  });

  // Mood-to-Method (instance B)
  var controlsB=document.getElementById('moodB');
  var resB=document.getElementById('moodResultB');
  var ctaB=document.getElementById('moodCtaB');
  var mapB={
    focus:{title:'Focus Blend + Desk Diffuser',copy:'A bright citrus and fresh herbal blend used in short bursts may support attention. Use a timer—15 minutes on, 30 minutes off.',cta:'See focus blends to try',href:'/blends.html?type=focus'},
    soften:{title:'Softening Lavender Sequence',copy:'A low-dilution lavender and sweet herb pairing can be used for brief pauses that may support easing of stress. Always dilute and patch-test.',cta:'Explore softening options',href:'/blends.html?type=soften'},
    ease:{title:'Warm Balm for Low Energy',copy:'A warm, resinous blend with a short inhalation practice may support gentle uplift. Consider a warm compress during practice.',cta:'Find uplifting blends',href:'/blends.html?type=ease'}
  };
  if(controlsB){
    controlsB.querySelectorAll('label.mood-pill').forEach(function(label){
      label.addEventListener('click',function(){
        var key=this.getAttribute('data-method');
        var info=mapB[key];
        if(info){
          resB.querySelector('.approach-title').textContent=info.title;
          resB.querySelector('.approach-copy').textContent=info.copy;
          ctaB.textContent=info.cta;
          ctaB.setAttribute('href',info.href);
        }
      });
    });
  }

  // Pricing comparator with animated numbers
  var periodButtons=document.querySelectorAll('.pricing-toggle .period');
  var nums=document.querySelectorAll('.num');
  var current='monthly';

  function animateNumber(el,from,to,duration){
    var start=performance.now();
    from=Number(from);to=Number(to);
    function tick(now){
      var t=Math.min(1,(now-start)/duration);
      var val=Math.round(from+(to-from)*t);
      el.textContent='$'+val;
      if(t<1)requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  periodButtons.forEach(function(btn){
    btn.addEventListener('click',function(){
      if(btn.classList.contains('active'))return;
      periodButtons.forEach(function(b){b.classList.remove('active')});
      btn.classList.add('active');
      current=btn.getAttribute('data-period');
      nums.forEach(function(n){
        var fromText=n.textContent.replace(/[^0-9]/g,'')||0;
        var from=Number(fromText);
        var to=Number(n.getAttribute('data-'+current));
        animateNumber(n,from,to,500);
      });
    });
  });

  // Initialize displayed numbers with monthly values
  nums.forEach(function(n){n.textContent='$'+n.getAttribute('data-monthly');});

  // Accessibility: keyboard toggles for mood pills
  document.querySelectorAll('label.mood-pill').forEach(function(lbl){
    lbl.setAttribute('tabindex','0');
    lbl.addEventListener('keydown',function(e){ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); lbl.click(); } });
  });

})();