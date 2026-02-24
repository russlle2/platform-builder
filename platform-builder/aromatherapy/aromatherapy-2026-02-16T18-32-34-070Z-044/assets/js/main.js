(function(){
  // Mobile nav toggle
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');
  if(navToggle){
    navToggle.addEventListener('click', function(){
      nav.classList.toggle('open');
      // reveal links on small screens
      var links = nav.querySelectorAll('a');
      for(var i=0;i<links.length;i++){
        links[i].style.display = links[i].style.display === 'inline-block' ? '' : 'inline-block';
      }
    });
  }

  // Accordion
  var acc = document.querySelectorAll('.acc-toggle');
  acc.forEach(function(btn){
    btn.addEventListener('click', function(){
      var panel = btn.nextElementSibling;
      var open = panel.style.display === 'block';
      // close others
      document.querySelectorAll('.acc-panel').forEach(function(p){p.style.display='none'});
      if(!open){panel.style.display='block';}
    });
  });

  // Lead magnet form
  var leadForm = document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      var email = document.getElementById('leadEmail').value;
      if(!email) return;
      // simple UX: store and show a friendly message
      try{localStorage.setItem('lead_email', email);}catch(e){}
      leadForm.innerHTML = '<p class="small">Thanks! Check your inbox for the Mini Scent Map (no medical info — educational only).</p>';
      // Simulate download link
      setTimeout(function(){
        var a = document.createElement('a');
        a.href = '#';
        a.textContent = 'Download your guide';
        a.className = 'btn ghost';
        leadForm.appendChild(a);
      },400);
    });
  }

})();