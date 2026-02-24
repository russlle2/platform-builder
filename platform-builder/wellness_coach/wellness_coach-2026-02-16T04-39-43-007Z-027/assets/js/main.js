(function(){
  // Mobile nav toggle
  var toggle=document.getElementById('navToggle');
  var nav=document.getElementById('mainNav');
  toggle&&toggle.addEventListener('click',function(){
    if(nav.style.display==='flex'){nav.style.display='none';}else{nav.style.display='flex';nav.style.flexDirection='column'}
  });

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var id=this.getAttribute('href');
      if(id.length>1){
        e.preventDefault();
        var el=document.querySelector(id);
        if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  });

  // Lead magnet form handling (mock)
  var form=document.getElementById('magnetForm');
  var msg=document.getElementById('magnetMessage');
  form&&form.addEventListener('submit',function(e){
    e.preventDefault();
    var email=form.email.value.trim();
    if(!email || !email.includes('@')){
      msg.textContent='Please enter a valid email.';
      msg.style.color='crimson';
      return;
    }
    // Simulate async send
    msg.style.color='var(--accent-2)';
    msg.textContent='Sending...';
    setTimeout(function(){
      msg.textContent='Thanks — the guide is on its way to '+email;
      form.reset();
    },800);
  });

  // Year in footer
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
})();