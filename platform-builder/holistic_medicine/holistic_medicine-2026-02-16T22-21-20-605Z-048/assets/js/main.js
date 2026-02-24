document.addEventListener('DOMContentLoaded',function(){
  var btn=document.getElementById('nav-toggle');
  var nav=document.getElementById('nav');
  if(btn&&nav){btn.addEventListener('click',function(){nav.classList.toggle('show');});}

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var target=document.querySelector(this.getAttribute('href'));
      if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});}    
    });
  });

  // Lead magnet form
  var form=document.getElementById('lead-form');
  if(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var email=document.getElementById('lead-email').value;
      if(!email) return;
      // Simulate async signup
      var btn=form.querySelector('button');
      var original=btn.innerText;
      btn.disabled=true;btn.innerText='Sending...';
      setTimeout(function(){
        form.innerHTML='<p class="small">Thanks! Check your inbox for "Small shifts for steady energy" — sent to '+(email||'your email')+'.</p>';
      },900);
    });
  }
});