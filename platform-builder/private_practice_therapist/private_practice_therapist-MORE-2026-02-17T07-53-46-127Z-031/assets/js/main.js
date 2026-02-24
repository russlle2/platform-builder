document.addEventListener('DOMContentLoaded',function(){
  // year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Intake wizard simple state
  const steps = Array.from(document.querySelectorAll('.wizard .step'));
  let current = 0;
  const prevBtn = document.getElementById('prev-step');
  const nextBtn = document.getElementById('next-step');

  function showStep(index){
    steps.forEach((s,i)=> s.classList.toggle('active', i===index));
    prevBtn.style.display = index===0 ? 'none' : 'inline-block';
    nextBtn.textContent = index===steps.length-1 ? 'Finish' : 'Next';
  }
  showStep(current);

  prevBtn.addEventListener('click',()=>{ if(current>0){current--; showStep(current);} });
  nextBtn.addEventListener('click',()=>{
    if(current<steps.length-1){ current++; showStep(current); } else { buildIntakeSummary(); }
  });

  function buildIntakeSummary(){
    const checked = Array.from(document.querySelectorAll('.choices input:checked')).map(i=>i.value);
    const urgent = document.getElementById('urgent-area').value;
    const outcome = document.getElementById('meaningful-outcome').value.trim();
    const privacy = document.getElementById('privacy-note').value.trim();
    const lines = [];
    lines.push('Self-check summary');
    if(checked.length) lines.push('Primary concerns: ' + checked.join(', '));
    if(urgent) lines.push('Most urgent area: ' + urgent);
    if(outcome) lines.push('Desired short-term outcome: ' + outcome);
    if(privacy) lines.push('Notes about prior care/privacy: ' + privacy);
    lines.push('Bring these notes to your first consultation to help focus the session.');
    const summary = lines.join('\n\n');
    document.getElementById('intake-summary').value = summary;
  }

  document.getElementById('copy-intake').addEventListener('click',()=>{
    const t = document.getElementById('intake-summary');
    if(!t.value) return; navigator.clipboard.writeText(t.value).then(()=>{alert('Summary copied to clipboard.');});
  });

  document.getElementById('email-intake').addEventListener('click',()=>{
    const body = encodeURIComponent(document.getElementById('intake-summary').value);
    const mail = 'mailto:{{EMAIL}}?subject=' + encodeURIComponent('Intake summary') + '&body=' + body;
    window.location.href = mail;
  });

  // Session planner
  const gen = document.getElementById('generate-plan');
  const clear = document.getElementById('clear-plan');
  gen.addEventListener('click',()=>{
    const focus = document.getElementById('planner-focus').value.trim();
    const cadence = document.getElementById('planner-cadence').value;
    const length = document.getElementById('planner-length').value;
    const p1 = document.getElementById('priority-1').value.trim();
    const p2 = document.getElementById('priority-2').value.trim();
    const p3 = document.getElementById('priority-3').value.trim();
    const lines = [];
    lines.push('Session Planner');
    lines.push('Focus: ' + (focus || 'To be defined in session'));
    lines.push('Cadence: ' + cadence);
    lines.push('Session length: ' + length);
    const priorities = [p1,p2,p3].filter(Boolean);
    if(priorities.length){ lines.push('Priorities:'); priorities.forEach((p,i)=> lines.push((i+1)+'. '+p)); }
    lines.push('Practical next steps to consider:');
    if(cadence==='weekly') lines.push('- Plan for weekly check-ins; use brief homework between sessions.');
    else if(cadence==='biweekly') lines.push('- Aim for a two-week rhythm; use brief reflection notes mid-cycle.');
    else lines.push('- Monthly check-ins with focused agenda and exercises.');
    lines.push('\nBring this plan to your first session as a starting point.');
    document.getElementById('plan-output').value = lines.join('\n\n');
  });

  clear.addEventListener('click',()=>{
    ['planner-focus','priority-1','priority-2','priority-3'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('plan-output').value='';
  });

  document.getElementById('copy-plan').addEventListener('click',()=>{
    const t = document.getElementById('plan-output');
    if(!t.value) return; navigator.clipboard.writeText(t.value).then(()=>{alert('Plan copied to clipboard.');});
  });

  // small accessible menu toggle
  const mobileToggle = document.querySelector('.mobile-toggle');
  mobileToggle && mobileToggle.addEventListener('click',()=>{
    const nav = document.querySelector('.main-nav');
    if(nav.style.display==='flex'){ nav.style.display='none'; } else { nav.style.display='flex'; nav.style.flexDirection='column'; }
  });
});
