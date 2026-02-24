document.addEventListener('DOMContentLoaded',function(){
  // Year in footer
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // Ripple preview generator in hero
  var rippleBtn=document.getElementById('ripplePreview');
  var ripplesGroup=document.querySelector('#ripples');
  function makeRipple(x,y,size,delay){
    var svgns='http://www.w3.org/2000/svg';
    var c=document.createElementNS(svgns,'circle');
    c.setAttribute('cx',x);
    c.setAttribute('cy',y);
    c.setAttribute('r',size);
    c.setAttribute('stroke','#dff6ff');
    c.setAttribute('stroke-width',2);
    c.setAttribute('fill','none');
    c.style.opacity='0';
    ripplesGroup.appendChild(c);
    // animate
    setTimeout(function(){
      c.animate([
        {transform:'scale(0.1)',opacity:0.9},
        {transform:'scale(1.6)',opacity:0}
      ],{duration:1600,easing:'cubic-bezier(.2,.8,.2,1)'}).onfinish=function(){c.remove()}
    },delay||0);
  }
  if(rippleBtn) rippleBtn.addEventListener('click',function(){
    // create layered ripple pattern across the svg
    var vb=document.querySelector('svg').viewBox.baseVal;
    var w=vb.width||600,h=vb.height||400;
    for(var i=0;i<8;i++){
      var nx=240 + Math.sin(i*1.2)*120 + (Math.random()-0.5)*40;
      var ny=120 + Math.cos(i*0.9)*60 + (Math.random()-0.5)*30;
      makeRipple(nx,ny,10 + i*8, i*120);
    }
  });

  // Lead magnet form
  var leadForm=document.getElementById('leadForm');
  if(leadForm) leadForm.addEventListener('submit',function(e){
    e.preventDefault();
    var email=leadForm.querySelector('input[name=email]').value.trim();
    if(!email || !/.+@.+\..+/.test(email)){
      alert('Please enter a valid email.'); return;
    }
    // Simulate async submit
    leadForm.querySelector('button').disabled=true;
    leadForm.querySelector('button').textContent='Sending...';
    setTimeout(function(){
      leadForm.innerHTML='<p class="fineprint">Thanks — check your inbox for the guide. We look forward to seeing you at a session.</p>';
    },900);
  });

  // Simple external CTA handler to respect placeholder URLs
  var ctas=document.querySelectorAll('a.primary');
  ctas.forEach(function(a){
    a.addEventListener('click',function(e){
      // allow normal behavior; this handler can be extended for analytics
    })
  });

});
