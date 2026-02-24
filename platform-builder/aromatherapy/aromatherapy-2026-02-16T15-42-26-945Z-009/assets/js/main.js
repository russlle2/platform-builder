document.addEventListener('DOMContentLoaded',function(){
  // Mobile nav toggle
  var nav = document.getElementById('nav');
  var btn = document.getElementById('navToggle');
  if(btn && nav){
    btn.addEventListener('click',function(){
      var expanded = nav.style.display === 'flex';
      nav.style.display = expanded ? '' : 'flex';
      nav.style.flexDirection = 'column';
    });
  }

  // Smooth scroll for in-page links
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor){
    anchor.addEventListener('click',function(e){
      e.preventDefault();
      var target = document.querySelector(this.getAttribute('href'));
      if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // FAQ accordion
  document.querySelectorAll('.faq .q').forEach(function(q){
    q.addEventListener('click',function(){
      var a = this.nextElementSibling;
      var open = a.style.display === 'block';
      // close others
      document.querySelectorAll('.faq .a').forEach(function(x){x.style.display='none'});
      a.style.display = open ? 'none' : 'block';
    });
  });

  // Make CTA open in new tab safely if it's external
  var ctas = document.querySelectorAll('a[href]');
  ctas.forEach(function(link){
    try{
      var href = link.getAttribute('href');
      if(href && href.indexOf('http')===0 && new URL(href).origin !== location.origin){
        link.setAttribute('target','_blank');
        link.setAttribute('rel','noopener noreferrer');
      }
    }catch(e){}
  });
});
