document.addEventListener('DOMContentLoaded',function(){
  // Mobile nav toggle
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('mainNav');
  if(toggle && nav){
    toggle.addEventListener('click',function(){
      if(nav.style.display==='flex'){nav.style.display='none';}else{nav.style.display='flex';nav.style.flexDirection='column'}
    });
  }

  // FAQ accordion
  var faqs = document.querySelectorAll('.faq-item .q');
  faqs.forEach(function(btn){
    btn.addEventListener('click',function(){
      var ans = this.nextElementSibling;
      if(!ans) return;
      var open = ans.style.display==='block';
      document.querySelectorAll('.faq-item .a').forEach(function(n){n.style.display='none'});
      ans.style.display = open? 'none' : 'block';
    });
  });

  // Simple accessibility: close nav on outside click
  document.addEventListener('click', function(e){
    var navEl = document.getElementById('mainNav');
    var toggleEl = document.getElementById('navToggle');
    if(!navEl || !toggleEl) return;
    if(window.innerWidth<=880 && navEl.style.display==='flex'){
      if(!navEl.contains(e.target) && e.target!==toggleEl){navEl.style.display='none'}
    }
  });
});