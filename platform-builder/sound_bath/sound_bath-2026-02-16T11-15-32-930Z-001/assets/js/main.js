document.addEventListener('DOMContentLoaded',function(){
  // Mobile nav toggle
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');
  if(navToggle){
    navToggle.addEventListener('click',function(){
      if(mainNav.style.display==='flex'){mainNav.style.display='none'}else{mainNav.style.display='flex';mainNav.style.flexDirection='column';mainNav.style.background='rgba(255,255,255,0.02)';mainNav.style.padding='12px';mainNav.style.borderRadius='8px'}
    })
  }

  // Smooth scroll for local anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id = this.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    })
  })

  // Diagnostic quiz simple logic
  var quizBtn = document.getElementById('quizCheck');
  var quizResult = document.getElementById('quizResult');
  if(quizBtn){
    quizBtn.addEventListener('click',function(){
      var checked = Array.from(document.querySelectorAll('input[name="q"]:checked')).map(function(i){return i.value});
      if(checked.length===0){ quizResult.textContent='No flagged items. Most people can participate; ask facilitator if unsure.' }
      else{ quizResult.textContent='You selected: ' + checked.join(', ') + '. Please consult with the facilitator or your clinician before attending.' }
    })
  }

  // Prevent external form submit if any booking forms included
  document.querySelectorAll('form').forEach(function(f){
    f.addEventListener('submit',function(e){e.preventDefault();alert('This demo site does not process bookings. Please contact ' + (window.location.hostname || '') );});
  })

  // Decorative ripple respond to mouse movement for a delicate effect
  var ripple = document.querySelector('.ripple');
  if(ripple){
    document.addEventListener('mousemove',function(e){
      var hero = document.getElementById('hero');
      if(!hero) return;
      var rect = hero.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width;
      var y = (e.clientY - rect.top) / rect.height;
      ripple.style.left = (x*100) + '%';
      ripple.style.top = (y*100) + '%';
    })
  }
});