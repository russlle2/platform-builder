/* Main interactions for aromatherapy template */
(function(){
  // Year in footer
  document.addEventListener('DOMContentLoaded',function(){
    var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

    // Mobile nav toggle
    var mt=document.querySelector('.mobile-toggle');
    var nav=document.querySelector('.nav');
    if(mt && nav){mt.addEventListener('click',function(){nav.classList.toggle('open');});}

    // FAQ toggles
    var items=document.querySelectorAll('.faq-item');
    items.forEach(function(btn){
      btn.addEventListener('click',function(){
        var idx=btn.getAttribute('data-index');
        var panel=document.querySelector('.faq-panel[data-index="'+idx+'"]');
        if(!panel) return;
        var open=panel.style.display==='block';
        panel.style.display=open?'none':'block';
        btn.setAttribute('aria-expanded',(!open).toString());
      });
    });

    // Ripple effect for elements with .ripple
    document.querySelectorAll('.ripple').forEach(function(el){
      el.addEventListener('click',function(e){
        var target=e.currentTarget;
        target.classList.remove('rippling');
        void target.offsetWidth; // reflow
        var rect=target.getBoundingClientRect();
        var x=e.clientX-rect.left; var y=e.clientY-rect.top;
        target.style.setProperty('--ripple-x',x+'px');
        target.style.setProperty('--ripple-y',y+'px');
        target.classList.add('rippling');
        setTimeout(function(){target.classList.remove('rippling');},700);
      });
    });

    // Booking form basic validation and submission simulation
    var form=document.getElementById('bookingForm');
    if(form){
      form.addEventListener('submit',function(ev){
        ev.preventDefault();
        var name=form.querySelector('[name="name"]').value.trim();
        var email=form.querySelector('[name="email"]').value.trim();
        var date=form.querySelector('[name="date"]').value;
        if(!name||!email||!date){
          alert('Please complete your name, email, and preferred date.');
          return;
        }
        // Simulate request
        var btn=form.querySelector('button[type="submit"]');
        var original=btn.textContent; btn.textContent='Requesting...'; btn.disabled=true;
        setTimeout(function(){
          btn.textContent=original; btn.disabled=false; alert('Thanks! A confirmation and safety checklist will be sent to '+email+'.');
          form.reset();
        },1200);
      });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        var href=a.getAttribute('href');
        if(href.length>1){
          e.preventDefault();
          var target=document.querySelector(href);
          if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
        }
      });
    });
  });
})();