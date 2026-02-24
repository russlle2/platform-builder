document.addEventListener('DOMContentLoaded',function(){
  // Year in footer
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
  // Nav toggle
  var nav=document.getElementById('mainNav'),btn=document.getElementById('navToggle');
  if(btn&&nav){btn.addEventListener('click',function(){nav.classList.toggle('show');});}
  // Simple testimonial slider (fade)
  var slider=document.getElementById('testiSlider');
  if(slider){
    var blocks=slider.querySelectorAll('.testi');
    var i=0; blocks.forEach(function(b,idx){if(idx!==0)b.style.display='none';});
    setInterval(function(){blocks[i].style.display='none'; i=(i+1)%blocks.length; blocks[i].style.display='block';},6000);
  }
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault(); var t=document.querySelector(this.getAttribute('href')); if(t) t.scrollIntoView({behavior:'smooth'}); });});
});