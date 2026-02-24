(function(){
  // Mobile nav
  var toggle=document.querySelector('.nav-toggle');
  var list=document.querySelector('.nav-list');
  if(toggle && list){
    toggle.addEventListener('click',function(){
      var shown=list.style.display==='flex';
      list.style.display= shown ? 'none' : 'flex';
      list.style.flexDirection='column';
    });
  }

  // Populate year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // Smooth scroll for anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id=this.getAttribute('href').slice(1);
      var el=document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // Simple FAQ accordion: click question toggles next paragraph
  document.querySelectorAll('.faq-grid > div').forEach(function(item){
    item.style.cursor='pointer';
    item.addEventListener('click',function(){
      var p=this.querySelector('p');
      if(!p) return;
      var open=p.style.display!=='none';
      p.style.display=open ? 'none' : 'block';
    });
    // initialize collapsed on small screens
    var p=item.querySelector('p'); if(p && window.innerWidth<880) p.style.display='none';
  });
})();