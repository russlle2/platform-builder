// Interactive behaviors: seat selector, packing list generator, and micro-practice modal
(function(){
  // Seat widget logic
  let seatCountEl=document.getElementById('seat-count');
  let seatTotalEl=document.getElementById('seat-total');
  let inc=document.getElementById('seat-increment');
  let dec=document.getElementById('seat-decrement');
  let reserveBtn=document.getElementById('reserve-fake');
  const basePrice=15; // per seat for the demo
  let seats=3;
  function renderSeats(){
    seatCountEl.textContent=seats;
    seatTotalEl.textContent=`$${seats*basePrice}`;
  }
  inc.addEventListener('click',()=>{seats=Math.min(6,seats+1);renderSeats();});
  dec.addEventListener('click',()=>{seats=Math.max(1,seats-1);renderSeats();});
  renderSeats();

  reserveBtn.addEventListener('click',()=>{
    // fake local reservation; just a playful confirmation
    alert('Nice — we held '+seats+' seat(s) locally. This is a demo hold only. Proceed to booking to finalize.');
  });

  // Packing list generator
  const packingBtn=document.getElementById('packing-gen');
  packingBtn.addEventListener('click',()=>{
    const options=[
      ['yoga mat','blanket','water bottle'],
      ['eye-pillow','ear-plugs','notebook and pen'],
      ['sweater','socks','phone on airplane mode']
    ];
    // Randomize a friendly list
    const idx=Math.floor(Math.random()*options.length);
    const list=options[idx];
    alert('Pack list suggestion:\n\n• '+list.join('\n• ')+"\n\nAdd or remove items as needed. If you need a mat, email us at {{EMAIL}} to request one.");
  });

  // Micro-practice modal
  const modal=document.getElementById('micro-modal');
  const openBtns=[document.getElementById('try-now-cta'),document.getElementById('try-now-hero'),document.getElementById('try-now-hero-2')];
  const closeBtn=document.getElementById('modal-close');
  openBtns.forEach(b=>b && b.addEventListener('click',()=>openModal()));
  closeBtn.addEventListener('click',()=>closeModal());
  modal.addEventListener('click',(e)=>{if(e.target===modal)closeModal()});
  function openModal(){modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
  function closeModal(){modal.setAttribute('aria-hidden','true');document.body.style.overflow='');}

  // Tabs inside modal
  const tabs=document.querySelectorAll('.tab');
  const modes=document.querySelectorAll('.mode');
  tabs.forEach(t=>t.addEventListener('click',()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const m=t.getAttribute('data-mode');
    modes.forEach(md=>md.classList.add('hidden'));
    document.querySelector('[data-mode-content="'+m+'"]').classList.remove('hidden');
  }));

  // Breathing exercise
  let breathInterval=null;
  const breathStart=document.getElementById('breath-start');
  const breathStop=document.getElementById('breath-stop');
  const breathLenSelect=document.getElementById('breath-length');
  const breathVisual=document.getElementById('breath-circle');
  breathStart.addEventListener('click',()=>{
    if(breathInterval) return;
    let phaseLen=parseInt(breathLenSelect.value,10);
    // cycle: inhale (phaseLen), hold (phaseLen/2), exhale (phaseLen)
    let steps = phaseLen*30; // smoothness
    let frame=0; let state=0; // 0 inhale,1 hold,2 exhale
    breathInterval=setInterval(()=>{
      frame++;
      const per=frame/steps;
      let scale=1;
      if(state===0) scale=0.65 + per*0.35; // grow
      if(state===1) scale=1; // hold
      if(state===2) scale=1 - per*0.35; // shrink
      breathVisual.style.transform='scale('+scale+')';
      if(frame>=steps){frame=0; state=(state+1)%3}
    }, Math.round(1000/30));
  });
  breathStop.addEventListener('click',()=>{if(breathInterval){clearInterval(breathInterval);breathInterval=null;breathVisual.style.transform='scale(1)'}});

  // Simple journaling timer (2 minutes)
  const journalStart=document.getElementById('journal-start');
  const journalTimerEl=document.getElementById('journal-timer');
  const journalText=document.getElementById('journal-text');
  let journalTimer=null;
  journalStart.addEventListener('click',()=>{
    if(journalTimer) return;
    let remaining=120; updateTimer(remaining);
    journalTimer=setInterval(()=>{
      remaining--; updateTimer(remaining);
      if(remaining<=0){clearInterval(journalTimer);journalTimer=null;alert('Time! Feel free to keep writing or close the modal.')}} ,1000);
  });
  function updateTimer(s){const mm=Math.floor(s/60);const ss=('0'+(s%60)).slice(-2);journalTimerEl.textContent=mm+':'+ss}
  document.getElementById('journal-clear').addEventListener('click',()=>{journalText.value='';});

  // Intention setting
  const intentionInput=document.getElementById('intention-input');
  const intentionSave=document.getElementById('intention-save');
  const intentionResult=document.getElementById('intention-result');
  intentionSave.addEventListener('click',()=>{
    const val=intentionInput.value.trim();
    if(!val){alert('Type a short intention like "I will rest tonight"');return}
    intentionResult.textContent='Saved — "'+val+'"';
  });
  document.getElementById('intention-clear').addEventListener('click',()=>{intentionInput.value='';intentionResult.textContent='';});

  // Accessibility: trap focus in modal when open (light implementation)
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){if(modal.getAttribute('aria-hidden')==='false')closeModal()}});

})();