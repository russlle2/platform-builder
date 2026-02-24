(function(){
  // Utilities
  function el(sel){return document.querySelector(sel)}
  function els(sel){return Array.from(document.querySelectorAll(sel))}

  // Year in footer
  var y = new Date().getFullYear();
  var yd = el('#year'); if(yd) yd.textContent = y;

  // Aroma wheel data
  var wheelData = {
    top: {
      title: 'Top notes',
      desc: 'Bright, volatile scents that are noticed first and may offer an immediate lift.',
      notes: ['Bergamot','Grapefruit','Lavender (light)','Lemon']
    },
    middle: {
      title: 'Middle notes',
      desc: 'The heart of a blend; these may round a formula and support emotional layering.',
      notes: ['Geranium','Rosemary','Chamomile','Clary sage']
    },
    base: {
      title: 'Base notes',
      desc: 'Longer-lasting anchors that may support depth and lingering calm.',
      notes: ['Cedarwood','Vetiver','Frankincense','Myrrh']
    }
  };

  var wheelSlices = els('.slice');
  var titleEl = el('#wheel-title');
  var descEl = el('#wheel-desc');
  var listEl = el('#wheel-list');

  function showCategory(cat){
    var data = wheelData[cat];
    if(!data) return;
    titleEl.textContent = data.title;
    descEl.textContent = data.desc;
    listEl.innerHTML = '';
    data.notes.forEach(function(n){
      var li = document.createElement('li'); li.textContent = n; listEl.appendChild(li);
    });
    // highlight slice
    wheelSlices.forEach(function(s){
      s.classList.toggle('active', s.dataset.category===cat);
    });
  }

  wheelSlices.forEach(function(s){
    s.addEventListener('mouseenter', function(){ showCategory(s.dataset.category); });
    s.addEventListener('focus', function(){ showCategory(s.dataset.category); });
    s.addEventListener('click', function(){ showCategory(s.dataset.category); });
  });

  // Testimonials rotation
  var testimonials = [
    {quote:'"A quiet, careful experience that helped me notice small shifts in focus."',author:'— A client, '+ (document.body.textContent.indexOf('{{CITY}}')>-1? '{{CITY}}':'Local')},
    {quote:'"Detailed and kind guidance. I felt safe to explore aromas I had never used."',author:'— Participant, workshop'},
    {quote:'"A thoughtful blend plan that made evenings feel intentionally calmer."',author:'— Workshop attendee'}
  ];
  var ti = 0;
  var quoteEl = el('#quote');
  var authorEl = el('#author');
  function showTestimonial(i){
    var t = testimonials[i%testimonials.length];
    if(quoteEl) quoteEl.textContent = t.quote;
    if(authorEl) authorEl.textContent = t.author;
  }
  showTestimonial(0);
  setInterval(function(){ ti++; showTestimonial(ti); },5000);

  // Badge tooltips (for keyboard accessibility)
  var badges = els('.badge');
  badges.forEach(function(b){
    b.addEventListener('focus', function(){ b.setAttribute('aria-expanded','true'); });
    b.addEventListener('blur', function(){ b.removeAttribute('aria-expanded'); });
  });

  // Simple warm-up: if JS disabled, set some fallback content
  if(!window.addEventListener){
    var winfo = el('#wheel-info'); if(winfo) winfo.textContent = 'Interactive wheel requires JavaScript.';
  }

  // CTA safety link behavior (demo handler)
  var ctas = els('a[href="{{PRIMARY_CTA_URL}}"]');
  ctas.forEach(function(c){ c.addEventListener('click', function(e){ /* allow normal navigation; placeholder for analytics */ }); });
})();