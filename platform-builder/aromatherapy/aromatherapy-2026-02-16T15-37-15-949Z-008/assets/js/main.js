document.addEventListener('DOMContentLoaded',function(){
  // year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
  // nav toggle
  var toggle=document.getElementById('nav-toggle'); var navList=document.getElementById('nav-list');
  if(toggle && navList){
    toggle.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded',!expanded);
      if(!expanded){ navList.style.display='flex'; navList.style.flexDirection='column'; } else { navList.style.display='none'; }
    });
  }
  // smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var t = document.querySelector(this.getAttribute('href'));
      if(t){ e.preventDefault(); t.scrollIntoView({behavior:'smooth',block:'start'}); }
    });
  });
  // accessible toggle for details (small enhancement)
  document.querySelectorAll('details').forEach(function(d){
    d.addEventListener('toggle',function(){
      if(this.open){ this.scrollIntoView({behavior:'smooth',block:'center'}); }
    });
  });
});