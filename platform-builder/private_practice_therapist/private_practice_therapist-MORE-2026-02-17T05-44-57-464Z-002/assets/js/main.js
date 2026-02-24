(function(){
  // Utilities
  function qs(sel, ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Year in footer
  qs('#year').textContent = new Date().getFullYear();

  // Modal logic
  var modal = qs('#try-modal');
  var openBtns = [qs('#open-try'), qs('#open-try-cta')].filter(Boolean);
  var closeBtn = qs('#close-try');
  var body = document.body;

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    body.style.overflow='hidden';
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    body.style.overflow='';
    stopBreathing();
  }

  openBtns.forEach(function(b){b.addEventListener('click',openModal)});
  if(closeBtn) closeBtn.addEventListener('click',closeModal);
  modal.addEventListener('click', function(e){ if(e.target===modal) closeModal(); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeModal(); });

  // Tabs inside modal
  var tabs = qsa('.try-tabs button');
  var views = qsa('.try-views .view');
  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      tabs.forEach(function(t){t.classList.remove('active')});
      tab.classList.add('active');
      var mode = tab.getAttribute('data-mode');
      views.forEach(function(v){
        if(v.getAttribute('data-mode')===mode){ v.removeAttribute('hidden'); } else { v.setAttribute('hidden',''); }
      });
    });
  });

  // Breathing exercise
  var startBtn = qs('#start-breath');
  var stopBtn = qs('#stop-breath');
  var breathVisual = qs('#breath-visual');
  var breathInterval = null;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function breatheCycle(){
    // Expand then hold then contract using classes
    body.classList.add('breathing');
    setTimeout(function(){ body.classList.remove('breathing'); }, 12000); // full cycle length
  }
  function startBreathing(){
    if(reduced){ // if reduced motion, provide silent textual cues
      alert('Breathing practice started. Inhale 4, hold 2, exhale 6. Repeat a few times.');
      return;
    }
    breatheCycle();
    breathInterval = setInterval(breatheCycle, 12000);
    startBtn.disabled = true; stopBtn.disabled = false;
  }
  function stopBreathing(){
    if(breathInterval) { clearInterval(breathInterval); breathInterval=null; }
    body.classList.remove('breathing');
    startBtn.disabled = false; stopBtn.disabled = true;
  }

  if(startBtn) startBtn.addEventListener('click', startBreathing);
  if(stopBtn) stopBtn.addEventListener('click', stopBreathing);

  // Journaling save
  var saveJournal = qs('#save-journal');
  var clearJournal = qs('#clear-journal');
  var journalText = qs('#journal-text');
  function journalKey(){ return 'private_therapist_journal_v1'; }
  if(journalText){
    journalText.value = localStorage.getItem(journalKey()) || '';
  }
  if(saveJournal) saveJournal.addEventListener('click', function(){
    localStorage.setItem(journalKey(), journalText.value || '');
    saveJournal.textContent = 'Saved';
    setTimeout(function(){ saveJournal.textContent = 'Save'; },1500);
  });
  if(clearJournal) clearJournal.addEventListener('click', function(){
    journalText.value=''; localStorage.removeItem(journalKey());
  });

  // Intention save
  var saveIntention = qs('#save-intention');
  var clearIntention = qs('#clear-intention');
  var intentionText = qs('#intention-text');
  function intentionKey(){ return 'private_therapist_intention_v1'; }
  if(intentionText){ intentionText.value = localStorage.getItem(intentionKey()) || ''; }
  if(saveIntention) saveIntention.addEventListener('click', function(){
    localStorage.setItem(intentionKey(), intentionText.value || '');
    saveIntention.textContent = 'Saved';
    setTimeout(function(){ saveIntention.textContent = 'Save intention'; },1200);
  });
  if(clearIntention) clearIntention.addEventListener('click', function(){ intentionText.value=''; localStorage.removeItem(intentionKey()); });

  // Simple menu toggle for small screens
  var menuToggle = qs('.menu-toggle');
  var mainNav = qs('.main-nav');
  if(menuToggle && mainNav){
    menuToggle.addEventListener('click', function(){
      var open = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!open));
      mainNav.style.display = open ? 'none' : 'flex';
    });
  }

  // Scroll reveal with prefers-reduced-motion support
  var revealEls = qsa('.reveal');
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(prefersReduced){
    revealEls.forEach(function(el){ el.classList.add('visible'); });
  } else if('IntersectionObserver' in window){
    var ro = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){ entry.target.classList.add('visible'); ro.unobserve(entry.target); }
      });
    },{root:null,threshold:0.12});
    revealEls.forEach(function(el){ ro.observe(el); });
  } else {
    // fallback: reveal all
    revealEls.forEach(function(el){ el.classList.add('visible'); });
  }

})();