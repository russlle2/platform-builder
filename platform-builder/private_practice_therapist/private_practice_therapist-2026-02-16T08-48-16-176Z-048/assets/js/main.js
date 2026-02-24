// Basic interactivity for clinic_modern template
document.addEventListener('DOMContentLoaded',function(){
  var navToggle=document.getElementById('navToggle');
  var navList=document.getElementById('navList');
  if(navToggle){
    navToggle.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      if(navList.style.display === 'flex' || navList.style.display === 'block'){
        navList.style.display='none';
      } else {
        navList.style.display='block';
        navList.style.flexDirection='column';
      }
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor){
    anchor.addEventListener('click',function(e){
      e.preventDefault();
      var target=document.querySelector(this.getAttribute('href'));
      if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // Small accessibility enhancement: focus visible after click
  document.querySelectorAll('a, button').forEach(function(el){
    el.addEventListener('mouseup',function(){this.blur();});
  });
});