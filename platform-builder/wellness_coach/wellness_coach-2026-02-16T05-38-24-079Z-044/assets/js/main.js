document.addEventListener('DOMContentLoaded',function(){
  var navToggle=document.getElementById('navToggle');
  var nav=document.getElementById('primaryNav');
  navToggle&&navToggle.addEventListener('click',function(){
    if(nav.style.display==='flex'){nav.style.display='none';}else{nav.style.display='flex';nav.style.flexDirection='column'}
  });

  // Lead magnet form handling (client-only stub)
  var leadForm=document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email=leadForm.querySelector('#email').value;
      if(!email) return;
      // Simulated success flow
      leadForm.innerHTML='<p class="muted">Thanks — the guide is on its way to <strong>'+escapeHtml(email)+'</strong>.</p>';
    });
  }

  function escapeHtml(s){return String(s).replace(/[&<>\"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});}
});