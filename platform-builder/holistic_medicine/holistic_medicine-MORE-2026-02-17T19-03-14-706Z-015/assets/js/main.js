(function(){
  // Pricing comparator
  function animateNumber(el, start, end, duration){
    var startTime=null;
    var step=function(timestamp){
      if(!startTime) startTime=timestamp;
      var progress=Math.min((timestamp-startTime)/duration,1);
      var current=Math.round(start + (end-start)*progress);
      el.textContent=current;
      if(progress<1) requestAnimationFrame(step);
      else el.textContent=end;
    };
    requestAnimationFrame(step);
  }

  function setPricing(isPackage){
    document.querySelectorAll('.price-value').forEach(function(span){
      var month=Number(span.getAttribute('data-month'));
      var pack=Number(span.getAttribute('data-package'));
      var from=Number(span.textContent)||month;
      var to=isPackage?pack:month;
      animateNumber(span,from,to,500);
      var unit=span.closest('.price').querySelector('.price-unit');
      unit.textContent = isPackage ? '' : '/mo';
    });
  }

  var pricingSwitch=document.getElementById('pricing-switch');
  if(pricingSwitch){
    pricingSwitch.addEventListener('change',function(e){
      setPricing(e.target.checked);
    });
  }

  // Mood to Method selector
  var moods=document.querySelectorAll('.mood');
  var methodTitle=document.getElementById('method-title');
  var methodDesc=document.getElementById('method-desc');
  var methodCta=document.getElementById('method-cta');

  var methods={
    stabilize:{title:'Stabilize & reduce load',desc:'Short sequence emphasizing rhythm, sleep, and simple boundary changes. Quick wins to lower daily burden.',ctaLabel:'Book a stabilizing call',ctaUrl:'{{PRIMARY_CTA_URL}}'},
    recover:{title:'Wind-down & restore',desc:'A paced plan targeting nervous-system balance and restorative routines with guided skills and monitoring.',ctaLabel:'Start restoration',ctaUrl:'{{PRIMARY_CTA_URL}}'},
    optimize:{title:'Build daily resilience',desc:'A proactive sequence integrating lifestyle, targeted therapies, and coaching to strengthen long-term resilience.',ctaLabel:'Begin resilience plan',ctaUrl:'{{PRIMARY_CTA_URL}}'},
    explore:{title:'Curious exploration',desc:'Low-commit assessments and learning sessions to help you try options and decide next steps.',ctaLabel:'Schedule an orientation',ctaUrl:'{{PRIMARY_CTA_URL}}'}
  };

  function selectMood(btn){
    moods.forEach(function(b){b.setAttribute('aria-pressed','false')});
    btn.setAttribute('aria-pressed','true');
    var key=btn.getAttribute('data-method');
    var m=methods[key]||methods['explore'];

    // Morph animation
    methodTitle.classList.remove('visible');
    methodDesc.classList.remove('visible');
    methodCta.classList.remove('visible');
    setTimeout(function(){
      methodTitle.textContent=m.title;
      methodDesc.textContent=m.desc;
      methodCta.textContent=m.ctaLabel;
      methodCta.setAttribute('href',m.ctaUrl);
      methodTitle.classList.add('visible');
      methodDesc.classList.add('visible');
      methodCta.classList.add('visible');
    },180);
  }

  moods.forEach(function(b){
    b.addEventListener('click',function(){selectMood(b)});
  });

  // small interactions
  document.querySelectorAll('.q-toggle').forEach(function(btn){
    btn.addEventListener('click',function(){
      var body=btn.nextElementSibling;
      if(!body) return;
      if(body.style.display==='block') body.style.display='none'; else body.style.display='block';
    });
  });

  // reveal on load
  window.addEventListener('load',function(){
    document.querySelectorAll('.fade-in').forEach(function(el){el.classList.add('visible')});
    // ensure prices show initial monthly values
    setTimeout(function(){setPricing(false);},50);
  });

  // accessibility: simple nav toggle
  var navToggle=document.querySelector('.nav-toggle');
  var mainNav=document.querySelector('.main-nav');
  if(navToggle){
    navToggle.addEventListener('click',function(){
      if(mainNav.style.display==='flex') mainNav.style.display='none'; else mainNav.style.display='flex';
    });
  }
})();