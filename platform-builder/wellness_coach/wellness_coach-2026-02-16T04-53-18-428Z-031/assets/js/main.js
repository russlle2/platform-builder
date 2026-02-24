(function(){
  // small interaction script: mobile nav, lead form, year
  document.addEventListener('DOMContentLoaded',function(){
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.main-nav');
    if(toggle && nav){
      toggle.addEventListener('click',function(){
        var open = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!open));
        nav.style.display = open ? '' : 'flex';
        if(!open) nav.style.flexDirection = 'column';
      });
    }

    // lead form submit (no external network)
    var lead = document.getElementById('leadForm');
    if(lead){
      lead.addEventListener('submit',function(e){
        e.preventDefault();
        var email = this.email.value || '';
        if(!email){
          alert('Please enter a valid email');
          return;
        }
        // simulate lightweight success state
        this.querySelector('button').textContent = 'Sent!';
        setTimeout(()=>{this.querySelector('button').textContent = 'Send me the kit';},2500);
        this.reset();
      });
    }

    // inject year
    var y = document.getElementById('year');
    if(y) y.textContent = new Date().getFullYear();

    // smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        e.preventDefault();
        var id = this.getAttribute('href').slice(1);
        var el = document.getElementById(id);
        if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
  });
})();
