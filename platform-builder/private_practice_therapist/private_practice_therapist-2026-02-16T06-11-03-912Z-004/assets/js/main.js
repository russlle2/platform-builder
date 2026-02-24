document.addEventListener('DOMContentLoaded',function(){
  var navToggle=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.nav');
  if(navToggle){navToggle.addEventListener('click',function(){
    if(nav.style.display==='flex'){nav.style.display='none'}else{nav.style.display='flex';nav.style.flexDirection='column'}
  })}

  var leadForm=document.getElementById('leadForm');
  if(leadForm){leadForm.addEventListener('submit',function(e){
    e.preventDefault();
    var email=leadForm.querySelector('input[name="email"]').value;
    if(!email || !email.includes('@')){alert('Please enter a valid email.');return}
    // mimic async send
    leadForm.querySelector('button').disabled=true;
    leadForm.querySelector('button').textContent='Sending...';
    setTimeout(function(){
      leadForm.innerHTML='<p class="small">Thanks — the guide is on its way to '+email+'. Check your inbox (and promotions/junk).</p>';
    },900);
  })}

  // Smooth scroll for same-page anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id=this.getAttribute('href').slice(1);
      var el=document.getElementById(id);
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    })
  })
});