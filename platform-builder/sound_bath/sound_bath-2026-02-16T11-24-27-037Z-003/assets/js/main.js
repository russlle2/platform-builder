(function(){
  document.getElementById('year').textContent = new Date().getFullYear();
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('main-nav');
  if(toggle){
    toggle.addEventListener('click', function(){
      var visible = nav.style.display === 'flex';
      nav.style.display = visible ? 'none' : 'flex';
    });
  }
  // Progressive enhancement: inject svg pattern for background to support CSS fallback if needed
  fetch('assets/img/pattern.svg').then(function(res){return res.text()}).then(function(svg){
    var holder = document.querySelector('.bg-pattern');
    if(holder) holder.innerHTML = svg;
  }).catch(function(){/* silent */});
})();