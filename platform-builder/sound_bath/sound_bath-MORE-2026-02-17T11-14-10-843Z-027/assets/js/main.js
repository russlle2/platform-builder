(function(){
  // Simple seat selector logic
  const availableEl = document.getElementById('availableSeats');
  const seatInput = document.getElementById('seatCount');
  const increaseBtn = document.getElementById('increaseSeat');
  const decreaseBtn = document.getElementById('decreaseSeat');
  const summary = document.getElementById('reservationSummary');
  let availableSeats = parseInt(availableEl ? availableEl.textContent : '8',10);

  function updateSummary(){
    const val = Math.max(1,Math.min(availableSeats,Number(seatInput.value)||1));
    seatInput.value = val;
    summary.textContent = val;
  }

  if(increaseBtn){increaseBtn.addEventListener('click',()=>{let v=Number(seatInput.value)||1; if(v<availableSeats){seatInput.value=++v; updateSummary();}})}
  if(decreaseBtn){decreaseBtn.addEventListener('click',()=>{let v=Number(seatInput.value)||1; if(v>1){seatInput.value=--v; updateSummary();}})}
  if(seatInput){seatInput.addEventListener('change',updateSummary);}
  updateSummary();

  // Packing list generator
  const packingForm = document.getElementById('packingForm');
  const packingOutput = document.getElementById('packingOutput');
  const generateBtn = document.getElementById('generatePacking');

  function generatePacking(){
    const checked = Array.from(packingForm.querySelectorAll('input[name="items"]:checked')).map(i=>i.value);
    let lines = [];
    if(checked.length===0){
      lines.push('Suggested starter list:');
      lines.push('- Comfortable mat or towel');
      lines.push('- Light blanket or sweater');
      lines.push('- Bottle of water');
      lines.push('- Small notebook if you like to reflect');
    } else {
      lines.push('Packing for your seat:');
      checked.forEach(item=>{
        switch(item){
          case 'mat': lines.push('- Personal mat'); break;
          case 'blanket': lines.push('- Light blanket'); break;
          case 'water': lines.push('- Water bottle'); break;
          case 'eyeMask': lines.push('- Eye mask or scarf'); break;
          case 'notebook': lines.push('- Small notebook & pen'); break;
          default: lines.push('- ' + item);
        }
      });
    }
    lines.push('\nArrival tips: arrive 10 minutes early, silence phones, ask a staff member about accessibility.');

    packingOutput.textContent = lines.join('\n');
  }
  if(generateBtn) generateBtn.addEventListener('click', generatePacking);

  // Guided practice modal
  const tryBtn = document.getElementById('tryNowBtn');
  const modal = document.getElementById('guidedModal');
  const closeModal = document.getElementById('closeModal');
  const startBtn = document.getElementById('startGuide');
  const skipBtn = document.getElementById('skipGuide');
  const guideArea = document.getElementById('guideArea');

  let timer = null;

  function openModal(){ modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  function close(){ modal.setAttribute('aria-hidden','true'); document.body.style.overflow='auto'; clearGuide(); }

  function clearGuide(){
    if(timer) { clearInterval(timer); timer=null; }
    guideArea.innerHTML = '';
  }

  function startGuide(){
    clearGuide();
    const type = document.querySelector('input[name="guideType"]:checked').value;
    if(type==='breath') runBreath();
    else if(type==='journal') runJournal();
    else runIntention();
  }

  function runBreath(){
    // 4-5-6 style simplistic: inhale 4, hold 5, exhale 6
    let phase = 0; // 0 inhale,1 hold,2 exhale
    const phases = [4,5,6];
    const labels = ['Breathe in','Hold','Breathe out'];
    guideArea.innerHTML = '<div class="breath-ui"><p id="breathLabel"></p><div id="breathTimer" style="font-size:28px;margin-top:8px"></div><p class="muted small">3 cycles</p></div>';
    const labelEl = guideArea.querySelector('#breathLabel');
    const timerEl = guideArea.querySelector('#breathTimer');
    let cycle = 0;
    let count = phases[phase];
    labelEl.textContent = labels[phase];
    timerEl.textContent = count;
    timer = setInterval(()=>{
      count--;
      if(count<=0){
        phase = (phase+1)%3;
        if(phase===0){ cycle++; if(cycle>=3){ clearInterval(timer); timer=null; timerEl.textContent='Done'; return; } }
        count = phases[phase];
        labelEl.textContent = labels[phase];
      }
      timerEl.textContent = count;
    },1000);
  }

  function runJournal(){
    guideArea.innerHTML = '<div class="journal-ui"><p class="muted small">Write for two minutes. Prompt:</p><blockquote id="prompt" style="background:#fff6ef;padding:10px;border-radius:6px">What eased today, and what could use more care?</blockquote><textarea id="journalText" placeholder="Your notes" style="width:100%;height:120px;margin-top:10px;padding:8px"></textarea><div id="journalTimer" style="margin-top:8px;color:var(--muted)">2:00</div></div>';
    const timerEl = guideArea.querySelector('#journalTimer');
    let remaining = 120;
    timerEl.textContent = '2:00';
    timer = setInterval(()=>{
      remaining--;
      const mm = Math.floor(remaining/60); const ss = (remaining%60).toString().padStart(2,'0');
      timerEl.textContent = mm + ':' + ss;
      if(remaining<=0){ clearInterval(timer); timer=null; timerEl.textContent='Time finished'; }
    },1000);
  }

  function runIntention(){
    guideArea.innerHTML = '<div class="intent-ui"><p class="muted small">Set a short, clear intention for the next day.</p><input id="intentInput" placeholder="e.g., I will pause before responding" style="width:100%;padding:10px;border-radius:6px;border:1px solid rgba(0,0,0,0.06)" /><div style="margin-top:10px;color:var(--muted)">When ready, press Save.</div></div>';
    const input = guideArea.querySelector('#intentInput');
    const saveBtn = document.createElement('button'); saveBtn.textContent='Save'; saveBtn.className='btn primary'; saveBtn.style.marginTop='10px';
    guideArea.appendChild(saveBtn);
    saveBtn.addEventListener('click',()=>{
      const val = input.value.trim();
      if(!val){ input.focus(); return; }
      guideArea.innerHTML = '<p>Saved intention:</p><blockquote style="background:#fff6ef;padding:10px;border-radius:6px">'+escapeHtml(val)+'</blockquote><p class="muted small">You can keep this in your notebook or in a phone reminder.</p>';
    });
  }

  function escapeHtml(s){ return s.replace(/[&<>\"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','\\':'&#92;','"':'&quot;'}[c]; }); }

  if(tryBtn) tryBtn.addEventListener('click',openModal);
  if(closeModal) closeModal.addEventListener('click',close);
  if(skipBtn) skipBtn.addEventListener('click',close);
  if(startBtn) startBtn.addEventListener('click',startGuide);
  // close on overlay click
  modal.addEventListener('click',function(e){ if(e.target===modal) close(); });

})();