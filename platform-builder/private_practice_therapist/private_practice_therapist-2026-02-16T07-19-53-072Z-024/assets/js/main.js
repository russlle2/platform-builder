// Minimal interactivity: menu toggle, modal, lead form stub
document.addEventListener('DOMContentLoaded',function(){
  var navToggle=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.primary-nav');
  if(navToggle){navToggle.addEventListener('click',function(){
    var expanded=this.getAttribute('aria-expanded')==='true';
    this.setAttribute('aria-expanded',String(!expanded));
    if(nav)nav.style.display= expanded? '': 'flex';
  })}

  var modal=document.getElementById('modal');
  var openButtons=document.querySelectorAll('#lead-magnet-open,#lead-magnet-open-2');
  var closeBtn=document.getElementById('modal-close');
  openButtons.forEach(function(btn){
    btn.addEventListener('click',function(){
      modal.setAttribute('aria-hidden','false');
    })
  })
  if(closeBtn){closeBtn.addEventListener('click',function(){modal.setAttribute('aria-hidden','true')})}
  modal.addEventListener('click',function(e){if(e.target===modal)modal.setAttribute('aria-hidden','true')});

  var leadForm=document.getElementById('lead-form');
  if(leadForm){leadForm.addEventListener('submit',function(e){
    e.preventDefault();
    var email=document.getElementById('lm-email').value;
    // Placeholder behavior: show a thank-you then close. Real integration should replace this.
    alert('Thank you — the guide will be sent to ' + email + '.');
    modal.setAttribute('aria-hidden','true');
    leadForm.reset();
  })}
});