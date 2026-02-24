(function(){
  // Mood-to-Method selector
  const moodSelect = document.getElementById('mood-select');
  const methodSummary = document.getElementById('method-summary');
  const primaryCta = document.getElementById('primary-cta');
  const footerCta = document.getElementById('footer-cta');

  const moodMap = {
    calm: {
      approach: 'Short inhalation practice + a gentle roll-on. Suggested safe oils: lavender, sweet orange (dilute). Patch test before use.',
      ctaLabel: 'Try Calm Circle',
      ctaUrl: (base)=> base + '?mood=calm'
    },
    focus: {
      approach: 'A brief scent pairing to support attention: citrus top note with a light herbal middle. Use in a diffuser for short bursts.',
      ctaLabel: 'Try Focus Circle',
      ctaUrl: (base)=> base + '?mood=focus'
    },
    sleep: {
      approach: 'A wind-down ritual: distilled water spritz with diluted base notes. Avoid direct skin use without dilution guidance.',
      ctaLabel: 'Try Sleep Circle',
      ctaUrl: (base)=> base + '?mood=sleep'
    },
    energy: {
      approach: 'Short, uplifting scent bursts. Limit diffuser sessions to 10–15 minutes and follow dilution guidance for topical blends.',
      ctaLabel: 'Try Energy Circle',
      ctaUrl: (base)=> base + '?mood=energy'
    },
    grounded: {
      approach: 'Low, warm base note practice paired with mindful breathing. Use smaller dilution and test for sensitivity, especially around pets.',
      ctaLabel: 'Try Grounded Circle',
      ctaUrl: (base)=> base + '?mood=grounded'
    }
  };

  function updateForMood(mood){
    const info = moodMap[mood] || moodMap['calm'];
    methodSummary.textContent = info.approach;
    const baseLabel = primaryCta.getAttribute('data-base-label') || primaryCta.textContent;
    const baseUrl = primaryCta.getAttribute('data-base-url') || primaryCta.getAttribute('href') || '#';
    primaryCta.textContent = info.ctaLabel;
    primaryCta.setAttribute('aria-label', info.ctaLabel + ' — ' + info.approach);
    primaryCta.setAttribute('data-target-url', info.ctaUrl(baseUrl));
    footerCta.textContent = info.ctaLabel;
    footerCta.href = info.ctaUrl(baseUrl);
  }

  moodSelect.addEventListener('change', function(e){
    updateForMood(e.target.value);
  });

  primaryCta.addEventListener('click', function(e){
    const url = primaryCta.getAttribute('data-target-url') || primaryCta.getAttribute('data-base-url') || primaryCta.getAttribute('href');
    if(url){
      // emulate navigation; allow hosting layer to handle actual path
      window.location.href = url;
    }
  });

  // Aroma wheel interactions
  const wheel = document.getElementById('scent-wheel');
  const noteDetail = document.getElementById('note-detail');
  const infoMain = document.querySelector('.info-main');

  const notes = {
    bergamot: {title: 'Bergamot (top)', desc: 'Bright citrus top note that may support a lighter mood. Use diluted. Avoid sun exposure after topical application.'},
    litsea: {title: 'Litsea (top)', desc: 'Crisp, lemon-like top note often used in tiny amounts; dilute before skin contact.'},
    lavender: {title: 'Lavender (middle)', desc: 'A gentle floral middle note commonly used for short inhalation practices; safe dilution advised.'},
    geranium: {title: 'Geranium (middle)', desc: 'Green-floral middle note; may support emotional balance. Perform patch test prior to topical use.'},
    patchouli: {title: 'Patchouli (base)', desc: 'Earthy base note used in small concentrations; consider pet sensitivity and dilute responsibly.'},
    vetiver: {title: 'Vetiver (base)', desc: 'Smoky-earth base note that provides grounding quality. Use minimal topical dilution and avoid around infants.'}
  };

  wheel.querySelectorAll('.hotspot').forEach(function(dot){
    dot.addEventListener('mouseenter', showNote);
    dot.addEventListener('focus', showNote);
    dot.addEventListener('mouseleave', clearNote);
    dot.addEventListener('blur', clearNote);

    function showNote(e){
      const id = dot.getAttribute('data-note');
      const tier = dot.getAttribute('data-tier');
      const n = notes[id];
      if(n){
        noteDetail.querySelector('.note-title').textContent = n.title;
        noteDetail.querySelector('.note-desc').textContent = n.desc;
      }
    }

    function clearNote(){
      noteDetail.querySelector('.note-title').textContent = tierLabel('top');
      noteDetail.querySelector('.note-desc').textContent = 'Hover or focus a dot to read a short description. All use-and-dilution notes appear in FAQs.';
    }
  });

  function tierLabel(t){
    return t === 'top' ? 'Top notes' : t === 'middle' ? 'Middle notes' : 'Base notes';
  }

  // Initialize
  document.getElementById('year').textContent = new Date().getFullYear();
  updateForMood(moodSelect.value || 'calm');

})();