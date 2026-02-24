(function(){
  // Session Planner and Whole-Person Inventory
  function el(id){return document.getElementById(id)}
  var createBtn = el('create-plan');
  var clearBtn = el('clear-plan');
  var copyBtn = el('copy-plan');
  var downloadBtn = el('download-plan');
  var planText = el('plan-text');

  function mapAreaNotes(area){
    var map = {
      'Sleep': ['Review bedtime routine','Screening for sleep patterns','Simple wind-down practices'],
      'Stress': ['Identify stress triggers','Breath-based quick tools','Plan for small boundary shifts'],
      'Movement': ['Assess mobility needs','Simple strength/mobility plan','Home practice checklist'],
      'Nutrition': ['Review eating windows','Small swapping ideas','Food journaling prompt'],
      'Mindfulness': ['Short breath practices','Anchor techniques','Micro-meditation prompts'],
      'Relationships': ['Support network review','Communication micro-skills','Referral ideas if needed'],
      'Work': ['Schedule & workload review','Micro-scheduling tips','Pacing and rests plan'],
      'Environment': ['Environmental triggers audit','Declutter or ergonomics steps','Light/noise adjustments']
    };
    return map[area]||['Discuss: '+area];
  }

  function buildAgenda(name, focus, areas, length){
    var lines = [];
    lines.push((name? name+" — ":"") + 'Session plan ('+length+' min)');
    lines.push('Primary focus: '+focus);
    lines.push('');
    lines.push('Consultation agenda:');
    lines.push('- Brief history & priorities (10-20% of session)');
    if(areas.length){
      areas.forEach(function(a){
        var notes = mapAreaNotes(a);
        lines.push('- '+a+': '+notes[0]);
      });
    } else {
      lines.push('- Open exploration to identify priority areas');
    }
    lines.push('');
    lines.push('Suggested follow-up cadence:');

    // Build cadence suggestions based on number of areas
    if(areas.length >=5){
      lines.push('- Intensive first month: weekly 30–45 min check-ins for 4 weeks, then biweekly review');
    } else if(areas.length >=3){
      lines.push('- Moderate track: two check-ins in the first month (weeks 2 and 4), then monthly');
    } else if(areas.length >=1){
      lines.push('- Light track: single follow-up in 2–3 weeks, then adjust as needed');
    } else {
      lines.push('- Initial check-in in 2–3 weeks to set direction');
    }

    lines.push('');
    lines.push('Practical micro-goals (examples):');
    if(areas.length){
      areas.slice(0,4).forEach(function(a,i){
        var notes = mapAreaNotes(a);
        lines.push((i+1)+'. '+notes[1]+' — try for 7–14 days');
      });
    } else {
      lines.push('1. Track one habit for 7 days (sleep, food, or stress)');
    }

    lines.push('');
    lines.push('Notes: This plan is educational and supportive. It is not a medical diagnosis or promise of cure. Coordinate with your healthcare providers when relevant.');

    return lines.join('\n');
  }

  function getCheckedAreas(){
    var checks = Array.prototype.slice.call(document.querySelectorAll('.area:checked'));
    return checks.map(function(c){return c.value});
  }

  createBtn.addEventListener('click', function(){
    var name = el('client-name').value.trim();
    var focus = el('focus').value;
    var length = el('sess-length').value;
    var areas = getCheckedAreas();
    var text = buildAgenda(name, focus, areas, length);
    planText.textContent = text;
  });

  clearBtn.addEventListener('click', function(){
    document.getElementById('planner-form').reset();
    planText.textContent = 'No plan yet. Click "Create plan."';
  });

  copyBtn.addEventListener('click', function(){
    var text = planText.textContent;
    if(!navigator.clipboard){
      // fallback
      var ta = document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}catch(e){}ta.remove();
      alert('Plan copied to clipboard');
      return;
    }
    navigator.clipboard.writeText(text).then(function(){
      copyBtn.textContent = 'Copied';
      setTimeout(function(){copyBtn.textContent='Copy summary'},1500);
    },function(){alert('Unable to copy.');});
  });

  downloadBtn.addEventListener('click', function(){
    var text = planText.textContent || '';
    var blob = new Blob([text],{type:'text/plain;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'session-plan.txt'; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  // Accessibility: allow Enter to submit when focused on form
  document.getElementById('planner-form').addEventListener('submit', function(e){e.preventDefault();createBtn.click();});

})();
