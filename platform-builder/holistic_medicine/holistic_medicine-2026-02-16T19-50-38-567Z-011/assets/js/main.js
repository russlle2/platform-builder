(function(){
  // Small interactions: nav toggle, current year, smooth scroll
  var navToggle=document.getElementById('navToggle');
  var navList=document.getElementById('navList');
  if(navToggle){
    navToggle.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded')==='true';
      this.setAttribute('aria-expanded', !expanded);
      if(navList){ navList.style.display = expanded ? 'none' : 'flex'; }
    });
  }

  // Set current year in footer
  var y = new Date().getFullYear();
  var el = document.getElementById('year');
  if(el) el.textContent = String(y);

  // Smooth scroll for local links
  document.addEventListener('click', function(e){
    var a = e.target.closest('a');
    if(!a) return;
    var href = a.getAttribute('href');
    if(href && href.startsWith('#')){
      e.preventDefault();
      var target = document.querySelector(href);
      if(target) target.scrollIntoView({behavior:'smooth'});
    }
  });

  // Lightweight form placeholder for booking link if present
  window.bookNow = function(){
    alert('Redirecting to booking — this is a placeholder.');
    window.location.href = '{{PRIMARY_CTA_URL}}';
  };
})();