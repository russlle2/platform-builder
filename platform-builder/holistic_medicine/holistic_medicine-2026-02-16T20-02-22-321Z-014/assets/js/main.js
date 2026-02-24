document.addEventListener('DOMContentLoaded',function(){
  // Mobile nav
  var btn=document.getElementById('nav-toggle');
  var nav=document.getElementById('site-nav');
  btn && btn.addEventListener('click',function(){nav.classList.toggle('open');});

  // Testimonial slider
  var slides=document.querySelectorAll('.slider .slide');
  var idx=0;
  function show(i){slides.forEach(function(s){s.classList.remove('active');}); if(slides[i]) slides[i].classList.add('active');}
  if(slides.length){ show(0); setInterval(function(){ idx=(idx+1)%slides.length; show(idx); },5000); }

  // Smooth anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var t=document.querySelector(this.getAttribute('href'));if(t) t.scrollIntoView({behavior:'smooth'});});});

  // CTA click tracking (lightweight)
  document.querySelectorAll('a[href="'+(window.PRIMARY_CTA_URL||'{{PRIMARY_CTA_URL}}')+'"], a.btn.primary').forEach(function(a){a.addEventListener('click',function(){console.log('CTA clicked:',a.textContent.trim());});});
});
