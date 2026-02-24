(function(){
  // small helpers
  function qs(sel, ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // year in footer
  var yearEl = qs('#year'); if(yearEl) yearEl.textContent = new Date().getFullYear();

  // nav toggle
  var nt = qs('.nav-toggle'); var nav = qs('.main-nav');
  if(nt && nav){ nt.addEventListener('click',function(){ nav.classList.toggle('show'); }); }

  // Diagnostic
  var diagBtn = qs('#run-diagnostic');
  if(diagBtn){
    diagBtn.addEventListener('click',function(){
      var form = qs('#mini-diagnostic');
      var p = form.priority.value; var b = form.barrier.value; var t = form.time.value;
      var advice = 'Start with a single repeatable action each morning: choose one quick anchor ('+p+'), remove friction from it (prep the night before), and commit for '+t+'. If the barrier is "'+b+'", schedule the action at the moment the barrier is smallest.';
      qs('#diag-result').textContent = advice;
    });
  }

  // Session Planner
  function buildPlanText(data){
    var lines = [];
    lines.push('Session: '+data.name);
    lines.push('Outcome: '+data.outcome);
    lines.push('Length: '+data.length+' minutes');
    if(data.focus && data.focus.length){ lines.push('Focus areas: '+data.focus.join(', ')); }
    lines.push('Style: '+data.style);
    lines.push('---');
    // build steps based on style
    if(data.style==='Guided steps'){
      lines.push('1) 5-min settle: gather notes and set a single success metric.');
      lines.push('2) 20-min focused work: deliver on the primary outcome.');
      lines.push('3) 10-min review: capture decisions and next actions.');
      if(+data.length>45) lines.push('4) Stretch: allocate remaining time to refine or delegate.');
    } else if(data.style==='Timed blocks'){
      var block = Math.max(5, Math.round(data.length/3));
      lines.push('1) Block 1 — '+block+' mins: define and begin the top task.');
      lines.push('2) Block 2 — '+block+' mins: continue or switch to next critical piece.');
      lines.push('3) Block 3 — '+(data.length-2*block)+' mins: review and package outputs.');
    } else {
      lines.push('Checklist:');
      lines.push('- Clarify the single deliverable');
      lines.push('- Break into 3 small steps');
      lines.push('- Execute until the session end');
    }
    lines.push('Notes: Keep distractions off and set a timer.');
    return lines.join('\n');
  }

  var buildBtn = qs('#build-plan');
  var clearBtn = qs('#clear-plan');
  var planTextEl = qs('#plan-text');
  if(buildBtn){
    buildBtn.addEventListener('click',function(){
      var f = qs('#planner-form');
      var data = {
        name: f.sessionName.value || 'Untitled',
        outcome: f.outcome.value || 'Undefined outcome',
        length: f.length.value || 30,
        focus: Array.from(f.focus.selectedOptions||[]).map(function(o){return o.text}),
        style: f.style.value || 'Guided steps'
      };
      var text = buildPlanText(data);
      planTextEl.textContent = text;
    });
  }
  if(clearBtn){ clearBtn.addEventListener('click',function(){ qs('#planner-form').reset(); planTextEl.textContent='No plan yet — compose one to see the brief.'; }); }

  // copy & download plan
  var copyPlanBtn = qs('#copy-plan'); var downloadPlanBtn = qs('#download-plan');
  if(copyPlanBtn){ copyPlanBtn.addEventListener('click',function(){ navigator.clipboard.writeText(planTextEl.textContent).then(function(){ copyPlanBtn.textContent='Copied'; setTimeout(function(){copyPlanBtn.textContent='Copy summary';},1400); }); }); }
  if(downloadPlanBtn){ downloadPlanBtn.addEventListener('click',function(){ var blob = new Blob([planTextEl.textContent],{type:'text/plain'}); var url = URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download='session-plan.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }); }

  // Habit builder (7-day challenge)
  function weekdayIndex(start){ var days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']; return days.indexOf(start||'Monday'); }
  var habitForm = qs('#habit-form'); var generateHabit = qs('#generate-habit'); var habitTitle = qs('#habit-title'); var checklistEl = qs('#habit-checklist'); var copyHabit = qs('#copy-habit'); var printHabit = qs('#print-habit'); var downloadHabit = qs('#download-habit');

  function buildChecklist(name,intensity,startDay){
    var dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    var idx = weekdayIndex(startDay);
    var lines=[];
    for(var i=0;i<7;i++){
      var day = dayNames[(idx+i)%7];
      var note='Keep it small: ' + (intensity.indexOf('Gentle')!==-1? '5–10 min' : (intensity.indexOf('Moderate')!==-1? '10–20 min' : '20–40 min'));
      lines.push({label:day + ' — ' + name + ' ('+note+')', day:day});
    }
    return lines;
  }

  if(generateHabit){
    generateHabit.addEventListener('click',function(){
      var name = habitForm.habitName.value || 'New habit'; var intensity = habitForm.habitIntensity.value; var startDay = habitForm.startDay.value;
      var items = buildChecklist(name,intensity,startDay);
      habitTitle.textContent = name + ' — 7-day checklist';
      checklistEl.innerHTML = '';
      items.forEach(function(it,idx){
        var li = document.createElement('li');
        li.innerHTML = '<label><input type="checkbox" data-day="'+it.day+'"> '+it.label+'</label>';
        checklistEl.appendChild(li);
      });
    });
  }

  // habit copy & print & download
  if(copyHabit){ copyHabit.addEventListener('click',function(){ var lines = qsa('#habit-checklist li').map(function(li){ return li.textContent.trim(); }).filter(Boolean); navigator.clipboard.writeText(lines.join('\n')).then(function(){ copyHabit.textContent='Copied'; setTimeout(function(){copyHabit.textContent='Copy checklist';},1200); }); }); }
  if(printHabit){ printHabit.addEventListener('click',function(){ // open printable window
    var title = habitTitle.textContent||'7-day checklist';
    var lines = qsa('#habit-checklist li').map(function(li){ return '<li>'+li.textContent.trim()+'</li>'; }).join('');
    var w = window.open('','_blank','width=600,height=800');
    w.document.write('<!doctype html><html><head><title>'+title+'</title><style>body{font-family:Arial;padding:24px}h1{font-size:18px}ol{font-size:16px}</style></head><body><h1>'+title+'</h1><ol>'+lines+'</ol></body></html>');
    w.document.close();
    w.focus();
    setTimeout(function(){ w.print(); },400);
  }); }
  if(downloadHabit){ downloadHabit.addEventListener('click',function(){ var lines = qsa('#habit-checklist li').map(function(li){ return li.textContent.trim(); }); var blob = new Blob([lines.join('\n')],{type:'text/plain'}); var url = URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download='habit-checklist.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }); }

  // keyboard accessibility: copy plan with Ctrl+Shift+P
  document.addEventListener('keydown',function(e){ if(e.ctrlKey && e.shiftKey && e.key.toLowerCase()==='p'){ e.preventDefault(); if(planTextEl) navigator.clipboard.writeText(planTextEl.textContent || ''); } });

})();