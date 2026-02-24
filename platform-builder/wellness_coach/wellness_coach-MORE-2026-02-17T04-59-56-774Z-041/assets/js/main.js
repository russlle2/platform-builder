// Session planner and 7-day habit generator
document.addEventListener('DOMContentLoaded',function(){
  // Planner elements
  const nameInput=document.getElementById('p-name');
  const focusInput=document.getElementById('p-focus');
  const goalsInput=document.getElementById('p-goals');
  const habitInput=document.getElementById('p-habit');
  const checkInput=document.getElementById('p-check');
  const buildBtn=document.getElementById('build-session');
  const copyBtn=document.getElementById('copy-session');
  const output=document.getElementById('session-output');

  function buildSummary(){
    const who=nameInput.value.trim()||'Participant';
    const focus=focusInput.value;
    const goals=goalsInput.value.trim()||'Clarify one priority, choose a micro-habit, set a checkpoint.';
    const habit=habitInput.value.trim()||'Short habit of choice';
    const check=checkInput.value.trim()||'Check-in in 3 days';

    const date=new Date().toLocaleDateString();
    const summary=[
      `Session summary — ${date}`,
      `Name: ${who}`,
      `Focus area: ${focus}`,
      `3 goals: ${goals}`,
      `Micro-habit: ${habit}`,
      `Follow-up: ${check}`,
      '',
      'Session structure:',
      '- 5 min: arrival & context',
      '- 15-30 min: coaching prompts & practice',
      '- 5-10 min: commit to micro-habit & plan next check-in',
      '',
      'Next steps:',
      `- Try the micro-habit for 7 days`,
      `- Note wins and barriers for the follow-up (${check})`
    ].join('\n');

    output.textContent=summary;
    return summary;
  }

  buildBtn.addEventListener('click',function(){
    buildSummary();
    output.focus();
  });

  copyBtn.addEventListener('click',function(){
    const text=output.textContent;
    if(!text) return;
    navigator.clipboard.writeText(text).then(()=>{
      copyBtn.textContent='Copied!';
      setTimeout(()=>copyBtn.textContent='Copy summary',1200);
    }).catch(()=>{
      // fallback
      const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
      copyBtn.textContent='Copied!';setTimeout(()=>copyBtn.textContent='Copy summary',1200);
    });
  });

  // Habit builder
  const habitName=document.getElementById('habit-name');
  const habitAction=document.getElementById('habit-action');
  const habitLevel=document.getElementById('habit-level');
  const generateBtn=document.getElementById('generate-challenge');
  const printBtn=document.getElementById('print-checklist');
  const habitTitle=document.getElementById('habit-title');
  const habitList=document.getElementById('habit-list');

  function generateChecklist(){
    const name=habitName.value.trim()||'7-Day Challenge';
    const action=habitAction.value.trim()||'Micro-action of choice';
    const level=habitLevel.value;
    habitTitle.textContent=`${name} — ${level}`;
    // Build 7 entries with slight progress hints
    habitList.innerHTML='';
    for(let i=1;i<=7;i++){
      const li=document.createElement('li');
      li.textContent=`Day ${i}: ${action} (${i===7? 'Reflection day — note progress & tweak':'Do it — track time & ease'})`;
      habitList.appendChild(li);
    }
    // make checklist printable by copying into a print-area
    ensurePrintArea();
  }

  function ensurePrintArea(){
    let printArea=document.querySelector('.print-area');
    if(!printArea){
      printArea=document.createElement('div');
      printArea.className='print-area';
      document.body.appendChild(printArea);
    }
    printArea.innerHTML=`<h1>${habitTitle.textContent}</h1><ol>${Array.from(habitList.children).map(li=>`<li>${li.textContent}</li>`).join('')}</ol>`;
  }

  generateBtn.addEventListener('click',function(){
    generateChecklist();
  });

  printBtn.addEventListener('click',function(){
    ensurePrintArea();
    window.print();
  });

  // Quick open planner from hero
  const openPlanner=document.getElementById('open-planner');
  if(openPlanner){
    openPlanner.addEventListener('click',function(){
      document.getElementById('planner').scrollIntoView({behavior:'smooth',block:'center'});
      nameInput.focus();
    });
  }

});