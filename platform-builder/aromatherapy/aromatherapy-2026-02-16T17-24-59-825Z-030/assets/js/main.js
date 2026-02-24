// Minimal interactive behaviors: nav toggle, form handling, FAQ toggle
document.addEventListener('DOMContentLoaded',function(){
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');
  if(navToggle && mainNav){
    navToggle.addEventListener('click',function(){
      var shown = mainNav.style.display === 'block';
      mainNav.style.display = shown ? 'none' : 'block';
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var t = document.querySelector(this.getAttribute('href'));
      if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});}      
    });
  });

  // Booking form basic validation + friendly confirmation
  var booking = document.getElementById('bookingForm');
  if(booking){
    booking.addEventListener('submit',function(e){
      e.preventDefault();
      var name = booking.querySelector('#name').value.trim();
      var email = booking.querySelector('#email').value.trim();
      if(!name || !email){
        alert('Please provide your name and email so I can confirm your booking.');
        return;
      }
      // Simulate a lightweight hybrid booking submission
      booking.querySelector('button[type=submit]').disabled = true;
      booking.querySelector('button[type=submit]').textContent = 'Request sent';
      setTimeout(function(){
        alert('Thanks, ' + (name||'there') + '. I will contact you at ' + (email||'your email') + ' to confirm.');
      },600);
    });
  }

  // Quick call button
  var quick = document.getElementById('quickCall');
  if(quick){
    quick.addEventListener('click',function(){
      var phone = '{{PHONE}}';
      if(phone && phone.indexOf('{')===-1){
        window.location.href = 'tel:' + phone;
      } else {
        alert('Call our main line: {{PHONE}}');
      }
    });
  }

  // Accessible details polyfill: ensure clicking summary toggles
  document.querySelectorAll('details').forEach(function(d){
    var s = d.querySelector('summary');
    if(s){s.addEventListener('click',function(e){
      // native handles toggle; ensure only one open at a time
      document.querySelectorAll('.faq-list details').forEach(function(other){ if(other!==d) other.removeAttribute('open');});
    });}
  });
});