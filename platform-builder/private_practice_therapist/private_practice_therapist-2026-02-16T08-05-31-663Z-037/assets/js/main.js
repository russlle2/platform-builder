(function(){
  // Simple UI interactions: modal, form, mobile nav
  function $(sel, ctx){return (ctx||document).querySelector(sel)}
  var leadBtn = $('#leadMagnetOpen') || $('#leadMagnetOpen2')
  var leadBtn2 = $('#leadMagnetOpen2')
  var modal = $('#leadModal')
  var modalClose = $('#modalClose')
  var modalCancel = $('#modalCancel')
  var leadForm = $('#leadForm')
  var mobileToggle = document.querySelector('.mobile-toggle')
  var nav = document.querySelector('.nav')

  function openModal(){ if(!modal) return; modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden' }
  function closeModal(){ if(!modal) return; modal.setAttribute('aria-hidden','true'); document.body.style.overflow='' }

  if($('#leadMagnetOpen')) $('#leadMagnetOpen').addEventListener('click', openModal)
  if($('#leadMagnetOpen2')) $('#leadMagnetOpen2').addEventListener('click', openModal)
  if(modalClose) modalClose.addEventListener('click', closeModal)
  if(modalCancel) modalCancel.addEventListener('click', closeModal)
  if(modal) modal.addEventListener('click', function(e){ if(e.target===modal) closeModal() })

  if(leadForm){
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      var form = e.target; var data = new FormData(form); var email = data.get('email')||'';
      if(!email || !email.includes('@')){
        alert('Please provide a valid email.'); return;
      }
      // Mock send: store locally and show success state
      try{ localStorage.setItem('lead_email', email) }catch(err){}
      closeModal();
      setTimeout(function(){ alert('Guide sent to ' + email + '. Check your inbox.'); },200)
    })
  }

  if(mobileToggle){
    mobileToggle.addEventListener('click', function(){ if(nav.style.display==='flex'){nav.style.display='none'}else{nav.style.display='flex';nav.style.flexDirection='column'}})
  }
})();