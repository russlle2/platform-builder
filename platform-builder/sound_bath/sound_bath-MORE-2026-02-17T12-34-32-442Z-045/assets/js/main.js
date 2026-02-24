(function(){
  // Small local state for demo
  let availableSeats = 12;
  const seatInput = document.getElementById('seat-count');
  const seatsAvailableEl = document.getElementById('seats-available');
  const seatIncrease = document.getElementById('seat-increase');
  const seatDecrease = document.getElementById('seat-decrease');
  const reserveBtn = document.getElementById('reserve-btn');

  function updateSeatsText(){
    seatsAvailableEl.textContent = availableSeats + ' seats left';
  }

  if(seatIncrease){
    seatIncrease.addEventListener('click', function(){
      let val = parseInt(seatInput.value,10)||1;
      if(val < 12) val++;
      seatInput.value = val;
    });
  }
  if(seatDecrease){
    seatDecrease.addEventListener('click', function(){
      let val = parseInt(seatInput.value,10)||1;
      if(val > 1) val--;
      seatInput.value = val;
    });
  }

  if(reserveBtn){
    reserveBtn.addEventListener('click', function(e){
      e.preventDefault();
      let want = parseInt(seatInput.value,10) || 1;
      if(want > availableSeats){
        alert('Sorry, not that many seats are available. Pick fewer seats.');
        return;
      }
      // fake reserve: reduce local available seats
      availableSeats -= want;
      updateSeatsText();
      reserveBtn.textContent = 'Reserved locally';
      reserveBtn.disabled = true;
      setTimeout(()=>{reserveBtn.textContent = 'Reserve (local)'; reserveBtn.disabled = false;}, 2500);
    });
  }

  // Packing list generator
  const packingForm = document.getElementById('packing-form');
  const packOutput = document.getElementById('pack-output');
  const suggestedBtn = document.getElementById('suggested-pack');

  const mapSuggestions = {
    'blanket': 'A warm blanket or cozy layers — rooms can cool as you settle.',
    'mat': 'A supportive mat or foldable cushion for comfort during the session.',
    'pillow': 'A small neck pillow or rolled sweater for extra support.',
    'mask': 'An eye covering to help your attention turn inward.',
    'water': 'A bottle of water to stay hydrated after the session.',
    'notes': 'A tiny notebook and pen to capture insights or intentions.'
  };

  function generateList(values){
    if(!values.length){
      return [
        'If you want a quick kit: blanket + water + eye covering.',
        'Wear comfortable layers and bring anything you use to rest (socks, sweater).'
      ];
    }
    return values.map(v => mapSuggestions[v] || 'A small comfort item.');
  }

  if(packingForm){
    packingForm.addEventListener('submit', function(e){
      e.preventDefault();
      const checked = Array.from(packingForm.querySelectorAll('input[name="item"]:checked')).map(i=>i.value);
      const list = generateList(checked);
      packOutput.innerHTML = '<ul>' + list.map(it => '<li>' + it + '</li>').join('') + '</ul>';
    });
  }
  if(suggestedBtn){
    suggestedBtn.addEventListener('click', function(e){
      e.preventDefault();
      const quick = generateList(['blanket','water','mask']);
      packOutput.innerHTML = '<ul>' + quick.map(it=>'<li>'+it+'</li>').join('') + '</ul>';
    });
  }

  // Try-it guided practice modal
  const tryBtn = document.getElementById('try-it-btn');
  const modal = document.getElementById('exercise-modal');
  const modalClose = document.getElementById('modal-close');
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = Array.from(document.querySelectorAll('.panel'));

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    // focus first actionable
    setTimeout(()=>document.getElementById('start-breath').focus(),80);
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }
  if(tryBtn) tryBtn.addEventListener('click', openModal);
  if(modalClose) modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if(e.target === modal) closeModal(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeModal(); });

  tabs.forEach(t => t.addEventListener('click', function(){
    tabs.forEach(x=>x.classList.remove('active')); t.classList.add('active');
    const id = t.getAttribute('data-tab');
    panels.forEach(p=>{ if(p.id === 'panel-'+id) p.classList.add('active'); else p.classList.remove('active'); });
  }));

  // Breathing guidance
  const breathInstruction = document.getElementById('breath-instruction');
  const breathVisual = document.getElementById('breath-visual');
  let breathTimer = null;
  let breathRunning = false;
  // build visual element
  const circle = document.createElement('div'); circle.className='breath-circle'; breathVisual.appendChild(circle);

  function setBreathText(t){ breathInstruction.textContent = t; }

  function startBreathing(){
    if(breathRunning) return; breathRunning = true;
    let cycle = 0; // seconds into cycle
    const phases = [
      {text:'Breathe in', length:4},
      {text:'Hold', length:4},
      {text:'Breathe out', length:6}
    ];
    let phaseIndex = 0; let phaseRemain = phases[0].length;
    setBreathText(phases[0].text + ' — ' + phaseRemain + 's');
    // visual scale animation via JS
    circle.style.transition = 'transform 800ms ease-in-out, opacity 400ms ease';
    breathTimer = setInterval(()=>{
      phaseRemain--;
      if(phaseRemain <= 0){
        phaseIndex = (phaseIndex+1) % phases.length;
        phaseRemain = phases[phaseIndex].length;
      }
      const phase = phases[phaseIndex];
      setBreathText(phase.text + ' — ' + phaseRemain + 's');
      // scale the circle: in -> big, hold -> medium, out -> small
      if(phase.text === 'Breathe in'){
        circle.style.transform = 'scale(1.4)'; circle.style.opacity=1;
      } else if(phase.text === 'Hold'){
        circle.style.transform = 'scale(1.1)'; circle.style.opacity=0.9;
      } else {
        circle.style.transform = 'scale(0.6)'; circle.style.opacity=0.7;
      }
    },1000);
  }
  function stopBreathing(){ breathRunning=false; clearInterval(breathTimer); setBreathText('Press start to begin a guided breathing cycle.'); circle.style.transform='scale(1)'; }
  document.getElementById('start-breath').addEventListener('click', startBreathing);
  document.getElementById('stop-breath').addEventListener('click', stopBreathing);

  // Journaling timer
  const startJ = document.getElementById('start-journ');
  const stopJ = document.getElementById('stop-journ');
  const journTimerEl = document.getElementById('journ-timer');
  let journInterval = null;
  function startJourn(){
    let remaining = 3*60; // 3 minutes for demo
    journTimerEl.textContent = formatTime(remaining);
    clearInterval(journInterval);
    journInterval = setInterval(()=>{
      remaining--;
      journTimerEl.textContent = formatTime(remaining);
      if(remaining<=0){ clearInterval(journInterval); journTimerEl.textContent = 'Time — finished'; }
    },1000);
  }
  function stopJourn(){ clearInterval(journInterval); journTimerEl.textContent = 'Stopped'; }
  function formatTime(s){ const m = Math.floor(s/60); const sec = s%60; return m+':' + (sec<10?'0':'')+sec; }
  startJ.addEventListener('click', startJourn);
  stopJ.addEventListener('click', stopJourn);

  // initial UI
  updateSeatsText();
  document.getElementById('year').textContent = new Date().getFullYear();
})();
