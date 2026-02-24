// Small interactive behaviors: nav toggle + ripple
document.addEventListener('DOMContentLoaded',function(){
  // Nav toggle
  var toggle=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.nav');
  toggle && toggle.addEventListener('click',function(){
    nav.classList.toggle('open');
  });

  // Add ripple effect to buttons with class 'ripple'
  function createInk(e){
    var target=e.currentTarget;
    var rect=target.getBoundingClientRect();
    var ink=document.createElement('span');
    ink.className='ink';
    var size=Math.max(rect.width,rect.height)*1.2;
    ink.style.width=ink.style.height=size+'px';
    ink.style.left=(e.clientX-rect.left-size/2)+'px';
    ink.style.top=(e.clientY-rect.top-size/2)+'px';
    target.appendChild(ink);
    setTimeout(function(){ ink.remove(); },800);
  }
  document.querySelectorAll('.ripple').forEach(function(btn){
    btn.addEventListener('click',createInk);
  });

  // Decorative ripple on hero visual: small random orbs pulse
  var svg=document.querySelector('.ripple-canvas');
  if(svg){
    var ns='http://www.w3.org/2000/svg';
    for(var i=0;i<6;i++){
      var c=document.createElementNS(ns,'circle');
      c.setAttribute('cx',Math.random()*560+20);
      c.setAttribute('cy',Math.random()*340+20);
      c.setAttribute('r',Math.random()*20+6);
      c.setAttribute('fill','rgba(255,255,255,0.06)');
      c.style.transition='transform 8s ease-in-out';
      svg.appendChild(c);
      (function(elem,dy){
        setInterval(function(){
          elem.setAttribute('transform','translate(0,'+((Math.sin(Date.now()/3000+dy)*8)) +')');
        },90);
      })(c,Math.random()*3);
    }
  }
});
