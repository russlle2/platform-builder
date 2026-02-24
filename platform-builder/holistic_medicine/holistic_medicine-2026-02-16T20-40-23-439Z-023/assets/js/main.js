document.addEventListener('DOMContentLoaded',function(){
  // nav toggle for small screens
  var toggle=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.primary-nav');
  if(toggle && nav){
    toggle.addEventListener('click',function(){
      nav.classList.toggle('open');
    });
  }

  // smooth internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var targetId=this.getAttribute('href').slice(1);
      var el=document.getElementById(targetId);
      if(el){
        e.preventDefault();
        el.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  });

  // lead magnet form handling
  var form=document.getElementById('leadForm');
  if(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var email=form.querySelector('input[type="email"]').value.trim();
      var name=form.querySelector('input[name="name"]').value.trim();
      if(!email || !email.includes('@')){
        alert('Please provide a valid email.');
        return;
      }
      // Simulated success — in a real site this would post to an API
      localStorage.setItem('lead_'+email,JSON.stringify({name:name||null,email:email,time:Date.now()}));
      form.innerHTML='<p style="margin:0 0 0.5rem;font-weight:600">Thanks — your guide is on its way to '+email+'</p>'+
                     '<p style="margin:0;color:#6b5846">Check your inbox. If you don\'t see it, check spam or contact us at {{EMAIL}}</p>';
    });
  }

  // lightweight accessibility enhancement: focus outlines
  document.addEventListener('keydown',function(e){
    if(e.key==='Tab') document.body.classList.add('show-focus');
  });
});