document.addEventListener('DOMContentLoaded',function(){
  // set current year
  var y = new Date().getFullYear();
  var el = document.getElementById('year'); if(el) el.textContent = y;

  // mobile nav toggle
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('main-nav');
  toggle && toggle.addEventListener('click',function(){
    if(nav.classList.contains('open')){nav.classList.remove('open');toggle.textContent='☰'}
    else{nav.classList.add('open');toggle.textContent='✕'}
  });

  // smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id = this.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if(target){ target.scrollIntoView({behavior:'smooth',block:'start'}); }
    });
  });

  // FAQ details polyfill-ish: close siblings when opening
  document.querySelectorAll('.faq-list details').forEach(function(d){
    d.addEventListener('toggle',function(){
      if(d.open){
        document.querySelectorAll('.faq-list details').forEach(function(other){ if(other!==d) other.open=false; });
      }
    });
  });

  // simple CTA analytics (no external network)
  document.querySelectorAll('a[href]').forEach(function(a){
    a.addEventListener('click',function(){
      try{console.log('link-click',this.getAttribute('href'))}catch(e){}
    });
  });
});
