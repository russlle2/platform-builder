(function(){
  // Session Planner
  const buildBtn = document.getElementById('planner-build');
  const copyBtn = document.getElementById('planner-copy');
  const output = document.getElementById('planner-output');

  function buildPlan(){
    const focus = document.getElementById('planner-focus').value;
    const length = document.getElementById('planner-length').value;
    const freq = document.getElementById('planner-frequency').value;
    const objective = document.getElementById('planner-objective').value.trim() || 'No single objective set.';
    const habitsRaw = document.getElementById('planner-habits').value.trim();
    const habits = habitsRaw ? habitsRaw.split(',').map(h=>h.trim()).filter(Boolean) : [];
    const header = `${focus} — ${length} (${freq})`;
    const planLines = [];
    planLines.push(header);
    planLines.push('\nObjective: ' + objective);
    if(habits.length){
      planLines.push('\nMicro-habits:');
      habits.forEach((h,i)=>planLines.push(`  ${i+1}. ${h}`));
    } else {
      planLines.push('\nMicro-habits: none listed');
    }
    planLines.push('\nSuggested structure:');
    planLines.push('  • Opening 3-5 min: settle + check-in');
    planLines.push('  • Core work: 60-70% of session on the objective');
    planLines.push('  • Closing 5 min: concrete next step and micro-habit to try');

    const result = planLines.join('\n');
    output.textContent = result;
  }

  function copyPlan(){
    const text = output.textContent || '';
    if(!text) return;
    navigator.clipboard && navigator.clipboard.writeText(text).then(()=>{
      copyBtn.textContent = 'Copied';
      setTimeout(()=>copyBtn.textContent='Copy summary',1200);
    }).catch(()=>{
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      copyBtn.textContent='Copied';
      setTimeout(()=>copyBtn.textContent='Copy summary',1200);
    });
  }

  buildBtn && buildBtn.addEventListener('click', buildPlan);
  copyBtn && copyBtn.addEventListener('click', copyPlan);

  // 7-day Habit Challenge Generator
  const genBtn = document.getElementById('habit-generate');
  const printBtn = document.getElementById('habit-print');
  const habitOutput = document.getElementById('habit-output');

  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  function rotateDays(start){
    const idx = days.indexOf(start);
    if(idx<0) return days.slice();
    return days.slice(idx).concat(days.slice(0,idx));
  }

  function generateChecklist(){
    const name = document.getElementById('habit-name').value.trim() || 'Unnamed habit';
    const target = document.getElementById('habit-target').value.trim() || '';
    const start = document.getElementById('habit-start').value;
    const order = rotateDays(start);
    const table = document.createElement('table');
    table.style.width='100%';
    table.style.borderCollapse='collapse';
    table.innerHTML = `<thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #e6f3ec">${name}${target?(' — '+target):''}</th><th style="text-align:right;padding:8px;border-bottom:1px solid #e6f3ec">Week</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    for(let i=0;i<7;i++){
      const tr = document.createElement('tr');
      tr.innerHTML = `<td style="padding:8px;border-bottom:1px solid #f0faf4">${order[i]}</td><td style="padding:8px;border-bottom:1px solid #f0faf4;text-align:right"><input type='checkbox' data-day='${order[i]}' /></td>`;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    habitOutput.innerHTML='';
    habitOutput.appendChild(table);
  }

  function printChecklist(){
    const content = habitOutput.innerHTML || '<p>No checklist generated.</p>';
    const name = document.getElementById('habit-name').value.trim() || '7-day Habit';
    const win = window.open('','_blank','noopener');
    if(!win) return alert('Pop-up blocked. Please allow pop-ups to print.');
    const html = `<!doctype html><html><head><title>${name}</title><meta charset="utf-8"><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#123}table{width:100%;border-collapse:collapse}th,td{padding:10px;border:1px solid #e6f3ec}</style></head><body><h2>${name}</h2>${content}</body></html>`;
    win.document.write(html);
    win.document.close();
    win.print();
  }

  genBtn && genBtn.addEventListener('click', generateChecklist);
  printBtn && printBtn.addEventListener('click', printChecklist);

})();