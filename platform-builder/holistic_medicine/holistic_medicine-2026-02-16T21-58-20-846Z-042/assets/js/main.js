(function(){
  // Mobile nav toggle
  var toggle=document.querySelector('.nav-toggle');
  var navList=document.querySelector('.nav-list');
  if(toggle && navList){
    toggle.addEventListener('click',function(){
      navList.classList.toggle('show');
    });
  }

  // Year in footer
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // Smooth scroll for in-page anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var id=this.getAttribute('href').slice(1);
      var el=document.getElementById(id);
      if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth',block:'start'});}
    });
  });

  // CTA fallback: open mailto if primary CTA is placeholder mail
  var cta=document.querySelector('.nav-list .cta');
  if(cta){
    cta.addEventListener('click',function(e){
      var href=this.getAttribute('href');
      if(href && href.indexOf('http')!==0 && href.indexOf('#')!==0 && href.indexOf('mailto:')!==0){
        // nothing — expect a valid URL from fields
      }
    });
  }

  // Simple contact form handling if present on other pages
  document.addEventListener('submit',function(e){
    var form=e.target; if(!form.matches('.js-contact-form')) return;
    e.preventDefault();
    var name=form.querySelector('input[name=name]');
    var email=form.querySelector('input[name=email]');
    alert('Thanks '+(name?name.value:'')+" — we'll follow up at " + (email?email.value:'') + '.');
    form.reset();
  });
})();
