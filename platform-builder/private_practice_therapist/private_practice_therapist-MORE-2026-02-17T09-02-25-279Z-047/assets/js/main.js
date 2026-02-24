(function(){
  // Mood-to-Method selector
  var moodMap = {
    overwhelmed: {
      title: 'Stability Planning',
      desc: 'Short sequence to reduce reactivity, create immediate safety plans, and set reachable next steps.',
      cta: 'Request a Stability Session',
      urlSuffix: '#stability'
    },
    stuck: {
      title: 'Focused Exploration',
      desc: 'Targeted sessions to unpack what blocks movement and rehearse alternative responses.',
      cta: 'Start Focused Exploration',
      urlSuffix: '#explore'
    },
    numb: {
      title: 'Mindful Reset',
      desc: 'Gentle pacing to re-engage sensation, values, and small behavioral experiments.',
      cta: 'Try a Mindful Reset',
      urlSuffix: '#reset'
    },
    anxious: {
      title: 'Containment Session',
      desc: 'Practical tools for managing anxiety in the short term and mapping triggers over time.',
      cta: 'Book a Containment Session',
      urlSuffix: '#contain'
    },
    sad: {
      title: 'Companion Track',
      desc: 'Support for low mood with emphasis on pacing, activation, and compassionate reflection.',
      cta: 'Begin Companion Track',
      urlSuffix: '#companion'
    },
    curious: {
      title: 'Starter Track',
      desc: 'A focused intake and planning phase to clarify goals and the best match of work.',
      cta: 'Schedule an Intake',
      urlSuffix: '#intake'
    }
  };

  function $(sel){return document.querySelector(sel)}
  function $all(sel){return Array.prototype.slice.call(document.querySelectorAll(sel))}

  var moodBtns = $all('.mood-btn');
  var titleEl = $('#method-title');
  var descEl = $('#method-desc');
  var ctaEl = $('#primary-cta');

  moodBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      var mood = btn.getAttribute('data-mood');
      var info = moodMap[mood];
      if(!info) return;
      titleEl.textContent = info.title;
      descEl.textContent = info.desc;
      // update CTA text but preserve base url if provided
      var baseUrl = ctaEl.getAttribute('data-base') || ctaEl.getAttribute('href') || '#';
      ctaEl.textContent = info.cta;
      // attempt to set a friendly hash so forms can prefill if needed
      ctaEl.setAttribute('href', (baseUrl.split('#')[0] || baseUrl) + info.urlSuffix);

      // highlight selected
      moodBtns.forEach(function(b){b.classList.remove('active')});
      btn.classList.add('active');
    });
  });

  // Accessibility: set data-base to preserve original
  (function(){ if(ctaEl) ctaEl.setAttribute('data-base', ctaEl.getAttribute('href') || '#'); })();

  // Accordion for confidentiality/session boundaries (multiple instances)
  var accs = $all('[data-accordion]');
  accs.forEach(function(root){
    var btn = root.querySelector('.accordion-toggle');
    var panel = root.querySelector('.accordion-panel');
    if(!btn || !panel) return;
    btn.addEventListener('click', function(){
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      if(expanded){ panel.hidden = true; }
      else{ panel.hidden = false; panel.focus(); }
    });
  });

  // Footer year
  var y = new Date().getFullYear();
  var yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = y;

  // Respectful crisis footer: ensure visible on critical panels
  var crisisLines = document.querySelectorAll('.muted');
  crisisLines.forEach(function(el){
    // no-op but ensures code touches them for future enhancements
    el.setAttribute('data-safe','true');
  });

})();
