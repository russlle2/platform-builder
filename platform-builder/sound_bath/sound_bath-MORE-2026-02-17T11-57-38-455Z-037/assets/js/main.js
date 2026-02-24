(function(){
  // Mixer: swap recommendations depending on selected intensity
  const recs = {
    gentle: [
      {title: 'Restorative Drift', desc: 'Long tones, soft breath cues, 45 minutes — ideal for deep unwinding.'},
      {title: 'Evening Ease', desc: 'Shorter laying-in sequence with warm overtones.'}
    ],
    medium: [
      {title: 'Balance Session', desc: 'Moderate resonance with pacing to open circulation and calm the mind.'},
      {title: 'Community Flow', desc: 'Shared space with guided pauses and layered instruments.'}
    ],
    intense: [
      {title: 'Release Wave', desc: 'Higher dynamic range, rhythmic anchors to assist strong release.'},
      {title: 'Deep Tuning', desc: 'Extended harmonic series for embodied reckonings.'}
    ]
  };

  function renderRecommendations(level){
    const container = document.getElementById('recommendations');
    container.innerHTML = '';
    (recs[level] || []).forEach(r => {
      const el = document.createElement('div');
      el.className = 'rec-card';
      el.innerHTML = "<strong>"+r.title+"</strong><div class='muted'>"+r.desc+"</div>";
      container.appendChild(el);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    // Setup mixer buttons
    const buttons = Array.from(document.querySelectorAll('.mixer-btn'));
    buttons.forEach(btn => {
      btn.addEventListener('click', function(){
        buttons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
        btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
        renderRecommendations(btn.dataset.level);
      });
    });
    // initial
    const active = document.querySelector('.mixer-btn.active');
    renderRecommendations(active ? active.dataset.level : 'gentle');

    // Testimonials rotation + badges tooltip
    const testimonials = [
      {text: 'Leaving here felt like settling into a chair I did not know I owned.', author: '— L.M.'},
      {text: 'A rigorous kindness: the sound choices supported me through a hard evening.', author: '— A.R.'},
      {text: 'I slept better for three nights after this session.', author: '— S.K.'}
    ];
    const testContainer = document.getElementById('testimonials');
    let idx = 0;

    function showTest(i){
      testContainer.innerHTML = '';
      const t = document.createElement('div'); t.className='testimonial'; t.textContent = testimonials[i].text;
      const a = document.createElement('div'); a.className='test-author'; a.textContent = testimonials[i].author;
      testContainer.appendChild(t); testContainer.appendChild(a);
    }
    showTest(idx);
    setInterval(()=>{
      idx = (idx+1) % testimonials.length; showTest(idx);
    },4000);

    // Badge tooltips
    const tip = document.createElement('div'); tip.className='tooltip'; document.body.appendChild(tip);
    document.querySelectorAll('.badge').forEach(b => {
      b.addEventListener('mouseenter', e => {
        tip.style.display = 'block'; tip.textContent = b.dataset.tip || '';
        const rect = b.getBoundingClientRect();
        tip.style.left = (rect.right + 10) + 'px';
        tip.style.top = (rect.top) + 'px';
      });
      b.addEventListener('mouseleave', ()=>{ tip.style.display='none'; });
    });

    // Simple next-event logic: update if in the future (placeholder)
    // Could be wired to events page data in future
    const nextEl = document.getElementById('next-event');
    if(nextEl && nextEl.textContent.trim() === ''){ nextEl.textContent = 'No upcoming dates'; }

    // Accessibility: allow keyboard toggling of mixer
    document.querySelectorAll('.mixer-btn').forEach(b=>{
      b.addEventListener('keydown', e=>{
        if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){
          e.preventDefault(); const next = b.nextElementSibling || document.querySelector('.mixer-btn'); next.click(); next.focus();
        }
        if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){
          e.preventDefault(); const prev = b.previousElementSibling || document.querySelector('.mixer-btn:last-child'); prev.click(); prev.focus();
        }
      });
    });
  });
})();