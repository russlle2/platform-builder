(function(){
  // Mobile nav toggle
  var navToggle=document.getElementById('navToggle');
  var mainNav=document.getElementById('mainNav');
  navToggle&&navToggle.addEventListener('click',function(){
    var list=mainNav.querySelector('.nav-list');
    var expanded=this.getAttribute('aria-expanded')==='true';
    this.setAttribute('aria-expanded',!expanded);
    if(list.style.display==='block'){list.style.display='';}else{list.style.display='block'}
  });

  // Lead magnet form
  var leadForm=document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email=leadForm.querySelector('input[type="email"]').value.trim();
      if(!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
        alert('Please enter a valid email to receive the guide.');
        return;
      }
      // Simulated success — replace with real endpoint integration
      leadForm.querySelector('button').disabled=true;
      leadForm.querySelector('button').textContent='Sending...';
      setTimeout(function(){
        alert('Thanks! The guide is on its way to ' + email + '.');
        leadForm.reset();
        leadForm.querySelector('button').disabled=false;
        leadForm.querySelector('button').textContent='Send the guide';
      },900);
    });
  }

  // Ripple effect on hero card
  var rippleCard=document.getElementById('rippleCard');
  function makeRipple(e){
    var rect=rippleCard.getBoundingClientRect();
    var cx=e.clientX-rect.left; var cy=e.clientY-rect.top;
    var r=Math.max(rect.width,rect.height)*1.2;
    var span=document.createElement('span');
    span.className='ripple';
    span.style.width=span.style.height=(r)+'px';
    span.style.left=cx+'px';
    span.style.top=cy+'px';
    span.style.background='radial-gradient(circle at center, rgba(163,107,76,0.18), rgba(163,107,76,0.02))';
    span.style.transition='opacity 700ms, transform 700ms';
    span.style.transform='scale(0.3)';
    rippleCard.appendChild(span);
    requestAnimationFrame(function(){span.style.transform='scale(1)';span.style.opacity='0'});
    setTimeout(function(){span.remove();},750);
  }
  if(rippleCard){
    rippleCard.addEventListener('pointerdown',makeRipple);
    rippleCard.addEventListener('keydown',function(e){ if(e.key==='Enter' || e.key===' ') makeRipple(e); });
  }
})();