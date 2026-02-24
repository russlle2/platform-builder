// Simple interactive behaviors: mobile nav, accordion, year update
document.addEventListener('DOMContentLoaded',function(){
  // Mobile nav toggle
  var toggle=document.querySelector('.mobile-toggle');
  var nav=document.querySelector('.primary-nav');
  if(toggle){
    toggle.addEventListener('click',function(){
      var expanded=this.getAttribute('aria-expanded')==='true';
      this.setAttribute('aria-expanded',!expanded);
      if(nav.style.display==='flex'){nav.style.display='none';}else{nav.style.display='flex';nav.style.flexDirection='column';nav.style.background='linear-gradient(180deg,rgba(3,7,18,0.95),rgba(3,7,18,0.9))';nav.style.padding='12px';}
    });
  }

  // Accordion
  var items=document.querySelectorAll('.acc-item');
  items.forEach(function(btn){
    btn.addEventListener('click',function(){
      var expanded=this.getAttribute('aria-expanded')==='true';
      // close all
      items.forEach(function(b){b.setAttribute('aria-expanded','false');var p=b.nextElementSibling;p.style.display='none';p.setAttribute('hidden','');b.querySelector('.toggle').textContent='+'});
      if(!expanded){
        this.setAttribute('aria-expanded','true');
        var panel=this.nextElementSibling;panel.style.display='block';panel.removeAttribute('hidden');this.querySelector('.toggle').textContent='–';
      }
    });
  });

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id=this.getAttribute('href').slice(1);var el=document.getElementById(id);if(el){el.scrollIntoView({behavior:'smooth',block:'start'});}    
    });
  });

  // Year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
});
