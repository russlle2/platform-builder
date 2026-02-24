document.addEventListener('DOMContentLoaded',function(){var navToggle=document.getElementById('navToggle');var nav=document.querySelector('nav.nav');if(navToggle){navToggle.addEventListener('click',function(){if(nav.style.display==='flex'){nav.style.display='none'}else{nav.style.display='flex';nav.style.flexDirection='column'}})}var qBtns=document.querySelectorAll('.q-btn');qBtns.forEach(function(b){b.addEventListener('click',function(){var id=b.getAttribute('data-toggle');var el=document.getElementById(id);if(!el) return;el.style.display=(el.style.display==='block')?'none':'block'});});

// Smooth scroll for internal anchor links
var links=document.querySelectorAll('a[href^="#"], a[href$=".html"]');links.forEach(function(link){link.addEventListener('click',function(e){var href=link.getAttribute('href');if(href.startsWith('#')){e.preventDefault();var el=document.querySelector(href);if(el) el.scrollIntoView({behavior:'smooth',block:'start'});}});});

// Placeholder: protect contact details from crawlers via simple obfuscation for display
var phoneEl=document.querySelector('[data-phone]');if(phoneEl){var phone=phoneEl.getAttribute('data-phone');phoneEl.textContent=phone.replace(/X/g,'•');}
});