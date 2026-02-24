(function(){
  'use strict';

  // Mobile nav
  var toggle = document.querySelector('.mobile-toggle');
  var nav = document.querySelector('.main-nav');
  if(toggle){
    toggle.addEventListener('click', function(){
      if(nav.style.display === 'flex'){nav.style.display='none';}
      else{nav.style.display='flex';nav.style.flexDirection='column';}
    });
  }

  // Pricing comparator: toggle radio buttons and animate numbers
  function animateNumber(el, start, end, duration){
    var startTime = null;
    var prefix = el.textContent.replace(/[^\d\.]/g,'');
    function step(ts){
      if(!startTime) startTime = ts;
      var progress = Math.min((ts - startTime)/duration, 1);
      var value = Math.round(start + (end - start) * easeOutCubic(progress));
      el.textContent = '$' + value + (el.closest('.pcard').querySelector('.meta').textContent.includes('Recurring') ? '/mo' : '');
      if(progress < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }
  function easeOutCubic(t){return 1 - Math.pow(1 - t, 3);}

  var pricing = document.getElementById('pricing-widget');
  if(pricing){
    var radios = pricing.querySelectorAll('input[name="billing"]');
    var amounts = pricing.querySelectorAll('.amount');
    function updatePrices(mode){
      amounts.forEach(function(el){
        var from = parseInt(el.textContent.replace(/[^0-9]/g,'')) || 0;
        var to = mode === 'monthly' ? parseInt(el.getAttribute('data-monthly')) : parseInt(el.getAttribute('data-package')) || 0;
        // If package is 0, we display a one-time tag
        if(mode === 'package' && to === 0){
          el.textContent = 'Contact for custom plan';
        } else {
          animateNumber(el, from, to, 650);
        }
      });
    }
    radios.forEach(function(r){
      r.addEventListener('change', function(e){
        updatePrices(e.target.value);
      });
    });
  }

  // Proof gallery: rotation with badges and tooltips
  var gallery = document.getElementById('proof-gallery');
  if(gallery){
    var testimonies = Array.prototype.slice.call(gallery.querySelectorAll('.testimony'));
    var blocks = testimonies.map(function(t){return t.querySelector('blockquote')});
    var dotsWrap = gallery.querySelector('.dots');
    var current = 0;
    function renderDots(){
      dotsWrap.innerHTML = '';
      for(var i=0;i<blocks.length;i++){
        var d = document.createElement('div'); d.className='dot' + (i===current? ' active':''); dotsWrap.appendChild(d);
      }
    }
    function show(index){
      current = (index + blocks.length) % blocks.length;
      blocks.forEach(function(b,i){
        b.parentElement.style.display = i===current ? 'flex' : 'none';
      });
      renderDots();
    }
    show(0);

    // auto-rotate
    var rotate = setInterval(function(){ show(current+1); }, 6000);

    // controls
    var prev = gallery.querySelector('#prev');
    var next = gallery.querySelector('#next');
    prev.addEventListener('click', function(){ clearInterval(rotate); show(current-1); });
    next.addEventListener('click', function(){ clearInterval(rotate); show(current+1); });

    // Badge tooltips (simple)
    var badges = gallery.querySelectorAll('.badge');
    badges.forEach(function(b){
      b.addEventListener('mouseenter', function(){
        var tip = b.getAttribute('data-tip');
        var tnode = document.createElement('div');
        tnode.className = 'badge-tip';
        tnode.textContent = tip;
        tnode.style.position='absolute'; tnode.style.background='#222'; tnode.style.color='#fff'; tnode.style.padding='8px'; tnode.style.borderRadius='8px'; tnode.style.fontSize='13px';
        tnode.style.transform='translateY(-8px)';
        tnode.style.whiteSpace='nowrap';
        b._tipNode = tnode;
        b.appendChild(tnode);
      });
      b.addEventListener('mouseleave', function(){
        if(b._tipNode){ b.removeChild(b._tipNode); b._tipNode=null; }
      });
    });
  }

  // small accessibility: focus outlines for keyboard
  document.addEventListener('keydown', function(e){ if(e.key === 'Tab'){ document.body.classList.add('show-focus'); }});

})();