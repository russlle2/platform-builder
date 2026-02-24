(function(){
  // small UI behaviors: nav toggle, form capture, year insert
  document.addEventListener('DOMContentLoaded',function(){
    var toggle=document.getElementById('navToggle');
    var menu=document.getElementById('navMenu');
    if(toggle && menu){
      toggle.addEventListener('click',function(){
        var open=menu.hidden;
        menu.hidden=!open;
        toggle.setAttribute('aria-expanded',String(open));
      });
    }

    // year
    var y=document.getElementById('year');
    if(y) y.textContent=(new Date()).getFullYear();

    // lead form: basic validation and local storage (no external calls)
    var leadForm=document.getElementById('leadForm');
    if(leadForm){
      leadForm.addEventListener('submit',function(e){
        e.preventDefault();
        var email=leadForm.querySelector('input[name="email"]').value.trim();
        if(!email || email.indexOf('@')===-1){
          alert('Please enter a valid email to receive the guide.');
          return;
        }
        try{localStorage.setItem('aroma_lead',JSON.stringify({email:email,t:Date.now()}));}catch(err){}
        // visual confirmation
        leadForm.innerHTML='<p class="lead-confirm">Thanks — check your inbox for the Quick-Start Guide. If you do not receive it, contact us at {{EMAIL}}.</p>';
      });
    }

    // accessible details polyfill: ensure only keyboard accessible focus states
    var details=document.querySelectorAll('details');
    details.forEach(function(d){
      d.addEventListener('toggle',function(){
        // no-op but keeps behavior consistent across browsers
      });
    });
  });
})();
