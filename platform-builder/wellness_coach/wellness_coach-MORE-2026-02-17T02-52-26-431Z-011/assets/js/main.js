(function(){
  // Basic utilities
  function q(sel,ctx){return (ctx||document).querySelector(sel)}
  function qAll(sel,ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Mobile nav toggle
  var navToggle = q('.nav-toggle');
  var navList = q('#nav-list');
  if(navToggle && navList){
    navToggle.addEventListener('click',function(){
      var open = navList.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open? 'true':'false');
    });
  }

  // Year in footer
  var y = new Date().getFullYear();
  var yearEl = q('#year'); if(yearEl) yearEl.textContent = y;

  // Proof gallery data & rotation
  var testimonials = [
    {text:'"I learned how to build a short, repeatable practice that actually fits my weeks."',cite:'— Jordan, educator'},
    {text:'"Small experiments, steady wins. The accountability felt like a friendly checkpoint."',cite:'— Mira, consultant'},
    {text:'"We designed a flow that survived travel days and hectic work seasons."',cite:'— Sam, product lead'}
  ];
  var proofMain = q('#proof-main');
  var current = 0;
  var interval = 5000;
  var timer = null;

  function renderTestimonial(i){
    if(!proofMain) return;
    var elOld = proofMain.querySelector('.testimonial');
    if(elOld){ elOld.classList.remove('fade-in'); elOld.classList.add('fade-out'); }
    setTimeout(function(){
      proofMain.innerHTML = '<blockquote class="testimonial fade-in" data-index="'+i+'">'+testimonials[i].text+'<cite>'+testimonials[i].cite+'</cite></blockquote>';
    },220);
  }

  function nextTestimonial(){ current = (current+1) % testimonials.length; renderTestimonial(current); }
  function prevTestimonial(){ current = (current-1+testimonials.length) % testimonials.length; renderTestimonial(current); }

  // init
  renderTestimonial(0);
  timer = setInterval(nextTestimonial, interval);

  q('#proof-next') && q('#proof-next').addEventListener('click',function(){ clearInterval(timer); nextTestimonial(); timer=setInterval(nextTestimonial,interval); });
  q('#proof-prev') && q('#proof-prev').addEventListener('click',function(){ clearInterval(timer); prevTestimonial(); timer=setInterval(nextTestimonial,interval); });

  // Credibility badges: simple tooltip on hover/focus
  var badgeRow = q('#badge-row');
  var tooltip = null;
  function showTooltip(target){
    var txt = target.getAttribute('data-title');
    if(!txt) return;
    hideTooltip();
    tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = txt;
    document.body.appendChild(tooltip);
    var r = target.getBoundingClientRect();
    tooltip.style.left = Math.max(8, r.left + (r.width/2) - (tooltip.offsetWidth/2)) + 'px';
    tooltip.style.top = (r.top - tooltip.offsetHeight - 10) + 'px';
  }
  function hideTooltip(){ if(tooltip){ tooltip.remove(); tooltip=null; } }
  if(badgeRow){
    badgeRow.addEventListener('mouseover', function(e){ var t=e.target.closest('.cred-badge'); if(t) showTooltip(t); });
    badgeRow.addEventListener('mouseout', function(e){ hideTooltip(); });
    badgeRow.addEventListener('focusin', function(e){ var t=e.target.closest('.cred-badge'); if(t) showTooltip(t); });
    badgeRow.addEventListener('focusout', function(e){ hideTooltip(); });
  }

  // Pricing comparator micro (two places): radio-driven with animated number
  function animateNumber(el, from, to, ms){
    var start = null; function step(ts){ if(!start) start=ts; var t=(ts-start)/ms; if(t>1) t=1; var v = Math.round(from + (to-from)*t); el.textContent = '$'+v; if(t<1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }

  function setupComparators(){
    var comps = qAll('.pricing-comparator, .pricing-mini');
    comps.forEach(function(cmp){
      var radios = cmp.querySelectorAll('input[name="comp"]');
      var priceEl = cmp.querySelector('.comp-price') || cmp.querySelector('.price-amount');
      var toggleBtns = cmp.querySelectorAll('.toggle-btn');
      if(radios.length){
        radios.forEach(function(r){ r.addEventListener('change', function(){ var to = r.value==='monthly'? parseInt(priceEl.getAttribute('data-monthly'),10): parseInt(priceEl.getAttribute('data-package'),10); var from = parseInt(priceEl.textContent.replace(/[^0-9]/g,''),10) || to; animateNumber(priceEl, from, to, 600); }); });
      }
      if(toggleBtns.length){
        toggleBtns.forEach(function(b){ b.addEventListener('click', function(){ toggleBtns.forEach(x=>x.classList.remove('active')); b.classList.add('active'); var plan = b.getAttribute('data-plan'); var to = plan==='monthly'? parseInt(priceEl.getAttribute('data-monthly'),10): parseInt(priceEl.getAttribute('data-package'),10); var from = parseInt(priceEl.textContent.replace(/[^0-9]/g,''),10) || to; animateNumber(priceEl, from, to, 600); }); });
      }
    });
  }
  setupComparators();

  // Expose nothing globally
})();