(function(){
  // Mobile nav toggle
  var toggle=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.main-nav');
  toggle&&toggle.addEventListener('click',function(){
    if(nav.style.display==='flex'){nav.style.display='none'}else{nav.style.display='flex';nav.style.flexDirection='column'}
  });

  // FAQ accordion
  var qs=document.querySelectorAll('.faq-item .q');
  qs.forEach(function(btn){
    btn.addEventListener('click',function(){
      var a=this.nextElementSibling;
      var open= a.style.display==='block';
      // close all
      document.querySelectorAll('.faq-item .a').forEach(function(el){el.style.display='none'});
      if(!open){a.style.display='block'}
    });
  });

  // Format next event date if present
  function formatISODate(iso){
    try{
      var d=new Date(iso);
      if(isNaN(d)) return iso;
      return d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'numeric'});
    }catch(e){return iso}
  }
  var next=document.getElementById('next-event');
  if(next){
    var raw=next.getAttribute('data-next-event');
    if(raw && raw.indexOf('{')===-1){ next.textContent=formatISODate(raw); }
  }

  // Smooth scroll for internal anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var tgt=document.querySelector(this.getAttribute('href'));
      if(tgt){e.preventDefault();tgt.scrollIntoView({behavior:'smooth',block:'start'});} 
    });
  });
})();