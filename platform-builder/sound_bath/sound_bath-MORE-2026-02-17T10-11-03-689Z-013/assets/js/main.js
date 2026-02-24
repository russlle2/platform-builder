(function(){
  // Seat selector logic
  const inc = document.getElementById('incSeat');
  const dec = document.getElementById('decSeat');
  const num = document.getElementById('numSeats');
  const seatsLeft = document.getElementById('seatCount');
  const reserveBtn = document.getElementById('reserveBtn');
  let available = parseInt(seatsLeft.textContent || '8',10);
  const MAX_PER = 10;

  function clamp(n){ return Math.max(1, Math.min(MAX_PER, n)); }
  inc.addEventListener('click', ()=>{ num.value = clamp(Number(num.value||1)+1); });
  dec.addEventListener('click', ()=>{ num.value = clamp(Number(num.value||1)-1); });
  num.addEventListener('change', ()=>{ num.value = clamp(Number(num.value||1)); });

  reserveBtn.addEventListener('click', ()=>{
    const want = clamp(Number(num.value||1));
    if(want>available){
      alert('Only '+available+' seats remain. Please lower your reservation.');
      return;
    }
    // simulate reservation
    available -= want; seatsLeft.textContent = String(Math.max(0,available));
    alert('Reserved '+want+' spot(s). You will receive confirmation at {{EMAIL}} (simulated).');
    // optionally direct to booking
    const u = new URL('{{PRIMARY_CTA_URL}}', location.origin);
    u.searchParams.set('seats',want);
    window.location.href = u.toString();
  });

  // Packing list generator
  const genBtn = document.getElementById('genPacking');
  const packingForm = document.getElementById('packingForm');
  const packingOut = document.getElementById('packingOutput');
  const sessionLength = document.getElementById('sessionLength');

  function generatePacking(){
    const items = Array.from(packingForm.querySelectorAll('input[name="items"]:checked')).map(i=>i.value);
    const len = Number(sessionLength.value);
    const list = [];
    if(items.includes('mat')) list.push('Mat or comfortable cushion');
    if(items.includes('blanket')) list.push('Warm blanket to stay cozy');
    if(items.includes('pillow')) list.push('Small pillow or bolster for neck support');
    if(items.includes('water')) list.push('Water bottle');
    if(items.includes('journal')) list.push('Journal and pen for integration');
    if(len>=60) list.push('Plan a gentle commute after the session');
    if(list.length===0) list.push('Just come as you are — we provide blankets and props when possible');
    packingOut.textContent = list.join('\n');
  }
  genBtn.addEventListener('click', function(e){ e.preventDefault(); generatePacking(); });

  // Guided exercise modal
  const modal = document.getElementById('exerciseModal');
  const tryNow = document.getElementById('try-now');
  const closeModal = document.getElementById('closeModal');
  const breathCircle = document.getElementById('breathCircle');
  const circleInner = breathCircle.querySelector('.circle-inner');
  const breathLabel = document.getElementById('breathLabel');
  const startBreath = document.getElementById('startBreath');
  const nextStep1 = document.getElementById('nextStep1');
  const cycleLen = document.getElementById('cycleLen');
  const stepElems = Array.from(document.querySelectorAll('.exercise-step'));
  const nextStep2 = document.getElementById('nextStep2');
  const finishExercise = document.getElementById('finishExercise');
  const exerciseDone = document.getElementById('exerciseDone');

  let breathTimer = null, breathePhase = 'in', breathCycles = 0;

  function openModal(){ modal.setAttribute('aria-hidden','false'); modal.style.display='flex'; stepElems.forEach(s=>s.hidden=false); stepElems.forEach((s,i)=>{ s.hidden = i!==0; }); exerciseDone.hidden=true; document.body.style.overflow='hidden'; }
  function close(){ modal.setAttribute('aria-hidden','true'); modal.style.display='none'; stopBreath(); document.body.style.overflow=''; }
  tryNow.addEventListener('click', openModal);
  closeModal.addEventListener('click', close);

  function startBreathing(){
    const len = Number(cycleLen.value);
    stopBreath();
    breathePhase='in'; breathCycles=0;
    nextStep1.disabled = true;
    breathLabel.textContent = 'Breathe in...';
    circleInner.classList.remove('breath-anim-out');
    circleInner.classList.add('breath-anim-in');
    breathTimer = setInterval(()=>{
      if(breathePhase==='in'){
        breathLabel.textContent = 'Hold';
        circleInner.classList.remove('breath-anim-in');
        circleInner.classList.add('breath-anim-out');
        breathePhase='out';
      } else {
        breathLabel.textContent = 'Breathe in';
        circleInner.classList.remove('breath-anim-out');
        circleInner.classList.add('breath-anim-in');
        breathePhase='in';
        breathCycles += 1;
        if(breathCycles>=3){ // brief set
          stopBreath(); nextStep1.disabled=false; breathLabel.textContent='Complete — continue when ready';
        }
      }
    }, len*250);
  }
  function stopBreath(){ if(breathTimer) clearInterval(breathTimer); breathTimer=null; }
  startBreath.addEventListener('click', startBreathing);

  nextStep1.addEventListener('click', ()=>{
    stepElems.forEach(s=>s.hidden=true); stepElems[1].hidden=false; // show journaling
  });
  nextStep2.addEventListener('click', ()=>{
    stepElems.forEach(s=>s.hidden=true); stepElems[2].hidden=false; // show intention
  });
  finishExercise.addEventListener('click', ()=>{
    stepElems.forEach(s=>s.hidden=true); exerciseDone.hidden=false;
  });

  // Close modal on outside click
  modal.addEventListener('click', (e)=>{ if(e.target===modal) close(); });

  // Mobile menu toggle
  const mobileToggle = document.querySelector('.mobile-toggle');
  const nav = document.querySelector('.nav');
  mobileToggle.addEventListener('click', ()=>{ nav.classList.toggle('open'); });

})();
