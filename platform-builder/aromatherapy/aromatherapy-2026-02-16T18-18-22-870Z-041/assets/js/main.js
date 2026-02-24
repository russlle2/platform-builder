document.addEventListener('DOMContentLoaded',function(){
  // Mobile nav toggle
  var btn=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.nav ul');
  btn && btn.addEventListener('click',function(){
    var expanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', !expanded);
    if(nav.style.display==='flex'){nav.style.display='none'} else {nav.style.display='flex'}
  });

  // FAQ accordion
  var faqs = document.querySelectorAll('.faq-item');
  faqs.forEach(function(item){
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    q.addEventListener('click',function(){
      var open = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !open);
      if(!open){ a.style.maxHeight = a.scrollHeight + 'px' } else { a.style.maxHeight = null }
    });
  });

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id = this.getAttribute('href').substring(1);
      var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
});