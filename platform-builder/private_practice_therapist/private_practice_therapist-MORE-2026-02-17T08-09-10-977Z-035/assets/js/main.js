(function(){
  // Year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Mobile nav toggle
  var navToggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.primary-nav');
  navToggle && navToggle.addEventListener('click',function(){
    if(nav.style.display==='flex'){nav.style.display='none';navToggle.textContent='☰';}
    else{nav.style.display='flex';nav.style.flexDirection='column';navToggle.textContent='✕';}
  });

  // Accordion behavior for session boundaries
  var accHeads = document.querySelectorAll('.acc-head');
  accHeads.forEach(function(btn){
    btn.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      // close all
      accHeads.forEach(function(b){b.setAttribute('aria-expanded','false');b.nextElementSibling.style.display='none';});
      if(!expanded){
        this.setAttribute('aria-expanded','true');
        this.nextElementSibling.style.display='block';
        this.nextElementSibling.focus && this.nextElementSibling.focus();
      }
    });
  });

  // Proof Gallery: rotating testimonials + badge tooltips
  var testiEls = Array.from(document.querySelectorAll('.testi'));
  var badges = Array.from(document.querySelectorAll('.badge'));
  var current = 0;
  var interval = 7000;
  var timer = null;

  function showTesti(i){
    testiEls.forEach(function(t){t.classList.remove('active');});
    var chosen = testiEls[i];
    if(chosen){
      chosen.classList.add('active');
      // highlight badges semi-randomly to pair credibility with quote
      badges.forEach(function(b,idx){b.style.opacity = (idx===i%badges.length)?'1':'0.6';});
    }
  }

  function startCycle(){
    timer = setInterval(function(){
      current = (current+1)%testiEls.length; showTesti(current);
    },interval);
  }

  function stopCycle(){ clearInterval(timer); timer = null; }

  document.getElementById('next').addEventListener('click',function(){ stopCycle(); current=(current+1)%testiEls.length; showTesti(current); startCycle(); });
  document.getElementById('prev').addEventListener('click',function(){ stopCycle(); current=(current-1+testiEls.length)%testiEls.length; showTesti(current); startCycle(); });

  // badge tooltips (simple, accessible)
  badges.forEach(function(b){
    b.addEventListener('mouseenter',function(){
      var tip = b.getAttribute('data-tip');
      var tnode = document.createElement('div');
      tnode.className='badge-tip';
      tnode.textContent = tip;
      tnode.style.position='absolute';
      tnode.style.background='#0f172a';
      tnode.style.color='#fff';
      tnode.style.padding='6px 8px';
      tnode.style.borderRadius='6px';
      tnode.style.fontSize='12px';
      tnode.style.transform='translateY(-110%)';
      b.appendChild(tnode);
      b._tipNode = tnode;
    });
    b.addEventListener('mouseleave',function(){ if(b._tipNode){b.removeChild(b._tipNode);b._tipNode=null;} });
  });

  // Initialize
  showTesti(0); startCycle();

  // Accessibility: pause rotation when user focuses into gallery
  var gallery = document.querySelector('.proof-gallery');
  gallery.addEventListener('focusin', stopCycle);
  gallery.addEventListener('focusout', startCycle);

})();