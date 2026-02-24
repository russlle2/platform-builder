// Minimal front-end interactions for therapist site
document.addEventListener('DOMContentLoaded',function(){
  // Year in footer
  var y = new Date().getFullYear();
  var el = document.getElementById('year'); if(el) el.textContent = y;

  // FAQ accordion
  var questions = document.querySelectorAll('.faq-q');
  questions.forEach(function(btn){
    btn.addEventListener('click',function(){
      var open = this.nextElementSibling;
      var visible = open && open.style.display === 'block';
      // close others
      document.querySelectorAll('.faq-a').forEach(function(a){a.style.display='none'});
      if(!visible) open.style.display='block';
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var t = document.querySelector(this.getAttribute('href'));
      if(t) t.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // Simple form stub behavior for booking links (if on page)
  var bookingLinks = document.querySelectorAll('a[href*="book.html"], a.btn-primary');
  bookingLinks.forEach(function(link){
    link.addEventListener('click',function(e){
      // let external booking proceed if absolute URL
      var href = this.getAttribute('href');
      if(href && href.indexOf('http')!==0 && href.indexOf('#')!==0){
        // no-op: normal navigation
      }
    });
  });
});