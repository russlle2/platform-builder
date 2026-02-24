(function(){
  // Inventory -> agenda generator
  const generateBtn = document.getElementById('generate-agenda');
  const form = document.getElementById('inventory-form');
  const output = document.getElementById('agenda-output');

  function buildAgenda(areas){
    if(!areas.length){
      return {title:'No areas selected',notes:'If you are unsure, pick 2–3 things that feel most present. A short consult can help prioritize.'};
    }
    // Create a short agenda: intro, focused checks, tests/plans, brief tools
    const agenda = [];
    agenda.push('1) Brief context & goals ('+Math.min(6, Math.max(4, Math.ceil(areas.length*2)))+' min)');
    agenda.push('2) Focus on: '+areas.slice(0,3).map(cap).join(', '));
    if(areas.includes('digestion')) agenda.push('3) Diet & pattern review + symptom log guidance');
    if(areas.includes('sleep')) agenda.push('3) Sleep timing review + simple anchor routine');
    if(areas.includes('mood') || areas.includes('stress')) agenda.push('3) Emotion regulation anchors and one micro-practice');
    agenda.push('4) Simple, testable step for the next 2 weeks');
    agenda.push('5) Measurement & follow-up: what we watch and when');

    // Follow-up cadence logic
    let cadence = '4 weeks — standard';
    if(areas.length>=5) cadence = '2 weeks — focused check-ins';
    if(areas.includes('energy') && areas.includes('sleep')) cadence = '2 weeks — early review';
    if(areas.includes('meaning')) cadence = '6 weeks — planning rhythm';

    return {title:'Suggested consultation agenda',notes:agenda.join('\n'),cadence:cadence};
  }

  function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1).replace(/_/g,' '); }

  generateBtn.addEventListener('click', function(){
    const checked = Array.from(form.querySelectorAll('input[name="areas"]:checked')).map(i=>i.value);
    const plan = buildAgenda(checked);
    let html = '<strong>'+escapeHtml(plan.title)+'</strong>\n<pre>'+escapeHtml(plan.notes)+'</pre>\n<p><em>Suggested follow-up: '+escapeHtml(plan.cadence || '4 weeks')+'</em></p>';
    output.innerHTML = html;
  });

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Breathing modal
  const modalBreath = document.getElementById('modal-breath');
  const openBreath = document.getElementById('open-breathing');
  const closeBreath = document.getElementById('close-breath');
  const startBreath = document.getElementById('start-breath');
  const resetBreath = document.getElementById('reset-breath');
  const breathVisual = document.getElementById('breath-visual');
  const breathInstruction = document.getElementById('breath-instruction');

  let breathTimer = null;
  let breathStep = 0;
  const cycle = [4,6,6]; // inhale, hold, exhale (seconds)

  openBreath.addEventListener('click', ()=>{ modalBreath.setAttribute('aria-hidden','false'); });
  closeBreath.addEventListener('click', ()=>{ stopBreath(); modalBreath.setAttribute('aria-hidden','true'); });

  startBreath.addEventListener('click', ()=>{
    stopBreath();
    breathStep = 0;
    runBreathCycle(0);
  });
  resetBreath.addEventListener('click', ()=>{ stopBreath(); breathVisual.style.transform='scale(1)'; breathInstruction.textContent='Get comfortable. Follow the circle as it expands and contracts.' });

  function runBreathCycle(iter){
    const phase = iter % cycle.length;
    const secs = cycle[phase];
    if(phase===0){ breathInstruction.textContent='Inhale for '+secs+' seconds'; breathVisual.style.transform='scale(1.45)'; }
    else if(phase===1){ breathInstruction.textContent='Hold for '+secs+' seconds'; breathVisual.style.transform='scale(1.0)'; }
    else { breathInstruction.textContent='Exhale for '+secs+' seconds'; breathVisual.style.transform='scale(0.6)'; }
    breathTimer = setTimeout(()=>runBreathCycle(iter+1), secs*1000);
  }
  function stopBreath(){ if(breathTimer){ clearTimeout(breathTimer); breathTimer=null; } }

  // Journaling modal
  const modalJournal = document.getElementById('modal-journal');
  const openJournal = document.getElementById('open-journal');
  const closeJournal = document.getElementById('close-journal');
  const saveJournal = document.getElementById('save-journal');
  const clearJournal = document.getElementById('clear-journal');
  const journalText = document.getElementById('journal-text');

  openJournal.addEventListener('click', ()=>{ modalJournal.setAttribute('aria-hidden','false'); // load saved
    const key = 'journal-draft';
    const saved = localStorage.getItem(key);
    if(saved) journalText.value = saved;
  });
  closeJournal.addEventListener('click', ()=>{ modalJournal.setAttribute('aria-hidden','true'); });
  saveJournal.addEventListener('click', ()=>{ localStorage.setItem('journal-draft', journalText.value); alert('Saved to this device.'); });
  clearJournal.addEventListener('click', ()=>{ if(confirm('Clear your entry?')){ journalText.value=''; localStorage.removeItem('journal-draft'); } });

  // Accessibility: close modals with Escape
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ if(modalBreath.getAttribute('aria-hidden')==='false') closeBreath.click(); if(modalJournal.getAttribute('aria-hidden')==='false') closeJournal.click(); } });

  // Utility: avoid alert in non-UI environments
  window.alert = window.alert || function(){ console.log('alert'); };
})();