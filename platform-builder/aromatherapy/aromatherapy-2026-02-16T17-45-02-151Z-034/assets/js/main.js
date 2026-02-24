(function(){
  // small helpers
  function on(selector, ev, cb){document.addEventListener(ev,function(e){if(e.target.closest(selector))cb(e)})}

  // Nav toggle
  var navToggle=document.getElementById('navToggle');
  var mainNav=document.getElementById('mainNav');
  if(navToggle){navToggle.addEventListener('click',function(){
    var open=navToggle.getAttribute('aria-expanded')==='true';
    navToggle.setAttribute('aria-expanded',!open);
    if(open){mainNav.hidden=true}else{mainNav.hidden=false}
  })}

  // Year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // FAQ toggles
  on('.faq-q','click',function(e){
    var btn=e.target.closest('.faq-q');
    var a=btn.nextElementSibling; if(!a) return;
    var open=a.style.display==='block';
    a.style.display=open? 'none':'block';
    btn.setAttribute('aria-expanded',!open);
  });

  // Lead magnet form (fake submit)
  var magnet=document.getElementById('magnetForm');
  if(magnet){magnet.addEventListener('submit',function(e){e.preventDefault();var email=magnet.email.value; if(!email) return alert('Please add your email.');
    // simple faux send
    magnet.querySelector('button').disabled=true; magnet.querySelector('button').textContent='Sending...';
    setTimeout(function(){
      alert('Thanks! The Aromatherapy Essentials guide is on its way to '+email);
      magnet.reset(); magnet.querySelector('button').disabled=false; magnet.querySelector('button').textContent='Send the Guide'
    },900);
  })}

  // Ripple effect for .ripple buttons
  on('.ripple','click',function(e){
    var el=e.target.closest('.ripple');
    var rect=el.getBoundingClientRect();
    var wave=document.createElement('span');
    wave.className='ripple-wave';
    var size=Math.max(rect.width,rect.height)*1.5; wave.style.width=wave.style.height=size+'px';
    wave.style.left=(e.clientX-rect.left-size/2)+'px'; wave.style.top=(e.clientY-rect.top-size/2)+'px';
    el.appendChild(wave); setTimeout(function(){el.removeChild(wave)},600);
  });

  // Simple progressive enhancement: prefetch booking page on hover
  on('a[href="book.html"]','mouseenter',function(e){var l=e.target.closest('a'); if(l && !l.dataset.prefetched){fetch('book.html').catch(()=>{}); l.dataset.prefetched='1'}})

})();