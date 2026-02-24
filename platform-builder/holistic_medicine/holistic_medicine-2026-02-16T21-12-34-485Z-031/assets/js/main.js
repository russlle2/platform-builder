(function(){
  // Mobile nav toggle
  var toggle=document.getElementById('navToggle');
  var nav=document.getElementById('mainNav');
  if(toggle && nav){
    toggle.addEventListener('click',function(){
      nav.classList.toggle('open');
    });
  }

  // Smooth scroll for same-page anchors
  document.addEventListener('click',function(e){
    var t=e.target.closest('a');
    if(!t) return;
    var href=t.getAttribute('href');
    if(href && href.indexOf('#')===0){
      e.preventDefault();
      var el=document.querySelector(href);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });

  // Simple CTA form behavior (if on a page with a form)
  document.addEventListener('submit',function(e){
    var form=e.target;
    if(form && form.classList && form.classList.contains('js-cta-form')){
      e.preventDefault();
      var btn=form.querySelector('button[type=submit]');
      if(btn) btn.disabled=true;
      var msg=document.createElement('div');
      msg.className='form-msg';
      msg.textContent='Thanks — we received your request. Our team will follow up to schedule a consult.';
      form.appendChild(msg);
      setTimeout(function(){ if(btn) btn.disabled=false; },2500);
    }
  });
})();