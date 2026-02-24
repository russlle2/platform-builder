(function(){
  // Basic interactivity: mobile nav toggle, lead form handling, year update
  var navToggle=document.getElementById('navToggle');
  var mobileNav=document.getElementById('mobileNav');
  if(navToggle){
    navToggle.addEventListener('click',function(){
      var expanded=navToggle.getAttribute('aria-expanded')==='true';
      navToggle.setAttribute('aria-expanded',!expanded);
      if(mobileNav){
        if(expanded){
          mobileNav.hidden=true;
        }else{
          mobileNav.hidden=false;
        }
      }
    });
  }

  // Set year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // Lead form: simple client-side validation + faux analytics
  var leadForm=document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email=leadForm.email.value.trim();
      if(!email || !email.includes('@')){
        alert('Please enter a valid email.');
        return;
      }
      // Simulate submission
      var btn=leadForm.querySelector('button');
      var old=btn.textContent; btn.disabled=true; btn.textContent='Sending…';
      setTimeout(function(){
        btn.disabled=false; btn.textContent=old;
        leadForm.reset();
        alert('Thanks — check your inbox for the guide.');
      },900);
    });
  }

  // Smooth anchor handling
  document.addEventListener('click',function(ev){
    var a=ev.target.closest('a'); if(!a) return; if(a.getAttribute('href').charAt(0)!=='#') return;
    ev.preventDefault(); var id=a.getAttribute('href').slice(1); var el=document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth'});
  });
})();