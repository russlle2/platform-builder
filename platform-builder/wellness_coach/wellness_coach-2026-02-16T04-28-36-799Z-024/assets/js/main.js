document.addEventListener('DOMContentLoaded',function(){
  // year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // nav toggle
  var btn=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.main-nav');
  if(btn&&nav){
    btn.addEventListener('click',function(){
      nav.classList.toggle('open');
    });
  }

  // accordion
  var items=document.querySelectorAll('.accordion-item');
  items.forEach(function(it){
    it.addEventListener('click',function(){
      var expanded=this.getAttribute('aria-expanded')==='true';
      this.setAttribute('aria-expanded', String(!expanded));
      var panel=this.nextElementSibling;
      if(panel){ panel.style.display = expanded ? 'none' : 'block'; }
    });
  });

  // lead form (mock)
  var lead=document.getElementById('leadForm');
  if(lead){
    lead.addEventListener('submit',function(e){
      e.preventDefault();
      var email=lead.querySelector('input[name="email"]').value;
      if(!email) return;
      lead.querySelector('button').disabled=true; lead.querySelector('button').textContent='Sending...';
      setTimeout(function(){
        lead.innerHTML='<p>Thanks! The guide has been sent to <strong>'+email+"</strong>. Check your inbox.</p>";
      },900);
    });
  }

  // smooth anchor scroll
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault(); var id=this.getAttribute('href').substring(1); var el=document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth'});
    });
  });
});