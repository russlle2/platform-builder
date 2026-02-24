// Main JS — minimal interactions for the gallery layout
document.addEventListener('DOMContentLoaded',function(){
  // Nav toggle
  var nav = document.getElementById('mainNav');
  var btn = document.getElementById('navToggle');
  if(btn){btn.addEventListener('click',function(){nav.classList.toggle('open');});}

  // Testimonials carousel
  var carousel = document.getElementById('testiCarousel');
  if(carousel){
    var items = Array.from(carousel.querySelectorAll('.testi'));
    var idx = 0; if(items.length) items[0].classList.add('active');
    function show(i){items.forEach(function(el,j){el.classList.toggle('active',j===i)});}
    document.getElementById('prevTesti').addEventListener('click',function(){idx = (idx-1+items.length)%items.length; show(idx);});
    document.getElementById('nextTesti').addEventListener('click',function(){idx = (idx+1)%items.length; show(idx);});
    // auto-advance
    setInterval(function(){idx=(idx+1)%items.length;show(idx);},7000);
  }

  // Smooth scroll for internal anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var target = document.querySelector(this.getAttribute('href'));
      if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});}    
    });
  });

  // Set year
  var y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();
});