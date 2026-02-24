(function(){
  // Simple UI interactions: mobile nav, footer year, testimonial rotate
  document.addEventListener('DOMContentLoaded',function(){
    var toggle = document.querySelector('.mobile-toggle');
    var nav = document.querySelector('.main-nav');
    if(toggle){
      toggle.addEventListener('click',function(){
        if(nav.style.display==='block')nav.style.display='';else nav.style.display='block';
      });
    }

    var yearEl = document.getElementById('year');
    if(yearEl) yearEl.textContent = new Date().getFullYear();

    // rotating testimonials (basic)
    var testi = document.querySelectorAll('.testi');
    if(testi.length>1){
      var i=0; setInterval(function(){
        testi[i].style.opacity=0; testi[i].style.transform='translateY(-6px)';
        i=(i+1)%testi.length;
        testi[i].style.opacity=1; testi[i].style.transform='translateY(0)';
      },5000);
    }
  });
})();