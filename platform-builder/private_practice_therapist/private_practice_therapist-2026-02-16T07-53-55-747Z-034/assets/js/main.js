(function(){
  // Basic interactivity: menu toggle, lead magnet modal behavior, simple form handling
  document.addEventListener('DOMContentLoaded', function(){
    var menuBtn = document.getElementById('menuToggle');
    if(menuBtn){
      menuBtn.addEventListener('click', function(){
        var expanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!expanded));
        // simple visual: toggle nav links
        document.querySelectorAll('.main-nav a').forEach(function(a){
          a.style.display = expanded ? '' : 'inline-block';
        });
      });
    }

    // Lead magnet button opens the lead form focus
    var leadBtn = document.getElementById('leadMagnetBtn');
    if(leadBtn){
      leadBtn.addEventListener('click', function(){
        var email = prompt('Enter your email to receive the free Clarity Guide');
        if(email){
          // rudimentary email validation
          if(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
            try{localStorage.setItem('lead_email', email);}catch(e){}
            alert('Thanks — the guide link will be sent to ' + email + '.');
          }else{
            alert('Please provide a valid email.');
          }
        }
      });
    }

    // Lead form submit
    var leadForm = document.getElementById('leadForm');
    if(leadForm){
      leadForm.addEventListener('submit', function(e){
        e.preventDefault();
        var emailInput = document.getElementById('leadEmail');
        var email = emailInput && emailInput.value.trim();
        if(!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
          emailInput.focus();
          alert('Please enter a valid email address.');
          return;
        }
        try{localStorage.setItem('lead_email', email);}catch(e){}
        // simulate download / send
        alert('Thanks — we sent the Clarity Guide to ' + email + '. Check your inbox.');
        emailInput.value = '';
      });
    }

    // Set year
    var y = new Date().getFullYear();
    var yearEl = document.getElementById('year');
    if(yearEl){ yearEl.textContent = y; }
  });
})();