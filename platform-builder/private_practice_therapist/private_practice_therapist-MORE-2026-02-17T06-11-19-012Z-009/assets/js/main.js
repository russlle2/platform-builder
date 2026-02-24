(function(){
  // Mobile menu toggle
  var toggle = document.querySelector('.mobile-toggle');
  var mobileMenu = document.getElementById('mobile-menu');
  if(toggle){
    toggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      if(expanded){
        mobileMenu.hidden = true;
      } else {
        mobileMenu.hidden = false;
      }
    });
  }

  // Mood-to-Method selector
  var moodButtons = document.querySelectorAll('.mood-option');
  var suggestionEl = document.getElementById('methodSuggestion');
  var primaryCta = document.getElementById('primaryCta');
  var finalCta = document.getElementById('finalCta');

  var methods = {
    overwhelmed: {
      title: 'Short planning session',
      desc: 'A focused 30-minute check-in to reduce immediate overwhelm, map priorities, and agree on a small next step.',
      cta: 'Book a 30-min check-in'
    },
    stuck: {
      title: 'Collaborative case review',
      desc: 'A series of three sessions to explore patterns keeping you stuck and design experiments to try between visits.',
      cta: 'Explore a short series'
    },
    anxious: {
      title: 'Stabilizing tools and practice',
      desc: 'Practical strategies we can try right away and a plan for paced practice to reduce anxiety’s hold on day-to-day living.',
      cta: 'Schedule a supportive visit'
    },
    exhausted: {
      title: 'Capacity-focused session',
      desc: 'A session oriented around restoration: boundaries, sleep/work rhythms, and small changes that protect energy.',
      cta: 'Arrange a restorative session'
    },
    curious: {
      title: 'Growth-focused consultation',
      desc: 'A conversation about your aims and how therapy can support gradual growth—tools, pacing, and measurable steps.',
      cta: 'Start with an exploratory visit'
    }
  };

  function clearActive(){
    moodButtons.forEach(function(b){b.classList.remove('active');b.setAttribute('aria-pressed','false');});
  }

  moodButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      var mood = btn.getAttribute('data-mood');
      if(!mood || !methods[mood]) return;
      clearActive();
      btn.classList.add('active');
      btn.setAttribute('aria-pressed','true');

      var m = methods[mood];
      suggestionEl.querySelector('.method-text').textContent = m.desc;

      // Update CTA text dynamically, preserving original link
      if(primaryCta) primaryCta.textContent = m.cta;
      if(finalCta) finalCta.textContent = m.cta;
    });

    btn.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        btn.click();
      }
    });
  });

  // Accordion behavior for session boundaries & confidentiality
  var accordions = document.querySelectorAll('.accordion-toggle');
  accordions.forEach(function(toggle){
    toggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      var panel = this.nextElementSibling;
      if(expanded){
        this.setAttribute('aria-expanded','false');
        panel.hidden = true;
      } else {
        this.setAttribute('aria-expanded','true');
        panel.hidden = false;
      }
    });
  });

  // Respectful progressive enhancement: if JS disabled, accordions remain visible
})();