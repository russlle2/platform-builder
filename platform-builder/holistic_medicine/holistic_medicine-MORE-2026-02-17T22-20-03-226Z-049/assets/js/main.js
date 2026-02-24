(function(){
  // Proof Gallery: rotate testimonials and badges with tooltips
  var testiRoot = document.getElementById('testimonies');
  var quotes = testiRoot ? Array.from(testiRoot.querySelectorAll('.quote')) : [];
  var current = 0; var interval = 5000; var timer = null;
  function showQuote(i){
    quotes.forEach(function(q, idx){ q.classList.toggle('active', idx===i); });
  }
  function nextQuote(){ current = (current+1)%quotes.length; showQuote(current); }
  function prevQuote(){ current = (current-1+quotes.length)%quotes.length; showQuote(current); }
  if(quotes.length){ showQuote(0); timer = setInterval(nextQuote, interval); }
  var btnNext = document.getElementById('nextTest'); var btnPrev = document.getElementById('prevTest');
  if(btnNext){ btnNext.addEventListener('click', function(){ clearInterval(timer); nextQuote(); timer = setInterval(nextQuote, interval); }); }
  if(btnPrev){ btnPrev.addEventListener('click', function(){ clearInterval(timer); prevQuote(); timer = setInterval(nextQuote, interval); }); }

  // Badges: tooltip that follows focus/hover
  var badges = Array.from(document.querySelectorAll('.badge[data-tooltip]'));
  var tipEl = document.createElement('div'); tipEl.className='badge-tooltip'; document.body.appendChild(tipEl);
  function showTip(text, x, y){ tipEl.textContent = text; tipEl.style.left = (x+12)+'px'; tipEl.style.top = (y+12)+'px'; tipEl.style.opacity='1'; tipEl.style.transform='translateY(0)'; }
  function hideTip(){ tipEl.style.opacity='0'; tipEl.style.transform='translateY(6px)'; }
  badges.forEach(function(b){
    var text = b.getAttribute('data-tooltip');
    b.addEventListener('mouseenter', function(e){ showTip(text, e.pageX, e.pageY); });
    b.addEventListener('mousemove', function(e){ showTip(text, e.pageX, e.pageY); });
    b.addEventListener('mouseleave', hideTip);
    b.addEventListener('focus', function(e){ var r = b.getBoundingClientRect(); showTip(text, r.left + window.scrollX, r.top + window.scrollY); });
    b.addEventListener('blur', hideTip);
  });

  // Pricing Comparator: toggle monthly vs package with animated numbers
  function animateNumber(el, to){
    var start = Number(el.textContent.replace(/[^0-9]/g,'')) || 0; var end = Number(to);
    var duration = 600; var startTime = null;
    function step(ts){ if(!startTime) startTime = ts; var progress = Math.min((ts-startTime)/duration,1); var val = Math.round(start + (end-start)*progress); el.textContent = val; if(progress<1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  function updateComparator(root, mode){
    var cards = root.querySelectorAll('.price');
    cards.forEach(function(card){ var numEl = card.querySelector('.num'); var target = card.getAttribute('data-'+mode); animateNumber(numEl, target); });
  }
  var compToggles = Array.from(document.querySelectorAll('.pricing-comparator'));
  compToggles.forEach(function(root){
    var toggles = root.querySelectorAll('.toggle-btn');
    toggles.forEach(function(btn){ btn.addEventListener('click', function(){ toggles.forEach(function(b){ b.classList.toggle('active', b===btn); b.setAttribute('aria-selected', b===btn); }); var mode = btn.getAttribute('data-mode'); updateComparator(root, mode); }); });
  });

  // Initialize compact comparators by reading initial mode
  document.querySelectorAll('.pricing-comparator').forEach(function(root){ var active = root.querySelector('.toggle-btn.active') || root.querySelector('.toggle-btn'); if(active){ updateComparator(root, active.getAttribute('data-mode')); } });

  // Accessibility: allow keyboard switching of toggles via arrow keys
  document.addEventListener('keydown', function(e){
    if(document.activeElement && document.activeElement.classList.contains('toggle-btn')){
      var btn = document.activeElement; var parent = btn.parentElement; var items = Array.from(parent.querySelectorAll('.toggle-btn')); var idx = items.indexOf(btn);
      if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){ e.preventDefault(); var next = items[(idx+1)%items.length]; next.focus(); next.click(); }
      if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){ e.preventDefault(); var prev = items[(idx-1+items.length)%items.length]; prev.focus(); prev.click(); }
    }
  });
})();