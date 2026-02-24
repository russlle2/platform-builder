(function(){
  // small interactions: nav toggle, insert year, simple event detail modal
  document.addEventListener('DOMContentLoaded',function(){
    var btn=document.querySelector('.nav-toggle');
    var nav=document.querySelector('.nav');
    if(btn){btn.addEventListener('click',function(){nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';});}

    var y=document.getElementById('year'); if(y){y.textContent=(new Date()).getFullYear();}

    // Event panel click to open events page
    var nextPanel=document.querySelector('.hero-panel .btn');
    if(nextPanel){nextPanel.addEventListener('click',function(e){
      // simple ripple effect
      var el=e.currentTarget; var r=document.createElement('span'); r.className='ripple'; r.style.position='absolute'; r.style.borderRadius='50%'; r.style.background='rgba(255,255,255,0.3)'; r.style.width='120px'; r.style.height='120px'; r.style.left='10px'; r.style.top='10px'; el.style.position='relative'; el.appendChild(r);
      setTimeout(function(){try{el.removeChild(r);}catch(e){}},600);
    });}

    // Accessibility: smooth scroll for internal links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){e.preventDefault();var id=this.getAttribute('href').slice(1);var el=document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth'});});
    });
  });
})();