document.getElementById('year').textContent = new Date().getFullYear();

// Planner
const plannerForm = document.getElementById('planner-form');
const plannerOutput = document.getElementById('planner-output');
const plannerGenerate = document.getElementById('planner-generate');
const plannerCopy = document.getElementById('planner-copy');
const plannerDownload = document.getElementById('planner-download');

plannerGenerate.addEventListener('click', ()=>{
  const form = new FormData(plannerForm);
  const goal = form.get('goal') || 'No goal entered';
  const rhythm = form.get('rhythm');
  const focuses = (form.get('focuses') || '').split(',').map(s=>s.trim()).filter(Boolean);
  const between = form.get('between') || 'No between-session commitments entered';

  const planLines = [];
  planLines.push('Session Planner — quick summary');
  planLines.push('Goal: '+goal);
  planLines.push('Rhythm: '+rhythm);
  planLines.push('Key focuses: '+ (focuses.length? focuses.join(', '): 'none listed'));
  planLines.push('Between-session commitments: '+between);
  planLines.push('Suggested check-ins:');
  for(let i=1;i<=4;i++){
    const focus = focuses[i-1] || 'General review';
    planLines.push('  Session '+i+': work on '+focus+'; homework: note one small step');
  }

  plannerOutput.value = planLines.join('\n');
});

plannerCopy.addEventListener('click', async ()=>{
  try{
    await navigator.clipboard.writeText(plannerOutput.value);
    plannerCopy.textContent = 'Copied';
    setTimeout(()=>plannerCopy.textContent='Copy text',1500);
  }catch(e){alert('Copy failed — you can select and copy the text manually.');}
});

plannerDownload.addEventListener('click', ()=>{
  const blob = new Blob([plannerOutput.value],{type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'session-plan.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

// Intake Compass Wizard
function wizardSetup(wizardRoot){
  const steps = Array.from(wizardRoot.querySelectorAll('.step'));
  let idx = 0;
  function show(i){
    steps.forEach(s=>s.hidden=true);
    steps[i].hidden = false;
  }
  show(0);

  wizardRoot.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    const action = btn.getAttribute('data-action');
    if(action==='next'){
      idx = Math.min(idx+1, steps.length-1); show(idx);
    }else if(action==='back'){
      idx = Math.max(0, idx-1); show(idx);
    }else if(action==='finish'){
      // collect data
      const data = {};
      wizardRoot.querySelectorAll('[data-key]').forEach(el=>{
        if(el.tagName==='SELECT' || el.tagName==='INPUT' || el.tagName==='TEXTAREA'){
          data[el.getAttribute('data-key')] = el.value;
        }
      });

      const lines = [];
      lines.push('Intake Compass — things to bring to a first meeting');
      if(data.presenting) lines.push('Presenting concern: '+data.presenting);
      if(data.duration) lines.push('Duration: '+data.duration);
      if(data.triggers) lines.push('Situational notes: '+data.triggers);
      if(data.questions) lines.push('Questions you want to ask: '+data.questions);

      const out = wizardRoot.querySelector('#compass-output');
      out.value = lines.join('\n');
      show(4);
    }
  });

  // copy and download
  const copyBtn = wizardRoot.querySelector('#compass-copy');
  const downBtn = wizardRoot.querySelector('#compass-download');
  copyBtn.addEventListener('click', async ()=>{
    const out = wizardRoot.querySelector('#compass-output');
    try{ await navigator.clipboard.writeText(out.value); copyBtn.textContent='Copied'; setTimeout(()=>copyBtn.textContent='Copy',1200);}catch(e){alert('Copy failed');}
  });
  downBtn.addEventListener('click', ()=>{
    const out = wizardRoot.querySelector('#compass-output');
    const blob = new Blob([out.value],{type:'text/plain'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='intake-compass.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
}

const compassRoot = document.getElementById('compass-wizard');
wizardSetup(compassRoot);

// Checklist
const checklistForm = document.getElementById('checklist-form');
const checklistGenerate = document.getElementById('checklist-generate');
const checklistOutput = document.getElementById('checklist-output');
const checklistCopy = document.getElementById('checklist-copy');

checklistGenerate.addEventListener('click', ()=>{
  const checks = Array.from(checklistForm.querySelectorAll('input[name="items"]:checked')).map(i=>i.value);
  const lines = [];
  lines.push('Focus Checklist — points to mention in session');
  if(checks.length===0) lines.push('No items selected — consider mentioning general concerns or recent changes.');
  else checks.forEach(c=>lines.push('- '+c));
  checklistOutput.value = lines.join('\n');
});

checklistCopy.addEventListener('click', async ()=>{
  try{ await navigator.clipboard.writeText(checklistOutput.value); checklistCopy.textContent='Copied'; setTimeout(()=>checklistCopy.textContent='Copy',1200);}catch(e){alert('Copy failed');}
});

// Widget openers
Array.from(document.querySelectorAll('.open-widget')).forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    const which = btn.getAttribute('data-widget');
    if(which==='planner') location.hash = '#planner';
    if(which==='compass') location.hash = '#compass';
    if(which==='checklist') location.hash = '#checklist';
    // smooth scroll
    const el = document.getElementById(which);
    if(el) el.scrollIntoView({behavior:'smooth'});
  });
});

// Accessible simple helpers
[document.querySelectorAll('button')].forEach(()=>{});
