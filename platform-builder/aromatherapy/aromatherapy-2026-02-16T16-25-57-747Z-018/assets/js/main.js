(function(){document.getElementById('year').textContent=new Date().getFullYear();
// nav toggle
var btn=document.querySelector('.nav-toggle');var nav=document.querySelector('.nav');if(btn){btn.addEventListener('click',function(){if(nav.style.display==='flex'){nav.style.display='none';btn.textContent='☰'}else{nav.style.display='flex';nav.style.flexDirection='column';btn.textContent='✕'}})}
// smooth anchors
document.addEventListener('click',function(e){var a=e.target.closest('a');if(!a) return;var href=a.getAttribute('href');if(href&&href.startsWith('#')){e.preventDefault();var el=document.querySelector(href);if(el) el.scrollIntoView({behavior:'smooth',block:'start'});}}
);
// close details when another opens
var details=document.querySelectorAll('details');details.forEach(function(d){d.addEventListener('toggle',function(){if(d.open){details.forEach(function(other){if(other!==d) other.open=false})}})});
})();