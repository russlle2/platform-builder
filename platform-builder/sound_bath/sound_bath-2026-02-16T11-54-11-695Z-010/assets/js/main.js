document.addEventListener('DOMContentLoaded',function(){
  // mobile nav toggle
  var btn=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.nav');
  if(btn){btn.addEventListener('click',function(){
    if(nav.style.display==='flex'){nav.style.display='none'}else{nav.style.display='flex';nav.style.flexDirection='column';nav.style.gap='10px'}
  })}

  // FAQ accordion
  var qs=document.querySelectorAll('.faq .q');
  qs.forEach(function(q){q.addEventListener('click',function(){
    var a=this.nextElementSibling;
    var open= a.style.display==='block';
    document.querySelectorAll('.faq .a').forEach(function(x){x.style.display='none'});
    if(!open){a.style.display='block'}
  })});

  // smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var t=document.querySelector(this.getAttribute('href'));
      if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'})}
    })
  });

  // set current year
  var y=document.querySelector('.year'); if(y){y.textContent=new Date().getFullYear()}
});