(function(){
  // Simple DOM helpers
  function qs(sel, ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Menu toggle for mobile
  var menuToggle = qs('.menu-toggle');
  var nav = qs('.main-nav');
  if(menuToggle){
    menuToggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      nav.style.display = expanded ? '' : 'flex';
    });
  }

  // Proof gallery rotation
  var testimonials = qsa('.testimonial');
  var idx = 0; var rotateInterval = 6000; var rotTimer = null;
  function showTest(i){
    testimonials.forEach(function(t,n){t.classList.toggle('active', n===i)});
    idx = i;
  }
  function startRotate(){ rotTimer = setInterval(function(){ showTest((idx+1)%testimonials.length);}, rotateInterval); }
  function stopRotate(){ if(rotTimer){clearInterval(rotTimer);rotTimer=null}};
  if(testimonials.length){ showTest(0); startRotate(); }
  var prevBtn = qs('#prevTest'), nextBtn = qs('#nextTest');
  [prevBtn,nextBtn].forEach(function(btn){ if(btn) btn.addEventListener('click', function(){ stopRotate(); if(this.id==='prevTest'){ showTest((idx -1 + testimonials.length)%testimonials.length);} else { showTest((idx+1)%testimonials.length);} startRotate(); }); });

  // Badge tooltips (keyboard accessible)
  qsa('.badge').forEach(function(b){
    var tip=b.getAttribute('data-tooltip');
    if(!tip) return;
    var popup=null;
    function show(){ if(popup) return; popup=document.createElement('div'); popup.className='badge-tip'; popup.textContent=tip; popup.style.position='absolute'; popup.style.background='#fff'; popup.style.border='1px solid rgba(0,0,0,0.06)'; popup.style.padding='8px'; popup.style.borderRadius='8px'; popup.style.boxShadow='0 6px 18px rgba(0,0,0,0.06)'; popup.style.zIndex=60; document.body.appendChild(popup); var r=b.getBoundingClientRect(); popup.style.left=(r.right+8)+'px'; popup.style.top=(r.top)+'px'; }
    function hide(){ if(popup){popup.remove();popup=null;} }
    b.addEventListener('mouseenter', show); b.addEventListener('focus', show);
    b.addEventListener('mouseleave', hide); b.addEventListener('blur', hide);
  });

  // Pricing comparator toggle with animated numbers
  var toggle = qs('#priceToggle');
  var amounts = qsa('.amount');
  function animateValue(el, start, end, duration){
    var startTime = null; function step(ts){
      if(!startTime) startTime = ts; var progress = Math.min((ts-startTime)/duration,1); var cur = Math.round(start + (end-start)*progress); el.textContent = '$' + cur; if(progress<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function updatePrices(usePackage){
    amounts.forEach(function(a){
      var month = parseInt(a.getAttribute('data-month'),10) || 0;
      var pack = parseInt(a.getAttribute('data-package'),10) || 0;
      var from = parseInt(a.textContent.replace(/[^0-9]/g,''),10) || (usePackage?month:pack);
      var to = usePackage ? pack : month;
      animateValue(a, from, to, 420);
    });
  }
  if(toggle){ toggle.addEventListener('change', function(){ updatePrices(this.checked);}); }

  // Initialize amounts display (ensure numbers match data-month initially)
  amounts.forEach(function(a){ var m=a.getAttribute('data-month'); a.textContent = '$' + (m||'0'); });

  // Diagnostic mini form behavior
  var dxForm = qs('#mini-dx');
  if(dxForm){ dxForm.addEventListener('submit', function(e){ e.preventDefault(); var picks = Array.from(dxForm.querySelectorAll('input[name="dx"]:checked')).map(function(i){return i.value}); var msg = picks.length ? ('We suggest starting with: ' + picks.join(', ')) : 'Try selecting one area to get a short suggestion.'; alert(msg); }); }

  // Accessibility: stop rotation when focus enters testimonials
  var proofRegion = qs('#testimonialViewport');
  if(proofRegion){ proofRegion.addEventListener('focusin', function(){ stopRotate(); }); proofRegion.addEventListener('focusout', function(){ startRotate(); }); }

})();