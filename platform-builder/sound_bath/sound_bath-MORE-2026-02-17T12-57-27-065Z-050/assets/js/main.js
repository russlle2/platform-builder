(function(){
  // Session Planner
  const buildBtn = document.getElementById('build-plan');
  const clearBtn = document.getElementById('clear-plan');
  const planText = document.getElementById('plan-text');
  const copyBtn = document.getElementById('copy-plan');
  const downloadBtn = document.getElementById('download-plan');

  function gatherSelections(){
    const intent = document.getElementById('intent').value;
    const length = document.getElementById('length').value;
    const frequency = document.getElementById('frequency').value;
    const instrEls = document.querySelectorAll('input[name="instr"]');
    const instruments = [];
    instrEls.forEach(i=>{ if(i.checked) instruments.push(i.parentNode.textContent.trim()); });
    return {intent,length,frequency,instruments};
  }

  function buildPlan(){
    const sel = gatherSelections();
    const timeFrames = {"30":"Quick: entry 5m, field 20m, return 5m","60":"Standard: entry 10m, field 40m, return 10m","90":"Expanded: entry 15m, field 60m, return 15m"};
    const intentNotes = {
      calm: 'Focus on breath lengthening and low-frequency sustain to encourage parasympathetic response.',
      sleep: 'Favor very slow transitions, minimal speech, and soft high-to-low tone progressions for closure.',
      focus: 'Short pulses and clear signposts help steady attention without overstimulation.',
      reset: 'Brief centring and a more textured field to interrupt rumination and invite new pacing.'
    };
    const instruments = sel.instruments.length? sel.instruments.join(', '): 'Voice + bowls (default)';
    const title = `Session Plan — intent: ${sel.intent} | ${sel.length} min | ${sel.frequency}`;
    const body = [];
    body.push(title);
    body.push('Instruments: ' + instruments);
    body.push('Structure: ' + timeFrames[sel.length]);
    body.push('Intention note: ' + (intentNotes[sel.intent]||''));
    body.push('Entry cues: settle posture; 3 rounds guided breath; ambient bell on soft pattern');
    body.push('Field work: maintain an unobtrusive loop; allow 2-3 instrument layers; avoid abrupt stops');
    body.push('Return: 2 gentle verbal markers; invite participants to note bodily changes; 1-minute silence');
    body.push('Suggested follow-up: journaling prompt or 5-minute low-energy activity');
    return body.join('\n\n');
  }

  buildBtn && buildBtn.addEventListener('click', ()=>{
    const txt = buildPlan();
    planText.textContent = txt;
    // enable download
    const blob = new Blob([txt],{type:'text/plain'});
    const url = URL.createObjectURL(blob);
    downloadBtn.href = url;
  });

  clearBtn && clearBtn.addEventListener('click', ()=>{
    document.getElementById('planner-form').reset();
    planText.textContent = 'Use the form to generate a session plan.';
  });

  copyBtn && copyBtn.addEventListener('click', async ()=>{
    const text = planText.textContent || '';
    try{
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = 'Copied';
      setTimeout(()=>copyBtn.textContent = 'Copy summary',1500);
    }catch(e){
      // fallback
      const ta = document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();
      try{document.execCommand('copy');copyBtn.textContent='Copied';setTimeout(()=>copyBtn.textContent='Copy summary',1500);}catch(e){alert('Copy failed')}
      document.body.removeChild(ta);
    }
  });

  // Event seat selector & packing list generator (fake/local)
  function updateSeats(card, requested){
    const max = parseInt(card.getAttribute('data-seats')||0,10);
    const remaining = Math.max(0, max - requested);
    return {max,remaining};
  }

  document.querySelectorAll('.reserve-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const card = e.target.closest('.event-card');
      const input = card.querySelector('.seat-input');
      const requested = Number(input.value)||1;
      const info = updateSeats(card, requested);
      alert(`Simulated reservation for ${requested} seat(s). Remaining seats (simulated): ${Math.max(0, info.remaining)}.`);
    });
  });

  // Packing list generator
  function packListForEvent(card){
    // heuristics based on time and instruments
    const title = card.querySelector('h4').textContent.trim();
    const time = card.querySelector('time')? card.querySelector('time').textContent.trim():'';
    const items = ['Mat or blanket', 'Light cover', 'Water bottle', 'Soft eye pillow or scarf'];
    if(/Evening|night|sleep/i.test(title) || /pm/i.test(time)) items.push('Layered clothing for warmth');
    if(/Intro|workshop/i.test(title)) items.push('Notebook and pen');
    items.push('Optional: small cushion for vertical support');
    return {title,time,items};
  }

  document.querySelectorAll('.pack-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const card = e.target.closest('.event-card');
      const list = packListForEvent(card);
      const msg = `What to bring for "${list.title}" (${list.time}):\n\n- ` + list.items.join('\n- ');
      // show simple dialog
      if(confirm(msg + '\n\nCopy list to clipboard?')){
        try{navigator.clipboard.writeText(msg);alert('Copied to clipboard');}catch(e){alert('Unable to copy automatically');}
      }
    });
  });

})();