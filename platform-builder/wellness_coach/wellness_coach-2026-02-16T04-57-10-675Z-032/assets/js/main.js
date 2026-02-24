(function(){document.getElementById('year').textContent=new Date().getFullYear();
// Mobile nav toggle
var toggle=document.querySelector('.nav-toggle');var nav=document.querySelector('.site-nav');if(toggle){toggle.addEventListener('click',function(){if(nav.style.display==='flex'){nav.style.display='none'}else{nav.style.display='flex';nav.style.flexDirection='column';nav.style.gap='12px'}})}
// FAQ accordion
Array.prototype.slice.call(document.querySelectorAll('.faq-q')).forEach(function(btn){btn.addEventListener('click',function(){var a=this.nextElementSibling;var open=document.querySelector('.faq-a[aria-expanded="true"]');if(open && open!==a){open.style.display='none';open.removeAttribute('aria-expanded')}if(a.style.display==='block'){a.style.display='none';a.removeAttribute('aria-expanded')}else{a.style.display='block';a.setAttribute('aria-expanded','true')}})});
// Lead magnet form handling (local simulation)
var leadForm=document.getElementById('leadForm');if(leadForm){leadForm.addEventListener('submit',function(e){e.preventDefault();var email=leadForm.email.value.trim();if(!email || !email.includes('@')){alert('Please enter a valid email.');return}try{localStorage.setItem('lead_email',email)}catch(err){}leadForm.querySelector('button').textContent='Sent ✓';leadForm.querySelector('button').disabled=true;setTimeout(function(){leadForm.querySelector('button').textContent='Send me the guide';leadForm.querySelector('button').disabled=false;leadForm.reset()},1200)})}
// Smooth scroll for internal links
document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();var id=this.getAttribute('href').slice(1);var el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})})});
})();