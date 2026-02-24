document.addEventListener('DOMContentLoaded',function(){
  // Year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"], a[href$=".html"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var href=a.getAttribute('href');
      if(href && href.startsWith('#')){
        e.preventDefault();
        var el=document.querySelector(href);
        if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
      }
    });
  });

  // Accordion FAQ
  document.querySelectorAll('.accordion .item .q').forEach(function(btn){
    btn.addEventListener('click',function(){
      var item=this.parentElement;
      var open=item.classList.contains('open');
      document.querySelectorAll('.accordion .item').forEach(function(i){i.classList.remove('open')});
      if(!open) item.classList.add('open');
    });
  });

  // Ripple effect
  function makeRipple(e){
    var btn=e.currentTarget;
    var rect=btn.getBoundingClientRect();
    var ink=document.createElement('span');
    ink.className='ink';
    var size=Math.max(rect.width,rect.height)*1.2;
    ink.style.width=size+'px';
    ink.style.height=size+'px';
    ink.style.left=(e.clientX-rect.left-size/2)+'px';
    ink.style.top=(e.clientY-rect.top-size/2)+'px';
    btn.appendChild(ink);
    setTimeout(function(){ink.remove()},700);
  }
  document.querySelectorAll('.ripple, .btn.primary').forEach(function(b){
    b.addEventListener('click',function(ev){makeRipple(ev)});
  });

  // Primary CTA identifier for analytics placeholder
  var primary=document.getElementById('primary-cta');
  if(primary){
    primary.addEventListener('click',function(){
      try{console.log('Primary CTA clicked:', primary.getAttribute('href'))}catch(e){}
    });
  }
});
