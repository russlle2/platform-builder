// Minimal interactivity: smooth scroll and simple focus for CTA
document.addEventListener('DOMContentLoaded',function(){
  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id = this.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el){ el.scrollIntoView({behavior:'smooth',block:'start'}); }
    });
  });

  // Primary CTA focus animation
  var cta = document.querySelector('.btn-primary');
  if(cta){
    cta.addEventListener('mouseover',function(){ this.style.transform='translateY(-2px)'; });
    cta.addEventListener('mouseout',function(){ this.style.transform='none'; });
  }
});
