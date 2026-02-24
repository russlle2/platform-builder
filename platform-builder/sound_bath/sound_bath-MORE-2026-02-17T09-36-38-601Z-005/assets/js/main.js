(function(){
  // Sound preference mixer logic
  const programs = {
    gentle: [
      {title:'Soft Tone Intro — 40 min',desc:'Slow quartz bowls, guided breath cues. Suited to early restorative practice.'},
      {title:'Lull Sequence — 20 min',desc:'Short session for immediate downshift and sleep prep.'},
      {title:'One-on-one Ease',desc:'Private session with calming focus and lower volume.'}
    ],
    medium: [
      {title:'Balanced Circle — 60 min',desc:'Full group sound environment with layered bowls and chimes.'},
      {title:'Midday Reset — 30 min',desc:'A compact field to refocus and ease tension.'},
      {title:'Small-Series Flow (4)',desc:'Four-week sequence building a foundation.'}
    ],
    intense: [
      {title:'Resonant Deep — 75 min',desc:'Denser harmonic layering for active release and catharsis.'},
      {title:'Focused Tone Immersion — 45 min',desc:'Longer sustain and rich overtones; expect deeper somatic shifts.'},
      {title:'Private Deep Work',desc:'Extended private format for concentrated goals.'}
    ]
  };

  const mixBtns = document.querySelectorAll('.mix-btn');
  const programList = document.getElementById('program-list');
  const intensityNote = document.getElementById('intensity-note');

  function renderPrograms(level){
    programList.innerHTML = '';
    programs[level].forEach(p=>{
      const li = document.createElement('li');
      li.innerHTML = '<strong>'+p.title+'</strong><div class="muted">'+p.desc+'</div>';
      programList.appendChild(li);
    });
    const notes = {
      gentle:'Lower volume, more supportive cues — great for sensitivity.',
      medium:'Balanced layering and pacing recommended for most participants.',
      intense:'Higher energy and denser harmonics; not for those avoiding strong stimulation.'
    };
    intensityNote.textContent = notes[level];
  }

  mixBtns.forEach(btn=>{
    btn.addEventListener('click',function(){
      mixBtns.forEach(b=>b.classList.remove('active'));
      this.classList.add('active');
      const level = this.getAttribute('data-level');
      renderPrograms(level);
    });
  });

  // Initialize default
  renderPrograms('medium');

  // Proof gallery: rotating testimonials + badges with tooltips
  const testimonials = [
    {text:'I left feeling lighter and safer in my body. The leader explained things clearly.',author:'— Maya'},
    {text:'Consistent, practical sessions that actually fit into my week.',author:'— Devin'},
    {text:'The studio felt calm and well-managed; I appreciated the safety focus.',author:'— Priya'}
  ];
  let current = 0;
  const tText = document.getElementById('testimonial-text');
  const tAuthor = document.getElementById('testimonial-author');
  const prevBtn = document.getElementById('prev-t');
  const nextBtn = document.getElementById('next-t');

  function showTest(i){
    const t = testimonials[i%testimonials.length];
    tText.textContent = '"'+t.text+'"';
    tAuthor.textContent = t.author;
  }
  showTest(0);
  let rot = setInterval(()=>{ current=(current+1)%testimonials.length; showTest(current); },5000);

  nextBtn.addEventListener('click',()=>{ clearInterval(rot); current=(current+1)%testimonials.length; showTest(current); rot=setInterval(()=>{ current=(current+1)%testimonials.length; showTest(current); },5000); });
  prevBtn.addEventListener('click',()=>{ clearInterval(rot); current=(current-1+testimonials.length)%testimonials.length; showTest(current); rot=setInterval(()=>{ current=(current+1)%testimonials.length; showTest(current); },5000); });

  // Badges tooltip behavior
  const badgesEl = document.getElementById('badges');
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  document.body.appendChild(tooltip);

  badgesEl.querySelectorAll('.badge').forEach(b=>{
    b.addEventListener('mouseenter',(e)=>{
      tooltip.textContent = b.getAttribute('data-tip');
      const r = b.getBoundingClientRect();
      tooltip.style.left = (r.left + window.scrollX) + 'px';
      tooltip.style.top = (r.top + window.scrollY - 40) + 'px';
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateY(0)';
    });
    b.addEventListener('mouseleave',()=>{
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translateY(6px)';
    });
  });

  // Accessibility: hide tooltip on scroll to avoid stuck state
  window.addEventListener('scroll',()=>{ tooltip.style.opacity='0'; tooltip.style.transform='translateY(6px)'; });

})();