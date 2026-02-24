// Main JS for inventory and guided practice
(function(){
  // Inventory logic
  const form = document.getElementById('inventory-form');
  const generateBtn = document.getElementById('generate-agenda');
  const saveBtn = document.getElementById('save-summary');
  const output = document.getElementById('agenda-output');

  function collectSelections(){
    const checked = Array.from(form.querySelectorAll('input[name="area"]:checked'));
    return checked.map(el => ({name: el.value, weight: Number(el.dataset.weight || 1)}));
  }

  function buildAgenda(selections, notes){
    if(!selections || selections.length===0){
      return '<p class="muted">No areas selected. Try a few checkboxes to produce a focused agenda.</p>';
    }
    // sort by weight desc
    selections.sort((a,b)=>b.weight-a.weight);
    const top = selections.slice(0,4).map(s=>s.name);
    const summary = [];
    // Determine initial session length
    const totalWeight = selections.reduce((s,n)=>s+n.weight,0);
    let initial = '60 minutes';
    let follow = 'biweekly 30-minute reviews for 8 weeks';
    if(totalWeight >= 9){initial='90 minutes'; follow='weekly 30-minute reviews for 6 weeks, then biweekly for 8 weeks';}
    else if(totalWeight >=6){initial='75 minutes'; follow='weekly 30-minute reviews for 4 weeks, then monthly check-ins';}

    summary.push('<h3>Suggested visit & agenda</h3>');
    summary.push(`<p><strong>Initial session:</strong> ${initial} focused on: ${top.join(', ')}.</p>`);
    summary.push(`<p><strong>Follow-up cadence:</strong> ${follow}.</p>`);

    // Add suggested focal items
    summary.push('<h4>Suggested focal tasks for the first cycle</h4>');
    summary.push('<ul>');
    selections.forEach(s=>{
      const task = suggestTaskFor(s.name);
      summary.push(`<li><strong>${s.name}:</strong> ${task}</li>`);
    });
    summary.push('</ul>');

    if(notes){
      summary.push('<h4>Your notes</h4>');
      summary.push(`<p class="muted">${escapeHtml(notes)}</p>`);
    }

    summary.push('<p class="muted">This is an educational suggestion to guide a conversation, not a medical prescription. Share this with your clinician if needed.</p>');

    return summary.join('');
  }

  function suggestTaskFor(area){
    const map = {
      'Sleep':'Track a nightly sleep window and one consistent wind-down routine for 2 weeks.',
      'Movement':'Start two 10-minute daily movement blocks and a single weekly longer session focusing on joy in motion.',
      'Nutrition':'Add a structured protein-rich lunch and note how you feel 60–90 minutes after meals.',
      'Stress':'Use a 3-minute breathing practice twice daily and log stress triggers in a simple journal.',
      'Relationships':'Choose one brief check-in with someone important twice this week; notice tone and timing.',
      'Purpose':'Do a 5-minute values sorting exercise and pick one small experiment to try for a week.',
      'Environment':'Identify one change to your immediate environment (lighting, plants, workspace) and test for a week.',
      'Symptoms':'Track symptom timing and severity with at least three data points per week and bring to the consult.',
      'Medications':'Prepare a current list of medications and supplements and note any recent changes or side effects.'
    };
    return map[area] || 'A short tracking experiment and reflection.';
  }

  function escapeHtml(text){
    return String(text).replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m];});
  }

  generateBtn.addEventListener('click', function(){
    const sels = collectSelections();
    const notes = document.getElementById('notes').value.trim();
    output.innerHTML = buildAgenda(sels, notes);
    // also create a small shareable summary
    try{window.localStorage.setItem('last_agenda', JSON.stringify({selections:sels,notes:notes,created:Date.now()}));}catch(e){}
  });

  saveBtn.addEventListener('click', function(){
    const sels = collectSelections();
    const notes = document.getElementById('notes').value.trim();
    try{
      window.localStorage.setItem('saved_inventory', JSON.stringify({selections:sels,notes:notes,when:new Date().toISOString()}));
      alert('Saved locally in your browser. You can copy or bring this summary to a consult.');
    }catch(e){
      alert('Unable to save locally in this browser.');
    }
  });

  // Load last agenda if present
  (function loadLast(){
    try{
      const raw = window.localStorage.getItem('last_agenda');
      if(raw){
        const obj = JSON.parse(raw);
        if(obj && obj.selections){
          output.innerHTML = buildAgenda(obj.selections, obj.notes||'');
        }
      }
    }catch(e){}
  })();

  // Basic escape hatch for link buttons
  document.getElementById('open-inventory').addEventListener('click', function(){
    document.querySelector('#diagnostic').scrollIntoView({behavior:'smooth'});
  });

  // Guided practice modal
  const modal = document.getElementById('practice-modal');
  const openTry = document.getElementById('open-try');
  const openTry2 = document.getElementById('open-try-2');
  const openTry3 = document.getElementById('open-try');
  const openTryAlt = document.getElementById('open-try-2');
  const startBtn = document.getElementById('practice-start');
  const skipBtn = document.getElementById('practice-skip');
  const closeBtn = document.getElementById('close-practice');
  const stageText = document.getElementById('stage-text');
  const breathSvg = document.getElementById('breath-svg');

  function showModal(){ modal.setAttribute('aria-hidden','false'); }
  function hideModal(){ modal.setAttribute('aria-hidden','true'); resetPractice(); }
  [openTry, openTry2].forEach(el=>{ if(el) el.addEventListener('click', showModal); });
  closeBtn.addEventListener('click', hideModal);

  let stage = 0; // 0 ready, 1 breathing, 2 journaling, 3 intention, 4 done
  let timer = null;
  let breathNode = null;

  function resetPractice(){
    stage = 0; clearInterval(timer); timer=null; stageText.textContent = 'Ready to begin?';
    // reset svg
    if(breathSvg) { const c = breathSvg.querySelector('circle'); if(c){c.setAttribute('r',60); c.setAttribute('fill','#E9F6EE'); }}
  }

  function animateBreath(durationSec, onFinish){
    const circle = breathSvg.querySelector('circle');
    const steps = durationSec * 10; // 100ms steps
    let i=0;
    timer = setInterval(()=>{
      i++;
      const phase = i/steps; // 0..1
      // simple in-out breathing using sine
      const eased = 0.5 - 0.5*Math.cos(Math.PI*phase);
      const r = 40 + eased*40; // radius 40..80
      circle.setAttribute('r', r);
      if(i>=steps){ clearInterval(timer); timer=null; if(onFinish) onFinish(); }
    },100);
  }

  function startPractice(){
    if(stage!==0) return; stage=1; stageText.textContent='Breathing: follow the circle. (2 minutes)';
    animateBreath(120, ()=>{
      // move to journaling
      stage=2; stageText.textContent='Journaling: write for 3 minutes — what matters most this week?';
      // simple client-side journaling prompt: open a small prompt box
      const note = prompt('Quick journaling: What matters most this week? (3 min)');
      // wait 3 minutes or skip if user closed prompt quickly
      timer = setTimeout(()=>{
        stage=3; stageText.textContent='Set one intention for the day (1 minute).';
        setTimeout(()=>{ stage=4; stageText.textContent='Done — carry the intention forward. Close when ready.'; }, 60000);
      }, 180000);
    });
  }

  startBtn.addEventListener('click', function(){ startPractice(); startBtn.disabled=true; });
  skipBtn.addEventListener('click', function(){ resetPractice(); hideModal(); });

  // Secondary trigger on micro-habits button
  if(openTry2){ openTry2.addEventListener('click', showModal); }

  // accessibility: close on escape
  window.addEventListener('keydown', function(e){ if(e.key==='Escape'){ hideModal(); } });

  // Expose small API for debug (safe)
  window.__holistic = {collectSelections, buildAgenda};

})();