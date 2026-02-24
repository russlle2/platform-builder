(function(){document.getElementById('year').textContent = new Date().getFullYear();var navToggle = document.getElementById('navToggle');var mainNav = document.getElementById('mainNav');navToggle && navToggle.addEventListener('click', function(){mainNav.classList.toggle('open');if(mainNav.classList.contains('open')){mainNav.style.display = 'flex';}else{mainNav.style.display = '';}});

// Modal logic for lead magnet
var guideModal = document.getElementById('guideModal');var openBtns = [document.getElementById('openGuide'), document.getElementById('openGuide2')];var closeBtn = document.getElementById('closeModal');function openModal(){guideModal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';document.getElementById('leadEmail').focus();}
function closeModalFn(){guideModal.setAttribute('aria-hidden','true');document.body.style.overflow='';}
openBtns.forEach(function(b){if(b){b.addEventListener('click', openModal);}});if(closeBtn){closeBtn.addEventListener('click', closeModalFn);}guideModal.addEventListener('click', function(e){if(e.target === guideModal){closeModalFn();}});

// simple fake submit
var leadForm = document.getElementById('leadForm');leadForm && leadForm.addEventListener('submit', function(e){e.preventDefault();var email = document.getElementById('leadEmail').value.trim();if(!email) return;try{localStorage.setItem('lead_email', email);}catch(err){}leadForm.querySelector('button').textContent = 'Sending...';setTimeout(function(){leadForm.querySelector('button').textContent = 'Sent — Check your inbox';setTimeout(closeModalFn,1200);},900);});

// small accessible enhancements
document.addEventListener('keydown', function(e){if(e.key === 'Escape'){if(guideModal.getAttribute('aria-hidden') === 'false'){closeModalFn();}}});
})();