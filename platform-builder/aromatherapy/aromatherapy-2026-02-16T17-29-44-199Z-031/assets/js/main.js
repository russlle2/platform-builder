(function(){
  // Simple interactive behavior: nav toggle, intake form faux-submit, year injection
  document.addEventListener('DOMContentLoaded',function(){
    var toggle=document.getElementById('nav-toggle');
    var nav=document.getElementById('primary-nav');
    if(toggle){
      toggle.addEventListener('click',function(){
        var expanded=this.getAttribute('aria-expanded')=== 'true';
        this.setAttribute('aria-expanded', String(!expanded));
        nav.classList.toggle('open');
      });
    }
    var year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();

    // Quick intake faux handling
    var intake=document.getElementById('quick-intake');
    if(intake){
      intake.addEventListener('submit',function(e){
        e.preventDefault();
        var name=this.querySelector('#q-name').value||'there';
        // Basic validation & feedback
        var contact=this.querySelector('#q-contact').value;
        if(!contact || contact.length<5){
          alert('Please include an email or phone so we can follow up.');
          return;
        }
        alert('Thanks, '+name+'. We received your request and will reach out to schedule a hybrid consult.');
        this.reset();
      });
    }

    // Accessibility: allow Enter on nav-toggle
    if(toggle){toggle.addEventListener('keyup',function(e){if(e.key==='Enter')this.click();});}
  });
})();