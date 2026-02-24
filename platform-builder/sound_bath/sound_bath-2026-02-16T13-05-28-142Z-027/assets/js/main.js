document.addEventListener('DOMContentLoaded',function(){
  // Year in footer
  var y = new Date().getFullYear();
  var el = document.getElementById('year'); if(el) el.textContent = y;

  // Mobile nav toggle
  var nav = document.getElementById('nav');
  var btn = document.getElementById('navToggle');
  if(btn && nav){
    btn.addEventListener('click',function(){
      nav.classList.toggle('open');
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !expanded);
    });
  }

  // FAQ accordion
  var faqList = document.getElementById('faqList');
  if(faqList){
    faqList.addEventListener('click',function(e){
      var btn = e.target.closest('.faq-q');
      if(!btn) return;
      var item = btn.parentElement;
      var answer = item.querySelector('.faq-a');
      var open = answer.style.display === 'block';
      // close all
      faqList.querySelectorAll('.faq-a').forEach(function(a){a.style.display='none'});
      if(!open) answer.style.display = 'block';
    });
  }

  // Simple smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var t = document.querySelector(this.getAttribute('href'));
      if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});} 
    });
  });

  // Lightweight RSVP simulation for schedule buttons
  document.querySelectorAll('.event a').forEach(function(a){
    a.addEventListener('click',function(e){
      // Let real links proceed if external; if internal, simulate modal (lightweight)
      if(a.getAttribute('href').startsWith('/events')){
        e.preventDefault();
        alert('Opening Events page — here you can RSVP or join as a member.');
      }
    });
  });
});
