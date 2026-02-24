document.addEventListener('DOMContentLoaded',function(){
  // year
  var y = new Date().getFullYear();
  var ye = document.getElementById('year'); if(ye) ye.textContent = y;

  // mobile nav toggle
  var navToggle = document.getElementById('navToggle');
  navToggle && navToggle.addEventListener('click',function(){
    var nav = document.querySelector('.nav');
    if(!nav) return;
    if(nav.style.display==='flex'){nav.style.display='none';} else {nav.style.display='flex'; nav.style.flexDirection='column';}
  });

  // lead magnet form
  var lead = document.getElementById('leadForm');
  if(lead){
    lead.addEventListener('submit',function(e){
      e.preventDefault();
      var email = lead.querySelector('input[name="email"]').value;
      if(!email || email.indexOf('@')===-1){alert('Please enter a valid email');return}
      // faux submit - in real life hook to API
      lead.querySelector('button').disabled = true;
      lead.querySelector('button').textContent = 'Sending…';
      setTimeout(function(){
        lead.innerHTML = '<p class="sent">Thanks — check your inbox for the Starter Guide.</p>';
      },900);
    });
  }

  // simple testimonial rotator
  var blocks = document.querySelectorAll('.testimonials blockquote');
  if(blocks.length>1){
    var i=0; setInterval(function(){
      blocks.forEach(function(b,j){b.style.opacity = (j===i? '1':'0.18');b.style.transform=(j===i?'scale(1)':'scale(0.98)');});
      i=(i+1)%blocks.length;
    },4000);
  }

  // ripple subtle move
  var ripple = document.getElementById('ripple');
  document.addEventListener('mousemove',function(ev){
    if(!ripple) return;
    var x = (ev.clientX / window.innerWidth) * 100;
    var y = (ev.clientY / window.innerHeight) * 100;
    ripple.style.left = x + '%'; ripple.style.top = y + '%';
  });

});