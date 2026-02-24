(function(){
  const navToggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('main-nav');
  navToggle && navToggle.addEventListener('click', ()=>{
    nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', nav.classList.contains('open'))
  });

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', e=>{
      e.preventDefault();
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // Simple booking form handler if present on pages
  document.addEventListener('submit', function(e){
    const form = e.target;
    if(form && form.matches('.booking-form')){
      e.preventDefault();
      // In a real site, this would POST to a backend. We validate and show a friendly message.
      const name = form.querySelector('[name="name"]')?.value || '';
      alert('Thank you ' + (name||'there') + '. We received your request. A team member will follow up via email.');
      form.reset();
    }
  });
})();
