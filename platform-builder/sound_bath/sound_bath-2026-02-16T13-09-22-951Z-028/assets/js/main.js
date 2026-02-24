(function(){
  // Mobile nav toggle
  var btn = document.getElementById('navToggle');
  var nav = document.getElementById('mainNav');
  btn && btn.addEventListener('click',function(){
    if(nav.style.display==='flex'){nav.style.display='none';btn.innerText='☰';}
    else{nav.style.display='flex';nav.style.flexDirection='column';nav.style.gap='1rem';btn.innerText='✕';}
  });

  // Footer year
  var y = new Date().getFullYear();
  var el = document.getElementById('year');
  if(el) el.textContent = y;

  // Simple focus trap for modals (placeholder for booking)
  window.addEventListener('keydown', function(e){
    if(e.key==='Escape'){ // close mobile nav if open
      if(nav && nav.style.display==='flex' && window.innerWidth<=900){nav.style.display='none';btn.innerText='☰';}
    }
  });
})();