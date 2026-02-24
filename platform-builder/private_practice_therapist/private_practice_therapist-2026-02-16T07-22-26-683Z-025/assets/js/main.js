document.addEventListener('DOMContentLoaded',function(){
  var toggle=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.main-nav');
  if(toggle){toggle.addEventListener('click',function(){
    var expanded=this.getAttribute('aria-expanded')==='true';
    this.setAttribute('aria-expanded',!expanded);
    if(nav){nav.style.display = expanded ? 'none' : 'block';}
  });}

  var diagForm=document.getElementById('diag-form');
  var diagResult=document.getElementById('diag-result');
  var resetBtn=document.getElementById('diag-reset');
  if(diagForm){
    diagForm.addEventListener('submit',function(e){
      e.preventDefault();
      var data=new FormData(diagForm);
      var primary=data.get('primary')||'general support';
      var pace=data.get('pace')||'weekly';
      var outcome=data.get('outcome')||'greater steadiness';
      diagResult.innerHTML='<h4>Suggested path</h4><p class="result-copy">Based on your answers, a good next step might be the "Foundation Path" to learn stabilizing skills. If your needs are specific, consider Individual sessions. You can book a brief intake to discuss options.</p><p class="small">Primary concern: '+escapeHTML(primary)+'. Pace: '+escapeHTML(pace)+'. Outcome: '+escapeHTML(outcome)+'.</p>';
    });
  }
  if(resetBtn){resetBtn.addEventListener('click',function(){diagForm.reset();diagResult.innerHTML='<h4>Suggested path</h4><p class="result-copy">Complete the short check to receive a suggested starting plan. This is not a clinical diagnosis and does not replace urgent care.</p>'});}

  var selfCheck=document.getElementById('self-check');
  if(selfCheck){selfCheck.addEventListener('click',function(){document.getElementById('diag-form').scrollIntoView({behavior:'smooth'});document.getElementById('diag-form').querySelector('select').focus();});}

  function escapeHTML(str){return String(str).replace(/[&<>"']/g,function(s){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s];});}
});