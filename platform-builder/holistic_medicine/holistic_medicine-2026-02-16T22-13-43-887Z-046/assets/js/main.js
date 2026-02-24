(function(){
  // Mobile nav toggle
  var navToggle = document.getElementById('navToggle');
  var navList = document.getElementById('navList');
  if(navToggle){
    navToggle.addEventListener('click',function(){
      if(navList.style.display==='block'){navList.style.display='';}
      else{navList.style.display='block';}
    });
  }

  // Smooth scroll for internal links
  document.addEventListener('click',function(e){
    var t = e.target;
    if(t.tagName==='A' && t.getAttribute('href') && t.getAttribute('href').charAt(0)==='#'){
      e.preventDefault();
      var id = t.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth'});
    }
  });

  // Insert current year
  var y = new Date().getFullYear();
  var yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = y;

  // Minimal accessibility improvement: close mobile nav on outside click
  document.addEventListener('click',function(e){
    if(!navList) return;
    var within = e.composedPath().includes(navList) || e.composedPath().includes(navToggle);
    if(!within && window.innerWidth<=720){navList.style.display='';}
  });
})();
