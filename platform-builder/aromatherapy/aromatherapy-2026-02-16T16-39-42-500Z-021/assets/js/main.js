(function(){document.addEventListener('DOMContentLoaded',function(){var nav=document.getElementById('main-nav');var btn=document.getElementById('nav-toggle');if(btn){btn.addEventListener('click',function(){if(nav.style.display==='flex'){nav.style.display='none'}else{nav.style.display='flex';nav.style.flexDirection='column';nav.style.gap='0.25rem'}})}
// Smooth scroll for internal links
var links=document.querySelectorAll('a[href^="#"], a[href$=".html"]');links.forEach(function(a){a.addEventListener('click',function(e){var href=a.getAttribute('href');if(href && href.startsWith('#')){e.preventDefault();var t=document.querySelector(href);if(t){t.scrollIntoView({behavior:'smooth',block:'start'})}}})})
// Simple form sanitation helper for future forms
window.safeText=function(s){return String(s).replace(/[<>"'`]/g,'')}
})})();