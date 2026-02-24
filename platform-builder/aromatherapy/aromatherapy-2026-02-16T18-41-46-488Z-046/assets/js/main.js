document.addEventListener('DOMContentLoaded',function(){
  // Mobile nav toggle
  var navToggle=document.getElementById('navToggle');
  var navList=document.getElementById('navList');
  navToggle.addEventListener('click',function(){
    var expanded=this.getAttribute('aria-expanded')==='true';
    this.setAttribute('aria-expanded',String(!expanded));
    if(navList.style.display==='flex'){
      navList.style.display='none';
    } else { navList.style.display='flex'; navList.style.flexDirection='column'; }
  });

  // Fill current year in footer
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // Simple smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault(); var id=this.getAttribute('href').slice(1); var el=document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth'});
    });
  });

  // Progressive reveal on scroll (lightweight)
  var revealItems=document.querySelectorAll('.card,.pillar,.note,details');
  function onScroll(){
    var top=window.innerHeight*0.9;
    revealItems.forEach(function(i){
      var r=i.getBoundingClientRect();
      if(r.top<top){ i.style.opacity=1; i.style.transform='translateY(0)'; }
    });
  }
  revealItems.forEach(function(i){ i.style.opacity=0; i.style.transform='translateY(10px)'; i.style.transition='opacity 520ms ease,transform 520ms ease'; });
  window.addEventListener('scroll',onScroll); onScroll();
});