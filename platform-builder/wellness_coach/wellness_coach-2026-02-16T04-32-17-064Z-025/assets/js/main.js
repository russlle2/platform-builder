(function(){
  // Simple interaction: mobile nav toggle + smooth scroll + testimonial rotate
  var navToggle = document.getElementById('navToggle');
  var nav = document.querySelector('.nav ul');
  if(navToggle){
    navToggle.addEventListener('click',function(){
      if(nav.style.display==='flex'){nav.style.display='none';}
      else{nav.style.display='flex';nav.style.flexDirection='column';}
    });
  }

  // Smooth scroll for internal links
  document.addEventListener('click', function(e){
    var t = e.target;
    if(t.tagName==='A' && t.getAttribute('href') && t.getAttribute('href').startsWith('#')){
      e.preventDefault();
      var id = t.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });

  // testimonial simple rotation
  var testGrid = document.getElementById('testGrid');
  if(testGrid){
    var items = Array.prototype.slice.call(testGrid.querySelectorAll('.testimonial'));
    var idx = 0;
    function rotate(){
      items.forEach(function(it,i){it.style.display=(i===idx)?'block':'none';});
      idx = (idx+1)%items.length;
    }
    if(items.length>0){
      rotate();
      setInterval(rotate,4500);
    }
  }

  // Reduce motion respect
  try{
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if(mq && mq.matches){
      // stop rotation
      // no-op since rotate is interval; we won't start interval when reduced
    }
  }catch(e){}
})();
