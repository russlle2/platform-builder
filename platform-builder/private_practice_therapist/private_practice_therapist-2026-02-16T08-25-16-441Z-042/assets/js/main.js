(function(){
  // Simple interactions: modal lead magnet, accordion details polyfill, nav toggle
  var lead = document.getElementById('open-lead');
  var modal = document.getElementById('leadModal');
  var close = modal && modal.querySelector('.modal-close');
  var form = document.getElementById('leadForm');
  var navToggle = document.querySelector('.nav-toggle');
  var mainNav = document.querySelector('.main-nav');

  function openModal(){ if(modal){ modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }}
  function closeModal(){ if(modal){ modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }}

  if(lead) lead.addEventListener('click', openModal);
  if(close) close.addEventListener('click', closeModal);
  if(modal) modal.addEventListener('click', function(e){ if(e.target===modal) closeModal(); });

  if(form){ form.addEventListener('submit', function(e){ e.preventDefault(); var email = form.email.value; form.querySelector('button').disabled = true; form.querySelector('button').innerText = 'Sending...';
      // Simulate sending
      setTimeout(function(){ form.querySelector('button').innerText = 'Sent'; form.reset(); setTimeout(closeModal,900); }, 900);
  }); }

  if(navToggle){ navToggle.addEventListener('click', function(){ mainNav.classList.toggle('open'); }); }

  // Ensure <details> behavior accessible: close others when one opens
  var details = document.querySelectorAll('details');
  details.forEach(function(d){ d.addEventListener('toggle', function(){ if(d.open){ details.forEach(function(other){ if(other!==d) other.open=false; }); } }); });

  // Smooth scroll for internal links
  document.addEventListener('click', function(e){ var a = e.target.closest('a'); if(a && a.getAttribute('href') && a.getAttribute('href').startsWith('#')){ e.preventDefault(); var id = a.getAttribute('href').slice(1); var el = document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth'}); } });
})();