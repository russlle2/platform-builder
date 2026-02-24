document.addEventListener('DOMContentLoaded',function(){
  // Nav toggle for small screens
  var toggle=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.nav ul');
  if(toggle){
    toggle.addEventListener('click',function(){
      if(nav.style.display==='flex'){nav.style.display='none'}else{nav.style.display='flex';nav.style.flexDirection='column'}
    });
  }

  // Lead form - mock submission
  var leadForm=document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email=leadForm.querySelector('input[name="email"]').value;
      if(!email) return;
      // Simulate success
      var btn=leadForm.querySelector('button');
      btn.disabled=true;btn.textContent='Sending...';
      setTimeout(function(){
        btn.textContent='Sent';
        leadForm.querySelector('input[name="email"]').value='';
        btn.disabled=false;
        // small toast
        var t=document.createElement('div');
        t.className='toast';
        t.textContent='Guide sent to ' + email + ' — check your inbox.';
        Object.assign(t.style,{position:'fixed',right:'16px',bottom:'16px',background:'#111',color:'#fff',padding:'10px 14px',borderRadius:'10px',boxShadow:'0 6px 18px rgba(0,0,0,0.4)'});
        document.body.appendChild(t);
        setTimeout(function(){document.body.removeChild(t)},4000);
      },900);
    });
  }

  // Year update
  var y=document.getElementById('year');
  if(y) y.textContent=new Date().getFullYear();

  // Smooth anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id=this.getAttribute('href').slice(1);
      var target=document.getElementById(id);
      if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
});