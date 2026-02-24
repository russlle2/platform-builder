document.addEventListener('DOMContentLoaded',function(){
  // nav toggle
  var btn = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav ul');
  if(btn){btn.addEventListener('click',function(){
    if(nav.style.display==='flex'){nav.style.display='none'}else{nav.style.display='flex';nav.style.flexDirection='column'}
  })}

  // modal
  var leadModal = document.getElementById('leadModal');
  var openBtn = document.getElementById('openLeadMagnet');
  var closeBtn = document.getElementById('closeModal');
  if(openBtn){openBtn.addEventListener('click',function(){leadModal.setAttribute('aria-hidden','false')})}
  if(closeBtn){closeBtn.addEventListener('click',function(){leadModal.setAttribute('aria-hidden','true')})}
  leadModal.addEventListener('click',function(e){if(e.target===leadModal){leadModal.setAttribute('aria-hidden','true')}})

  // simple form handlers (no external requests)
  var magnetForm = document.getElementById('magnetForm');
  var modalForm = document.getElementById('modalForm');
  function handleForm(e){
    e.preventDefault();
    var email = e.target.querySelector('input[name="email"]').value;
    if(!email) return alert('Please enter an email.');
    // simulate submission
    alert('Thanks — the guide will arrive at ' + email + ' if deliveries are successful.');
    if(leadModal) leadModal.setAttribute('aria-hidden','true');
    e.target.reset();
  }
  if(magnetForm) magnetForm.addEventListener('submit',handleForm);
  if(modalForm) modalForm.addEventListener('submit',handleForm);
});