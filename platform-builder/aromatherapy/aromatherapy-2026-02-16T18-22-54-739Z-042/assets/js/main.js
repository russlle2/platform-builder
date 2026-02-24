(function(){
  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav ul');
  if(toggle){
    toggle.addEventListener('click',function(){
      if(nav.style.display==='flex'){nav.style.display='none'}else{nav.style.display='flex';nav.style.flexDirection='column';nav.style.gap='0.5rem'}
    })
  }

  // Simple testimonial carousel
  var items = document.querySelectorAll('.testimonial');
  var idx = 0;
  function show(i){
    items.forEach(function(it,k){it.classList.toggle('active', k===i)})
  }
  if(items.length){
    show(0);
    document.getElementById('next').addEventListener('click',function(){idx=(idx+1)%items.length;show(idx)});
    document.getElementById('prev').addEventListener('click',function(){idx=(idx-1+items.length)%items.length;show(idx)});
    // auto rotate
    setInterval(function(){idx=(idx+1)%items.length;show(idx)},7000);
  }

  // Smooth scroll for internal links to CTA
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var t = document.querySelector(this.getAttribute('href'));
      if(t) t.scrollIntoView({behavior:'smooth',block:'center'});
    })
  });
})();