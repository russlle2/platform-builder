(function(){
  // Simple interactivity: mobile nav and year
  var btn=document.querySelector('.mobile-toggle');
  var nav=document.querySelector('.nav ul');
  if(btn && nav){
    btn.addEventListener('click',function(){
      var open=nav.style.display==='flex';
      nav.style.display=open? 'none':'flex';
      nav.style.flexDirection='column';
    });
  }
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // Smooth scroll for anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault(); document.querySelector(a.getAttribute('href'))?.scrollIntoView({behavior:'smooth'});
    });
  });

  // Basic accessibility: focus outline for keyboard users
  function handleFirstTab(e){
    if(e.key==='Tab') document.body.classList.add('user-is-tabbing');
  }
  window.addEventListener('keydown',handleFirstTab);
})();