document.addEventListener('DOMContentLoaded',function(){
  // mobile nav
  var navToggle=document.getElementById('nav-toggle');
  var mainNav=document.getElementById('main-nav');
  if(navToggle && mainNav){
    navToggle.addEventListener('click',function(){
      var expanded=mainNav.style.display==='flex';
      mainNav.style.display = expanded ? 'none' : 'flex';
      mainNav.style.flexDirection = 'column';
    });
  }

  // lead magnet form
  var leadForm=document.getElementById('lead-form');
  var modal=document.getElementById('modal');
  var modalClose=document.getElementById('modal-close');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      // fake send
      modal.setAttribute('aria-hidden','false');
    });
  }
  if(modalClose){
    modalClose.addEventListener('click',function(){modal.setAttribute('aria-hidden','true');});
  }

  // smooth links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id=this.getAttribute('href').slice(1);
      var el=document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth'});
    });
  });
});
