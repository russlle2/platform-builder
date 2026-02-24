(function(){
  // Sound preference mixer
  const mixer = document.getElementById('mixer');
  const rec = document.getElementById('recommendations');
  const levels = {
    gentle: [
      {name:'Resting Wave — Gentle group',dur:'60 min',blurb:'Soft sustained tones and space for rest; ideal for first-timers.'},
      {name:'Slow-Breath Sequence — Intro',dur:'40 min',blurb:'Short session focusing on breath and low-frequency support.'}
    ],
    medium: [
      {name:'Harmonic Flow — Midline',dur:'75 min',blurb:'Layered textures with moderate dynamics to shift attention.'},
      {name:'Focused Resonance — Workshop',dur:'90 min',blurb:'A hands-on evening of live instruments and guided transitions.'}
    ],
    intense: [
      {name:'Deep Field — Immersive',dur:'90 min',blurb:'Richer amplitude and immersive layering for a transformative impact.'},
      {name:'Extended Drift — Intensive',dur:'120 min',blurb:'Long-form sound architecture intended for a deeper arc of change.'}
    ]
  };

  function renderRecommendations(level){
    const items = levels[level] || levels['gentle'];
    rec.innerHTML = '';
    items.forEach(it=>{
      const el = document.createElement('div');
      el.className = 'rec-item';
      el.style.padding = '8px 0';
      el.innerHTML = '<div style="font-weight:700">'+it.name+' <span style="color:var(--muted);font-weight:400">• '+it.dur+'</span></div><div style="color:var(--muted);font-size:0.95rem">'+it.blurb+'</div>';
      rec.appendChild(el);
    });
  }

  mixer.addEventListener('click', e=>{
    const b = e.target.closest('.mix-btn');
    if(!b) return;
    Array.from(mixer.querySelectorAll('.mix-btn')).forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const level = b.getAttribute('data-level');
    renderRecommendations(level);
  });

  // init
  renderRecommendations('gentle');

  // Proof Gallery: rotating testimonials + badges with tooltips
  const testimonials = [
    {name:'A.R.',role:'Teacher','quote':'The session felt like a slow resetting of my system. I left calmer and clearer.'},
    {name:'S.M.',role:'Therapist','quote':'Clients report deeper sleep after a single visit. Practical, grounded, and professional.'},
    {name:'T.K.',role:'Designer','quote':'Sound here is an architecture that invites rest without requiring effort.'}
  ];
  const testimonialsEl = document.getElementById('testimonials');
  let tIndex = 0;

  function showTestimonial(i){
    const t = testimonials[i];
    testimonialsEl.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'testimonial';
    el.innerHTML = '<div style="font-weight:700;margin-bottom:6px">"'+t.quote+'"</div><div style="color:var(--muted);font-size:0.9rem">— '+t.name+', '+t.role+'</div>';
    testimonialsEl.appendChild(el);
  }
  showTestimonial(0);
  setInterval(()=>{
    tIndex = (tIndex+1) % testimonials.length;
    // subtle fade transition
    testimonialsEl.querySelectorAll('.testimonial').forEach(node=>{node.style.opacity=0;node.style.transition='opacity 220ms'});
    setTimeout(()=>{showTestimonial(tIndex);},240);
  },5000);

  // badges tooltips: set up dynamic tip nodes
  const badges = document.getElementById('badges');
  if(badges){
    badges.querySelectorAll('.badge').forEach(b=>{
      const tipText = b.getAttribute('data-tip');
      const tip = document.createElement('div');
      tip.className = 'tip';
      tip.textContent = tipText;
      b.appendChild(tip);
      // simple touch support: tap toggles
      b.addEventListener('click', ()=>{
        tip.style.opacity = tip.style.opacity === '1' ? '0' : '1';
        setTimeout(()=>{tip.style.opacity='0'},3000);
      });
    });
  }

  // Accessibility: keyboard control for mixer
  mixer.querySelectorAll('.mix-btn').forEach(btn=>{
    btn.setAttribute('tabindex','0');
    btn.addEventListener('keydown', e=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault(); btn.click();
      }
    });
  });

})();
