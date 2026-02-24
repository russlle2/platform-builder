(function(){
  // Session Planner and Whole-person Inventory
  function el(id){return document.getElementById(id)}

  // Inventory logic
  var invForm = el('inventory-form');
  var invGen = el('inventory-generate');
  var invOut = el('inventory-output');
  var invCopy = el('inventory-copy');

  function generateInventorySummary(areas){
    if(!areas.length) return 'No areas selected. Consider the parts of life you notice most.\n\nSuggested: pick 2–4 to focus on for the first visit.';
    var agenda = ['Intake & history (10–15m)'];
    // Prioritize tight items first
    areas.slice(0,4).forEach(function(a,i){
      agenda.push((i+1)+'. Explore: '+a+' (10–12m)');
    });
    agenda.push('Shared priorities & quick wins (5–10m)');
    agenda.push('Safety & referral check');

    var cadence = [];
    if(areas.length<=2) cadence.push('2–3 check-ins over 6–8 weeks; focus on early signals');
    else if(areas.length<=4) cadence.push('4 check-ins across 8–12 weeks; refine practices and measures');
    else cadence.push('Initial intensive (4 weeks) then transition to maintenance checks every 3–6 weeks');

    var txt = 'Whole-person inventory summary\n\nSelected areas: '+areas.join(', ')+'\n\nConsultation agenda:\n - '+agenda.join('\n - ')+'\n\nFollow-up cadence:\n - '+cadence.join('\n - ')+'\n\nNotes: Bring recent sleep, food, and movement notes where possible.';
    return txt;
  }

  invGen && invGen.addEventListener('click', function(){
    var checked = Array.from(invForm.querySelectorAll('input[name="area"]:checked')).map(function(i){return i.value});
    var summary = generateInventorySummary(checked);
    invOut.textContent = summary;
    invCopy.disabled = false;
  });

  invCopy && invCopy.addEventListener('click', function(){
    var txt = invOut.textContent || '';
    if(!txt) return;
    navigator.clipboard && navigator.clipboard.writeText(txt).then(function(){
      invCopy.textContent = 'Copied';
      setTimeout(function(){ invCopy.textContent = 'Copy summary' },1500);
    });
  });

  // Planner logic
  var planner = el('planner-form');
  var plannerBuild = el('planner-build');
  var plannerOut = el('planner-output');
  var plannerCopy = el('planner-copy');

  function buildPlan(){
    var pace = el('pace').value;
    var followups = Number(el('followups').value)||0;
    var notes = el('planner-notes').value.trim();
    var focuses = Array.from(planner.querySelectorAll('input[name="focus"]:checked')).map(function(i){return i.value});

    if(focuses.length>4) focuses = focuses.slice(0,4);

    var header = 'Personal session plan\n\nPace: '+(pace==='concise'? 'Concise (30-45m)': pace==='deep'? 'Deep (90m)': 'Standard (60m)');
    var body = '\nFocus areas: '+(focuses.length?focuses.join(', '): 'None selected')+'\n\nInitial steps:\n';

    if(focuses.length){
      focuses.forEach(function(f,i){
        body += '- '+(i+1)+'. Quick assessment of '+f+'; single testable suggestion\n';
      });
    } else {
      body += '- Review daily rhythms (sleep, food, movement) and set one micro-experiment\n';
    }

    body += '\nFollow-up plan:\n';
    if(followups>0){
      body += '- '+followups+' follow-up(s) planned across coming weeks; adjust frequency by early signals\n';
    } else {
      body += '- No scheduled follow-ups; consider 1 check-in in 2–4 weeks\n';
    }

    if(notes) body += '\nContext notes:\n'+notes+'\n';

    // integrate inventory if present
    var inventorySelected = Array.from(document.querySelectorAll('#inventory-form input[name="area"]:checked')).map(function(i){return i.value});
    if(inventorySelected.length){
      body += '\nFrom whole-person inventory: selected '+inventorySelected.join(', ')+'. Agenda and cadence will reflect these priorities.\n';
    }

    var closing = '\nNext practical step:\n- Book the chosen session and bring simple daily notes for 3–7 days.';

    return header+body+closing;
  }

  plannerBuild && plannerBuild.addEventListener('click', function(){
    var txt = buildPlan();
    plannerOut.textContent = txt;
    plannerCopy.disabled = false;
  });

  plannerCopy && plannerCopy.addEventListener('click', function(){
    var txt = plannerOut.textContent || '';
    if(!txt) return;
    navigator.clipboard && navigator.clipboard.writeText(txt).then(function(){
      plannerCopy.textContent = 'Copied';
      setTimeout(function(){ plannerCopy.textContent = 'Copy plan' },1500);
    });
  });

  // Small UX: limit focus choices to 4
  var focusInputs = Array.from(document.querySelectorAll('input[name="focus"]'));
  focusInputs.forEach(function(inp){
    inp.addEventListener('change', function(){
      var checked = focusInputs.filter(function(i){return i.checked});
      if(checked.length>4){
        this.checked = false; // refuse the fifth
        alert('Choose up to 4 focus areas');
      }
    });
  });

})();
