// Minimal interactivity: nav toggle, accordion, year
document.addEventListener('DOMContentLoaded',function(){
  var toggle=document.getElementById('nav-toggle');
  var nav=document.getElementById('main-nav');
  if(toggle){toggle.addEventListener('click',function(){
    var links=nav.querySelectorAll('a');
    for(var i=0;i<links.length;i++){links[i].style.display=(links[i].style.display==='inline-block')? 'none':'inline-block'}
  });}

  var acc=document.getElementById('faq-acc');
  if(acc){var items=acc.querySelectorAll('.item');
    items.forEach(function(it){
      var btn=it.querySelector('.q');
      var answer=it.querySelector('.a');
      btn.addEventListener('click',function(){
        var open=answer.style.display==='block';
        // close all
        items.forEach(function(x){x.querySelector('.a').style.display='none'});
        answer.style.display=open? 'none':'block';
      });
    });
  }

  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // Simple anchor smooth scroll for browsers that don't support CSS
  var anchors=document.querySelectorAll('a[href^="#"]');
  anchors.forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var t=document.querySelector(this.getAttribute('href')); if(t) t.scrollIntoView({behavior:'smooth'});});});
});