// Interactive aroma wheel and proof gallery
(function(){
  // Aroma wheel interactions
  const wheel = document.getElementById('aroma-wheel');
  const noteTitle = document.getElementById('note-title');
  const noteDesc = document.getElementById('note-desc');
  const slices = document.querySelectorAll('.slice');
  const buttons = document.querySelectorAll('.note-btn');

  const notes = {
    top: {
      title: 'Top notes — first impression',
      desc: 'Bright, volatile notes (citrus, light herbs). They appear quickly and may support an initial uplift or clarity.'
    },
    middle: {
      title: 'Heart notes — emotive center',
      desc: 'Warm, floral or spicy notes (lavender, geranium, clove) that form the character of a blend and may support steadiness.'
    },
    base: {
      title: 'Base notes — anchoring',
      desc: 'Deep, long-lasting notes (wood, resin) that linger and may support grounding and prolonged presence.'
    }
  };

  function showNote(kind){
    const n = notes[kind];
    if(!n) return;
    noteTitle.textContent = n.title;
    noteDesc.textContent = n.desc;
    // highlight svg slice
    slices.forEach(s=>s.style.opacity = s.id===kind? '1' : '0.65');
  }

  slices.forEach(s=>{
    s.addEventListener('mouseenter', ()=> showNote(s.id));
    s.addEventListener('mouseleave', ()=>{
      noteTitle.textContent = 'Hover a slice';
      noteDesc.textContent = 'Top: bright, fleeting; Heart: warm and emotive; Base: grounding and lingering.';
      slices.forEach(x=>x.style.opacity='1');
    });
  });

  buttons.forEach(b=>{
    b.addEventListener('mouseenter', ()=> showNote(b.dataset.tier));
    b.addEventListener('mouseleave', ()=>{
      noteTitle.textContent = 'Hover a slice';
      noteDesc.textContent = 'Top: bright, fleeting; Heart: warm and emotive; Base: grounding and lingering.';
    });
    b.addEventListener('click', ()=> showNote(b.dataset.tier));
  });

  // Proof gallery rotation
  const items = document.querySelectorAll('.testimonial');
  let idx = 0;
  let interval = null;
  const nextBtn = document.getElementById('next');
  const prevBtn = document.getElementById('prev');

  function showIndex(i){
    items.forEach(it=>it.classList.remove('active'));
    idx = (i + items.length) % items.length;
    items[idx].classList.add('active');
  }
  function startRotation(){
    stopRotation();
    interval = setInterval(()=> showIndex(idx+1), 5000);
  }
  function stopRotation(){ if(interval) clearInterval(interval); }

  nextBtn.addEventListener('click', ()=>{ showIndex(idx+1); startRotation(); });
  prevBtn.addEventListener('click', ()=>{ showIndex(idx-1); startRotation(); });

  document.getElementById('testimonials').addEventListener('mouseenter', stopRotation);
  document.getElementById('testimonials').addEventListener('mouseleave', startRotation);

  startRotation();

  // Badge tooltips
  let tooltipEl = null;
  function showTooltip(target, text){
    hideTooltip();
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'tooltip';
    tooltipEl.textContent = text;
    document.body.appendChild(tooltipEl);
    const r = target.getBoundingClientRect();
    const top = window.scrollY + r.top - tooltipEl.offsetHeight - 8;
    const left = window.scrollX + r.left + (r.width/2) - (tooltipEl.offsetWidth/2);
    tooltipEl.style.top = (top>4? top : (window.scrollY + r.bottom + 8)) + 'px';
    tooltipEl.style.left = (Math.max(left,8)) + 'px';
  }
  function hideTooltip(){ if(tooltipEl){ tooltipEl.remove(); tooltipEl=null; } }

  document.querySelectorAll('.badge').forEach(b=>{
    b.addEventListener('mouseenter', (e)=> showTooltip(e.currentTarget, e.currentTarget.dataset.tooltip || 'Verified'));
    b.addEventListener('mouseleave', hideTooltip);
  });

  // Mobile nav toggle
  const navToggle = document.getElementById('nav-toggle');
  navToggle && navToggle.addEventListener('click', ()=>{
    const menu = document.querySelector('.menu');
    if(menu.style.display === 'flex') menu.style.display = 'none'; else menu.style.display = 'flex';
  });

})();
