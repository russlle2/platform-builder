(function(){
  var open = document.getElementById('open-modal');
  var modal = document.getElementById('modal');
  var close = document.getElementById('close-modal');
  var cancel = document.getElementById('cancel-modal');
  var form = document.getElementById('consult-form');

  function showModal(){
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function hideModal(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }
  if(open) open.addEventListener('click', showModal);
  if(close) close.addEventListener('click', hideModal);
  if(cancel) cancel.addEventListener('click', hideModal);
  modal.addEventListener('click', function(e){ if(e.target===modal) hideModal(); });

  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Sending...';
      setTimeout(function(){
        btn.textContent = 'Sent';
        form.reset();
        setTimeout(function(){ btn.disabled=false; btn.textContent='Send'; hideModal(); }, 900);
      },900);
    });
  }

  // Small accessibility helper: close on Escape
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ hideModal(); } });
})();