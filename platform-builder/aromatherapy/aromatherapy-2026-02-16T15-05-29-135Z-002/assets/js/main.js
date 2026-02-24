(function(){
  // Basic interactions: menu toggle, accordion, lead form
  var menuToggle=document.getElementById('menuToggle');
  var nav=document.querySelector('.main-nav');
  if(menuToggle){menuToggle.addEventListener('click',function(){
    if(nav.style.display==='flex'){nav.style.display='none';}else{nav.style.display='flex';nav.style.flexDirection='column';nav.style.gap='10px';}
  });}

  // Accordion
  var items=document.querySelectorAll('.accordion .item');
  items.forEach(function(it){
    var btn=it.querySelector('.q');
    var ans=it.querySelector('.a');
    btn.addEventListener('click',function(){
      var open=ans.style.display==='block';
      // close others
      document.querySelectorAll('.accordion .a').forEach(function(a){a.style.display='none';});
      if(!open){ans.style.display='block';}
    });
  });

  // Lead form handling (client-only)
  var leadForm=document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email=leadForm.email.value.trim();
      if(!email || !/.+@.+\..+/.test(email)){
        alert('Please enter a valid email address.');
        return;
      }
      // Mock submit
      leadForm.querySelector('button').innerText='Sending...';
      setTimeout(function(){
        leadForm.querySelector('button').innerText='Get the guide';
        alert('Thanks! Your guide is on its way to ' + email + '.');
        leadForm.reset();
      },800);
    });
  }

  // Footer year
  var year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();
})();