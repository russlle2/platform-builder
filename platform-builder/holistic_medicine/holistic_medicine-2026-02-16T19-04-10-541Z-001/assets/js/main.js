(function(){
  var toggle=document.getElementById('nav-toggle');
  var nav=document.getElementById('main-nav');
  toggle&&toggle.addEventListener('click',function(){
    nav.classList.toggle('show');
    toggle.setAttribute('aria-expanded', nav.classList.contains('show'));
  });

  // Smooth scroll for internal links
  document.addEventListener('click',function(e){
    var a=e.target.closest('a');
    if(!a) return;
    var href=a.getAttribute('href')||'';
    if(href.charAt(0)==='#'){
      e.preventDefault();
      var el=document.querySelector(href);
      if(el){ el.scrollIntoView({behavior:'smooth',block:'start'}); }
    }
  });

  // Simple focus ring for keyboard users
  function handleFirstTab(e){ if(e.key==='Tab'){ document.body.classList.add('show-focus'); window.removeEventListener('keydown',handleFirstTab); }}
  window.addEventListener('keydown',handleFirstTab);

  // Placeholder: prevent accidental form submits in static demo
  var forms=document.querySelectorAll('form');
  forms.forEach(function(f){ f.addEventListener('submit',function(ev){ ev.preventDefault(); alert('This is a demo. Follow the "'+(window.location.pathname||'')+'" booking flow.'); }); });
})();