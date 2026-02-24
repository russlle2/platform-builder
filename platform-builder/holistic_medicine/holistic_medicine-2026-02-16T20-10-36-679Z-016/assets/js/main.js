(function(){
  // Mobile nav toggle
  var btn=document.querySelector('.nav-toggle');
  var nav=document.getElementById('navlist');
  if(btn){
    btn.addEventListener('click',function(){
      var expanded=this.getAttribute('aria-expanded')==='true';
      this.setAttribute('aria-expanded',!expanded);
      if(nav.style.display==='block'){nav.style.display=''} else {nav.style.display='block'}
    });
  }

  // FAQ accordion
  document.querySelectorAll('.qa .q').forEach(function(q){
    q.addEventListener('click',function(){
      var next=this.nextElementSibling;
      var open=next.style.display==='block';
      // close others
      document.querySelectorAll('.qa .a').forEach(function(a){a.style.display='none'});
      if(!open) next.style.display='block';
    });
  });

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var id=this.getAttribute('href').slice(1);
      var el=document.getElementById(id);
      if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth',block:'start'})}
    });
  });

})();
