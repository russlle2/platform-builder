(function(){
  // Simple local data for next events
  const events = [
    {id:1,date:'2026-03-03T19:00:00',label:'Evening Field — 60 min',capacity:12,booked:7},
    {id:2,date:'2026-03-10T10:00:00',label:'Morning Ease — 45 min',capacity:10,booked:2},
    {id:3,date:'2026-03-17T18:30:00',label:'Full Moon Field — 75 min',capacity:14,booked:13}
  ];

  // Utility to format a date string
  function fmt(d){
    const dt=new Date(d);
    return dt.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  }

  // Populate next event preview
  const nextEventEl=document.getElementById('nextEventDate');
  const seatSelect=document.getElementById('seatSelect');
  const availability=document.getElementById('availability');
  const reserveBtn=document.getElementById('reserveBtn');
  const packBtn=document.getElementById('packBtn');

  let currentEvent=events[0];
  function refreshEvent(){
    // find first with spots
    currentEvent = events.find(e=>e.booked < e.capacity) || events[0];
    nextEventEl.textContent = fmt(currentEvent.date);
    updateSeatOptions();
  }

  function updateSeatOptions(){
    seatSelect.innerHTML='';
    const free = Math.max(0, currentEvent.capacity - currentEvent.booked);
    availability.textContent = 'Availability: '+free+' seats remaining';
    for(let i=1;i<=Math.min(6, free);i++){
      const opt=document.createElement('option');opt.value=i;opt.textContent=i+ (i===1? ' seat':' seats');seatSelect.appendChild(opt);
    }
    if(free===0){
      const opt=document.createElement('option');opt.value=0;opt.textContent='Sold out';seatSelect.appendChild(opt);
      reserveBtn.disabled=true;seatSelect.disabled=true;
    } else {reserveBtn.disabled=false;seatSelect.disabled=false}
  }

  reserveBtn.addEventListener('click',()=>{
    const seats = parseInt(seatSelect.value,10);
    if(!seats || seats<=0){alert('No seats available to reserve.');return}
    if(seats + currentEvent.booked > currentEvent.capacity){alert('Not enough seats.');return}
    // fake reservation
    currentEvent.booked += seats;
    updateSeatOptions();
    alert('Reserved '+seats+' seat(s). Confirmation sent to '+ '{{EMAIL}}'.');
  });

  packBtn.addEventListener('click',()=>{
    // Show a simple packing list generator modal-like alert
    const type = currentEvent.label.toLowerCase();
    const items = ['A small journal','A light blanket','Water bottle'];
    if(type.includes('morning')) items.push('Light layers to shed');
    if(type.includes('evening')) items.push('Eye mask or sleep scarf');
    if(type.includes('full moon')) items.push('Optional intention object');
    const list = items.map(i=>'• '+i).join('\n');
    alert('What to bring for "'+currentEvent.label+'"\n\n'+list);
  });

  // Initialise
  refreshEvent();

  // Guided practice modal logic
  const modal=document.getElementById('guidedModal');
  const tryNowBtns=document.querySelectorAll('#tryNowBtn,#tryNowBtn2');
  const modalClose=document.getElementById('modalClose');
  const breathVisual=document.getElementById('breathVisual');
  const breathTimer=document.getElementById('breathTimer');
  const breathStage=document.getElementById('breathStage');
  const journalStage=document.getElementById('journalStage');
  const intentStage=document.getElementById('intentStage');
  const journalPrompt=document.getElementById('journalPrompt');
  const saveJournal=document.getElementById('saveJournal');
  const finishIntent=document.getElementById('finishIntent');
  const journalInput=document.getElementById('journalInput');
  const intentInput=document.getElementById('intentInput');

  let breathInterval=null;let breathCount=0;
  function openModal(){
    modal.setAttribute('aria-hidden','false');
    // reset stages
    breathStage.classList.remove('hidden');journalStage.classList.add('hidden');intentStage.classList.add('hidden');
    breathCount=0;startBreathCycle();
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');stopBreathCycle();
  }

  tryNowBtns.forEach(b=>b.addEventListener('click',openModal));
  modalClose.addEventListener('click',closeModal);

  function startBreathCycle(){
    stopBreathCycle();
    breathCount=0;
    let phase=0; // 0 inhale,1 hold,2 exhale
    let phaseDur=[4000,2000,6000];
    breathTimer.textContent='0';
    breathInterval=setInterval(()=>{
      phase = (phase+1)%3;
      breathCount++;
      // animate visual
      if(phase===0){ breathVisual.style.transform='scale(1.12)'; breathTimer.textContent='Inhale'; }
      if(phase===1){ breathVisual.style.transform='scale(1.02)'; breathTimer.textContent='Hold'; }
      if(phase===2){ breathVisual.style.transform='scale(.8)'; breathTimer.textContent='Exhale'; }
      // after a few cycles, move to journaling
      if(breathCount>4){ stopBreathCycle(); setTimeout(()=>{ showJournalPrompt() }, 900); }
    }, 1200);
  }
  function stopBreathCycle(){ if(breathInterval){clearInterval(breathInterval);breathInterval=null} }

  function showJournalPrompt(){
    breathStage.classList.add('hidden');journalStage.classList.remove('hidden');
    // random gentle prompt
    const prompts = [
      'Name one small thing you are grateful for today.',
      'Write a line about how your body feels right now.',
      'If you could leave this session with one small change, what would it be?'
    ];
    journalPrompt.textContent = prompts[Math.floor(Math.random()*prompts.length)];
  }

  saveJournal.addEventListener('click',()=>{
    const text = journalInput.value.trim();
    if(text.length===0){alert('A short note helps. Try a sentence.');return}
    // store locally
    localStorage.setItem('lastJournal',text);
    alert('Saved locally.');
    journalStage.classList.add('hidden');intentStage.classList.remove('hidden');
  });

  finishIntent.addEventListener('click',()=>{
    const intent = intentInput.value.trim();
    if(intent.length===0){alert('A tiny intention will do.');return}
    localStorage.setItem('lastIntent',intent);
    alert('Intent set: "'+intent+'" — you can copy it into your notes.');
    closeModal();
  });

  // Quick accessibility: close modal on ESC
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ closeModal() } });

  // Expose for debug (optional)
  window._sb_app = {events,refreshEvent};
})();