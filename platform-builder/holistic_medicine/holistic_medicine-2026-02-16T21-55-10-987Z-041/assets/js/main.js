(function(){
  // Minimal interactions: nav toggle, lead capture
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');
  if(navToggle){
    navToggle.addEventListener('click',function(){
      nav.classList.toggle('open');
    });
  }

  var leadForm = document.getElementById('leadForm');
  var leadMsg = document.getElementById('leadMsg');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var name = (leadForm.name.value||'').trim();
      var email = (leadForm.email.value||'').trim();
      if(!email){
        leadMsg.textContent = 'Please enter a valid email.';
        return;
      }
      // Simulate capture — store locally and show gentle message
      try{
        var leads = JSON.parse(localStorage.getItem('leads')||'[]');
        leads.push({name:name,email:email,date:new Date().toISOString()});
        localStorage.setItem('leads',JSON.stringify(leads));
      }catch(err){/* ignore */}
      leadForm.reset();
      leadMsg.textContent = 'Thank you. We\'ll send the guide and details about upcoming series.';
    });
  }

  // Smooth links for anchors
  document.addEventListener('click',function(e){
    var a = e.target.closest('a');
    if(!a) return;
    var href = a.getAttribute('href')||'';
    if(href.startsWith('#')){
      var el = document.querySelector(href);
      if(el){
        e.preventDefault();
        el.scrollIntoView({behavior:'smooth',block:'start'});
      }
    }
  });
})();
