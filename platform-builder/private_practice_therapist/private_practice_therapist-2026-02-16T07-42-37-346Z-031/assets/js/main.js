document.addEventListener('DOMContentLoaded',function(){
  // year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
  // mobile nav
  var navToggle=document.getElementById('navToggle'), navList=document.getElementById('navList');
  if(navToggle){navToggle.addEventListener('click',function(){
    var expanded=this.getAttribute('aria-expanded')==="true"; this.setAttribute('aria-expanded',!expanded);
    if(navList){navList.style.display = expanded ? 'none' : 'flex';}
  });}
  // lead magnet modal
  var openLead=document.getElementById('openLead'), modal=document.getElementById('modal'), modalClose=document.getElementById('modalClose');
  if(openLead){openLead.addEventListener('click',function(){if(modal){modal.setAttribute('aria-hidden','false');}})}
  if(modalClose){modalClose.addEventListener('click',function(){if(modal){modal.setAttribute('aria-hidden','true');}})}
  if(modal){modal.addEventListener('click',function(e){if(e.target===modal){modal.setAttribute('aria-hidden','true');}})}
  // lead form
  var leadForm=document.getElementById('leadForm');
  if(leadForm){leadForm.addEventListener('submit',function(e){e.preventDefault(); var email=this.email.value; if(email){
    // show modal and simulate send
    if(modal){modal.setAttribute('aria-hidden','false');}
    this.reset();
  }});
  }
});