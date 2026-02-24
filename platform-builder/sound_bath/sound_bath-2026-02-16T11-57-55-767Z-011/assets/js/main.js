(function(){
  // Nav toggle
  var toggle=document.getElementById('nav-toggle');
  var nav=document.getElementById('main-nav');
  if(toggle && nav){
    toggle.addEventListener('click',function(){
      var open=nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded',String(open));
    });
  }

  // Simple testimonial carousel
  var tbox=document.getElementById('testimonials');
  if(tbox){
    var idx=0; var items=tbox.querySelectorAll('.quote');
    function show(i){ items.forEach(function(el,ei){ el.style.display=(ei===i)?'block':'none'; }); }
    if(items.length){ show(0); setInterval(function(){ idx=(idx+1)%items.length; show(idx); },4500); }
  }

  // FAQ accordion: allow toggle via details (no polyfill here)

  // Lead magnet form: faux submit
  var form=document.getElementById('magnet-form');
  if(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var email=form.querySelector('input[type="email"]').value;
      if(!email) return alert('Please enter an email');
      // simulate async
      var btn=form.querySelector('button');
      var old=btn.innerText; btn.disabled=true; btn.innerText='Sending…';
      setTimeout(function(){ btn.innerText='Sent ✓'; btn.disabled=false; setTimeout(function(){ btn.innerText=old; form.reset(); },1400); },1200);
    });
  }
})();