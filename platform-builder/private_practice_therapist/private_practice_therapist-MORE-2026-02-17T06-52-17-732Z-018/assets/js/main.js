(function(){
  // Mood-to-Method selector
  var moods = document.querySelectorAll('.mood');
  var title = document.querySelector('.method-title');
  var copy = document.querySelector('.method-copy');
  var cta = document.getElementById('primaryCta');
  var ctaFooter = document.getElementById('primaryCtaFooter');

  var methods = {
    stabilize: {
      title: 'Stabilizing support and practical planning',
      copy: 'Short-term focus on reducing immediate overwhelm and creating a manageable daily plan. Sessions prioritize safety, pacing, and small steps you can try between meetings.',
      cta: 'Book a stabilizing consult',
      href: '{{PRIMARY_CTA_URL}}?plan=stabilize'
    },
    explore: {
      title: 'Exploratory sessions for clarity',
      copy: 'Gentle exploration to understand patterns and options. This format uses reflective clinical inquiry to help you notice what matters and where to allocate energy.',
      cta: 'Start an exploratory consult',
      href: '{{PRIMARY_CTA_URL}}?plan=explore'
    },
    plan: {
      title: 'Action-oriented planning and steps',
      copy: 'Structured sessions for people ready to try concrete changes. We co-design experiments and measurable steps while keeping scope and limits clear.',
      cta: 'Schedule a planning consult',
      href: '{{PRIMARY_CTA_URL}}?plan=plan'
    },
    repair: {
      title: 'Repair and rebuilding with steady pacing',
      copy: 'A slower cadence to support recovery and integration. Sessions focus on resources, boundary-setting, and pacing to prevent re-traumatization.',
      cta: 'Arrange a repair series',
      href: '{{PRIMARY_CTA_URL}}?plan=repair'
    }
  };

  function setActive(el){
    moods.forEach(function(m){m.setAttribute('aria-pressed','false');});
    el.setAttribute('aria-pressed','true');
  }

  moods.forEach(function(btn){
    btn.addEventListener('click', function(){
      var key = btn.getAttribute('data-method');
      var m = methods[key];
      if(!m) return;
      setActive(btn);
      // update content
      if(title) title.textContent = m.title;
      if(copy) copy.textContent = m.copy;
      if(cta){ cta.textContent = m.cta; cta.setAttribute('href', m.href); }
      if(ctaFooter){ ctaFooter.textContent = m.cta; ctaFooter.setAttribute('href', m.href); }
      // subtle animation
      document.querySelector('.hero-mood').classList.remove('pulse');
      void document.querySelector('.hero-mood').offsetWidth;
      document.querySelector('.hero-mood').classList.add('pulse');
    });
  });

  // Minimal accordion behavior
  var accToggles = document.querySelectorAll('.acc-toggle');
  accToggles.forEach(function(t){
    t.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      var panel = this.nextElementSibling;
      if(!panel) return;
      if(expanded){ panel.style.display = 'none'; }
      else { panel.style.display = 'block'; }
    });
  });

  // Mobile nav toggle
  var mobileBtn = document.querySelector('.mobile-toggle');
  var nav = document.querySelector('.main-nav');
  if(mobileBtn && nav){
    mobileBtn.addEventListener('click', function(){
      var open = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!open));
      nav.style.display = open ? 'none' : 'flex';
    });
  }

})();