(function(){
  // Pricing comparator
  const priceSwitch = document.getElementById('price-switch');
  const priceNums = Array.from(document.querySelectorAll('.price-num'));
  const priceTermEls = Array.from(document.querySelectorAll('.price-term'));

  function animateValue(el, start, end, duration){
    const startTime = performance.now();
    const step = (now)=>{
      const t = Math.min(1, (now - startTime)/duration);
      const val = Math.round(start + (end - start) * t);
      el.textContent = '$' + val;
      if(t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function updatePrices(usePackage){
    priceNums.forEach((el)=>{
      const monthly = parseInt(el.getAttribute('data-monthly'),10);
      const pack = parseInt(el.getAttribute('data-package'),10);
      const term = usePackage ? ' package' : '/mo';
      const from = parseInt(el.textContent.replace(/[^0-9]/g,''),10) || (usePackage ? monthly : pack);
      const to = usePackage ? pack : monthly;
      animateValue(el, from, to, 450);
      // update small term
      const termEl = el.parentElement.querySelector('.price-term');
      if(termEl) termEl.textContent = usePackage ? '' : '/mo';
    });
  }

  if(priceSwitch){
    priceSwitch.addEventListener('change', function(){
      updatePrices(this.checked);
    });
    // Initialize to monthly (unchecked)
    updatePrices(priceSwitch.checked);
  }

  // Mood-to-Method selector
  const moodButtons = Array.from(document.querySelectorAll('button.mood'));
  const methodTitle = document.getElementById('method-title');
  const methodDesc = document.getElementById('method-desc');
  const methodNotes = document.getElementById('method-notes');
  const methodCta = document.getElementById('method-cta');
  const heroCta = document.getElementById('hero-cta');

  const moodMap = {
    calm: {
      title: 'Short unwind ritual',
      desc: 'A focused 5-minute breathing and scent pairing. Use one diluted roll-on or a single drop on a tissue. Patch-test first. Keep away from pets unless you have guidance.',
      ctaLabel: 'Try a brief unwind',
      ctaHref: '{{PRIMARY_CTA_URL}}?intent=unwind'
    },
    focus: {
      title: 'Intent focus method',
      desc: 'A clarifying sniff-and-scribe practice. Use a clean inhaler or jar technique; limit direct skin application and note dilution recommendations.',
      ctaLabel: 'Start a focus ritual',
      ctaHref: '{{PRIMARY_CTA_URL}}?intent=focus'
    },
    sleep: {
      title: 'Evening cue routine',
      desc: 'A calming bedside cue with a lightly-diluted spritz on a cloth. Patch-test and avoid direct inhalation by infants or pets.',
      ctaLabel: 'Begin a bedtime cue',
      ctaHref: '{{PRIMARY_CTA_URL}}?intent=sleep'
    },
    energy: {
      title: 'Brighten micro-ritual',
      desc: 'A short energizing sniff with a citrus-forward touch. Keep blends low-concentration and test for skin sensitivity.',
      ctaLabel: 'Try an energy pick-up',
      ctaHref: '{{PRIMARY_CTA_URL}}?intent=energy'
    }
  };

  function clearSelected(){
    moodButtons.forEach(b=>b.classList.remove('active'));
  }

  function applyMood(key, btn){
    const data = moodMap[key];
    if(!data) return;
    clearSelected();
    if(btn) btn.classList.add('active');
    // subtle morph animation
    methodTitle.style.transform = 'translateY(6px)';
    methodTitle.style.opacity = '0';
    methodDesc.style.transform = 'translateY(6px)';
    methodDesc.style.opacity = '0';
    setTimeout(()=>{
      methodTitle.textContent = data.title;
      methodDesc.textContent = data.desc;
      // notes updated
      methodNotes.innerHTML = '<li>Suggested dilution: 1–3% for topical use (patch-test first).</li><li>Avoid near pets and small children unless cleared.</li><li>Pregnant or nursing? Check with a specialist before use.</li>';
      methodCta.textContent = data.ctaLabel;
      methodCta.href = data.ctaHref;
      // tweak hero CTA to feel contextual
      if(heroCta){
        heroCta.textContent = data.ctaLabel;
        heroCta.href = data.ctaHref;
      }
      methodTitle.style.transform = 'translateY(0)';
      methodTitle.style.opacity = '1';
      methodDesc.style.transform = 'translateY(0)';
      methodDesc.style.opacity = '1';
    },140);
  }

  moodButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.getAttribute('data-mood');
      applyMood(key, btn);
    });
  });

  // Accessibility: keyboard select
  moodButtons.forEach(btn=>{
    btn.addEventListener('keydown', (e)=>{
      if(e.key==='Enter' || e.key===' '){
        e.preventDefault();
        btn.click();
      }
    });
  });

  // Small enhancement: remember last selection in session
  const last = sessionStorage.getItem('lastMood');
  if(last && moodMap[last]){
    const btn = moodButtons.find(b=>b.getAttribute('data-mood')===last);
    applyMood(last, btn);
  }
  moodButtons.forEach(btn=>btn.addEventListener('click', ()=>sessionStorage.setItem('lastMood', btn.getAttribute('data-mood'))));
})();