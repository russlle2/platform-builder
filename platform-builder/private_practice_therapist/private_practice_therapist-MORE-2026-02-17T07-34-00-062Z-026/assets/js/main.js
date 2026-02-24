(function(){
  // Utilities
  function $(sel, ctx){return (ctx||document).querySelector(sel)}
  function $all(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Mobile nav toggle
  var mobileToggle = $('.mobile-toggle');
  var nav = $('.main-nav');
  mobileToggle && mobileToggle.addEventListener('click', function(){
    var expanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', !expanded);
    if(nav) nav.style.display = expanded ? 'none' : 'block';
  });

  // Hero rotator (small)
  var heroRotator = $('#hero-rotator');
  if(heroRotator){
    var heroTexts = [
      '"I left with a clearer sense of next steps — and practical language I could use right away."',
      '"A small number of focused sessions helped me decide with less anxiety."',
      '"We planned short experiments that felt achievable between meetings."'
    ];
    var hIndex = 0;
    setInterval(function(){
      hIndex = (hIndex+1) % heroTexts.length;
      var q = heroRotator.querySelector('.quote');
      if(q) q.textContent = heroTexts[hIndex];
    },4000);
  }

  // Testimonial carousel (full)
  var slidesWrap = $('#slides');
  var prev = $('.prev');
  var next = $('.next');
  if(slidesWrap){
    var slides = Array.from(slidesWrap.querySelectorAll('figure'));
    slides.forEach(function(s,i){s.style.transform = 'translateX(' + (i*100) + '%)'});
    var idx = 0;
    function show(i){
      slides.forEach(function(s,j){s.style.transform = 'translateX(' + ((j-i)*100) + '%)';});
    }
    prev && prev.addEventListener('click', function(){ idx = (idx-1+slides.length)%slides.length; show(idx); });
    next && next.addEventListener('click', function(){ idx = (idx+1)%slides.length; show(idx); });
    // Auto-rotate
    setInterval(function(){ idx = (idx+1)%slides.length; show(idx); },6000);
  }

  // Credibility badge tooltips
  var credItems = $all('.cred-item');
  var tooltip = $('#badge-tooltip');
  credItems.forEach(function(item){
    item.addEventListener('mouseenter', function(){
      var tip = item.getAttribute('data-tip') || '';
      tooltip.textContent = tip;
      tooltip.style.display = 'block';
    });
    item.addEventListener('mouseleave', function(){
      tooltip.style.display = 'none';
      tooltip.textContent = '';
    });
    // Keyboard accessibility
    item.addEventListener('focus', function(){
      var tip = item.getAttribute('data-tip') || '';
      tooltip.textContent = tip; tooltip.style.display='block';
    });
    item.addEventListener('blur', function(){ tooltip.style.display='none'; tooltip.textContent=''; });
  });

  // Small badges tooltip in hero
  $all('.small-badges .badge').forEach(function(b){
    var title = b.getAttribute('data-title');
    if(!title) return;
    b.addEventListener('mouseenter', function(){
      var t = document.createElement('div');
      t.className = 'hero-badge-tip';
      t.textContent = title;
      t.style.position='absolute';t.style.top='42px';t.style.left='0';t.style.background='#0b6677';t.style.color='#fff';t.style.padding='6px 8px';t.style.borderRadius='6px';t.style.fontSize='12px';
      b.appendChild(t);
    });
    b.addEventListener('mouseleave', function(){
      var tip = b.querySelector('.hero-badge-tip'); if(tip) tip.remove();
    });
  });

  // Accordion behavior
  $all('.acc-toggle').forEach(function(btn){
    btn.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !expanded);
      var panel = document.getElementById(this.getAttribute('aria-controls'));
      if(panel){
        if(expanded){ panel.hidden = true; } else { panel.hidden = false; }
      }
    });
  });

  // Respectful focus outlines for keyboard users
  function handleFirstTab(e){
    if(e.key === 'Tab'){
      document.documentElement.classList.add('user-is-tabbing');
      window.removeEventListener('keydown', handleFirstTab);
    }
  }
  window.addEventListener('keydown', handleFirstTab);

})();