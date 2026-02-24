(function(){
  // Utility: copy text
  function copyToClipboard(text){
    if(navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); }catch(e){}
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  // Quick intake: prepares starter note
  var qiBtn = document.getElementById('qi-submit');
  if(qiBtn){
    qiBtn.addEventListener('click',function(){
      var focus = document.getElementById('qi-focus').value;
      var avail = document.getElementById('qi-availability').value;
      var note = 'Quick intake note:\n• Focus: '+focus+'\n• Availability: '+avail+'\n\nBring this to your first consult.';
      alert(note);
    });
  }

  // Inventory widget
  var inventoryBuild = document.getElementById('inventory-build');
  var inventoryReset = document.getElementById('inventory-reset');
  var inventoryOutput = document.getElementById('agenda-text');
  function buildAgenda(){
    var checked = Array.from(document.querySelectorAll('#inventory-form input[name="areas"]:checked')).map(function(i){return i.value});
    if(!checked.length){ inventoryOutput.textContent = 'No areas selected. Choose items to generate a sample agenda and cadence.'; return; }
    // Prioritize: keep order as selected
    var agendaLines = [];
    agendaLines.push('Draft consultation agenda');
    agendaLines.push('---------------------');
    agendaLines.push('Initial visit (60 min):');
    var top = checked.slice(0,4);
    top.forEach(function(a,i){ agendaLines.push((i+1)+'. '+a+' — brief history, current patterns, one small practical strategy.'); });
    if(checked.length>4) agendaLines.push('\nAdditional topics to note: '+checked.slice(4).join(', ')+'.');
    // Suggest cadence based on complexity (simple heuristic)
    var cadence = '';
    if(checked.length<=2) cadence = 'Follow-up: every 3–4 weeks to refine strategies.';
    else if(checked.length<=4) cadence = 'Follow-up: every 2 weeks initially for 2–3 sessions, then reassess.';
    else cadence = 'Follow-up: weekly or biweekly check-ins early on, with regular reviews every 4–6 weeks.';
    agendaLines.push('\nSuggested follow-up cadence:');
    agendaLines.push(cadence);
    agendaLines.push('\nNotes: These are draft suggestions for discussion during your consult. Individual plans are customized and outcomes vary.');
    inventoryOutput.textContent = agendaLines.join('\n');
  }
  if(inventoryBuild) inventoryBuild.addEventListener('click', buildAgenda);
  if(inventoryReset) inventoryReset.addEventListener('click', function(){ document.querySelectorAll('#inventory-form input[name="areas"]').forEach(function(i){i.checked=false}); buildAgenda(); });

  // Copy and download for agenda
  document.getElementById('copy-agenda').addEventListener('click', function(){
    copyToClipboard(document.getElementById('agenda-text').textContent).then(function(){
      var btn = document.getElementById('copy-agenda'); btn.textContent = 'Copied'; setTimeout(function(){btn.textContent='Copy agenda'},1200);
    });
  });
  document.getElementById('download-agenda').addEventListener('click', function(){
    var text = document.getElementById('agenda-text').textContent || 'Agenda';
    var blob = new Blob([text],{type:'text/plain'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'consultation-agenda.txt'; document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
  });

  // Session Planner logic
  function gatherPlanner(){
    var name = document.getElementById('planner-name').value.trim();
    var goal = document.getElementById('planner-goal').value.trim();
    var length = document.getElementById('planner-length').value;
    var freq = parseInt(document.getElementById('planner-frequency').value,10) || 1;
    var months = parseInt(document.getElementById('planner-months').value,10) || 1;
    var focuses = Array.from(document.querySelectorAll('#planner-form input[name="focus"]:checked')).map(function(i){return i.value}).slice(0,4);
    return {name: name, goal: goal, length: length, freq: freq, months: months, focuses: focuses};
  }
  function buildPlan(){
    var p = gatherPlanner();
    var lines = [];
    lines.push('Personalized Session Plan');
    lines.push('=========================');
    if(p.name) lines.push('Participant: '+p.name);
    if(p.goal) lines.push('Primary goal: '+p.goal);
    lines.push('Session length: '+p.length+' min');
    lines.push('Sessions per month: '+p.freq);
    lines.push('Program length: '+p.months+' month(s)');
    if(p.focuses.length) lines.push('\nFocus areas: '+p.focuses.join(', '));
    // Build schedule summary
    var totalSessions = p.freq * p.months;
    lines.push('\nEstimated sessions: '+totalSessions+' (over '+p.months+' months)');
    // Offer pacing guidance (non-prescriptive)
    var guidance = 'Guidance: Use the first 2–3 sessions to establish priorities and practical micro-practices. Adjust cadence as needed.';
    lines.push(guidance);
    // Add suggested micro-habits from focuses
    if(p.focuses.length){
      lines.push('\nSuggested micro-practices:');
      p.focuses.forEach(function(f){
        var suggestion = '• '+f+': ';
        switch(f){
          case 'Sleep': suggestion += 'Consistent wind-down window (20–30 min) with one calming cue.'; break;
          case 'Digestion': suggestion += 'Simple landing routine before meals: hydration and two mindful chews.'; break;
          case 'Movement': suggestion += 'Short daily movement bursts (5–10 min) focusing on mobility.'; break;
          case 'Stress': suggestion += 'Brief breath cycles in moments of tension (3–5 slow breaths).'; break;
          case 'Respiration': suggestion += 'Daily 4–6 minute breath practice at the same time each day.'; break;
          case 'Habits': suggestion += 'One habit linked to an existing cue (e.g., after brushing teeth).'; break;
          case 'Medications': suggestion += 'Bring current list; we will review alignment and timing.'; break;
          default: suggestion += 'A small, repeatable step aligned to the focus.';
        }
        lines.push(suggestion);
      });
    }
    lines.push('\nNotes: Plans are individualized. This summary is a starting point for discussion with your clinician.');
    document.getElementById('plan-summary').textContent = lines.join('\n');
  }

  document.getElementById('build-plan').addEventListener('click', buildPlan);
  document.getElementById('clear-plan').addEventListener('click', function(){ document.getElementById('planner-form').reset(); document.getElementById('plan-summary').textContent='No plan yet. Fill the form and choose Build plan.'; });

  // Copy and download plan
  document.getElementById('copy-plan').addEventListener('click', function(){
    var text = document.getElementById('plan-summary').textContent || '';
    copyToClipboard(text).then(function(){ var b = document.getElementById('copy-plan'); b.textContent='Copied'; setTimeout(function(){b.textContent='Copy plan'},1200); });
  });
  document.getElementById('download-plan').addEventListener('click', function(){
    var text = document.getElementById('plan-summary').textContent || 'Plan';
    var blob = new Blob([text],{type:'text/plain'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'session-plan.txt'; document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
  });

  // Small accessibility helpers
  document.querySelectorAll('button').forEach(function(b){ b.addEventListener('keydown', function(e){ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); b.click(); } }); });
})();
