(function(){
  // Set year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Scroll-triggered reveals
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  function revealIfVisible(el){
    var rect = el.getBoundingClientRect();
    if(rect.top < (window.innerHeight || document.documentElement.clientHeight) - 60){
      el.classList.add('in-view');
    }
  }

  if(!prefersReduced && 'IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('in-view'); io.unobserve(e.target); }
      });
    },{threshold:0.12});
    reveals.forEach(function(r){ io.observe(r); });
  } else {
    // graceful fallback or reduced motion: show all
    reveals.forEach(function(r){ r.classList.add('in-view'); });
  }

  // Session Planner widget
  var buildBtn = document.getElementById('buildPlan');
  var copyBtn = document.getElementById('copyPlan');
  var downloadLink = document.getElementById('downloadPlan');
  var clearBtn = document.getElementById('clearPlan');
  var planText = document.getElementById('planText');

  function gatherInputs(){
    var goal = document.getElementById('goal').value;
    var modalities = Array.from(document.getElementById('modalities').selectedOptions).map(function(o){return o.value;});
    var minutes = document.getElementById('dailyMinutes').value || '0';
    var freq = document.getElementById('frequency').value;
    var notes = document.getElementById('notes').value.trim();
    return {goal:goal,modalities:modalities,minutes:minutes,freq:freq,notes:notes};
  }

  function synthesizePlan(data){
    var lines = [];
    lines.push('Personal 4-week plan — ' + (new Date()).toLocaleDateString());
    lines.push('Goal: ' + data.goal);
    lines.push('Preferred supports: ' + (data.modalities.length?data.modalities.join(', '):'None selected'));
    lines.push('Daily commitment: ' + data.minutes + ' minutes');
    lines.push('Session rhythm: ' + (data.freq === '0.5' ? 'Fortnightly' : data.freq + 'x per week'));
    lines.push('');
    lines.push('Week 1 — gentle introduction:');
    lines.push('- Choose one short practice from the list below to try 3–5x this week.');
    if(data.modalities.indexOf('Breathwork')>-1) lines.push('  • 3-minute paced breathing after waking');
    if(data.modalities.indexOf('Movement')>-1) lines.push('  • 8-minute morning mobility sequence');
    if(data.modalities.indexOf('Nutrition support')>-1) lines.push('  • Simple food log for 3 meals/day');
    if(data.modalities.indexOf('Herbal or nutrient suggestions')>-1) lines.push('  • Brief trial of recommended nutrient (as discussed in session)');
    lines.push('');
    lines.push('Week 2 — build consistency:');
    lines.push('- Repeat selected practice; add one micro-habit around sleep or stress management.');
    lines.push('');
    lines.push('Weeks 3–4 — adjust and track:');
    lines.push('- Note what changed; increase practice frequency by 1–2 reps or minutes if comfortable.');
    if(data.notes) { lines.push(''); lines.push('Notes / constraints: ' + data.notes); }
    lines.push('');
    lines.push('Simple tracking: mark days when the practice occurred and write one sentence about effect.');
    lines.push('If symptoms persist or shift, consider scheduling a brief follow-up to review data and refine steps.');
    return lines.join('\n');
  }

  function updateDownload(text){
    var blob = new Blob([text],{type:'text/plain'});
    var url = URL.createObjectURL(blob);
    downloadLink.href = url;
  }

  if(buildBtn){
    buildBtn.addEventListener('click', function(){
      var data = gatherInputs();
      var plan = synthesizePlan(data);
      planText.textContent = plan;
      updateDownload(plan);
    });
  }

  if(copyBtn){
    copyBtn.addEventListener('click', function(){
      var text = planText.textContent || '';
      if(!navigator.clipboard){
        // fallback
        var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e){} document.body.removeChild(ta);
        alert('Plan copied to clipboard');
        return;
      }
      navigator.clipboard.writeText(text).then(function(){
        copyBtn.textContent = 'Copied';
        setTimeout(function(){ copyBtn.textContent = 'Copy summary'; },1500);
      }).catch(function(){ alert('Could not copy — please try manually.'); });
    });
  }

  if(clearBtn){
    clearBtn.addEventListener('click', function(){
      document.getElementById('plannerForm').reset();
      planText.textContent = 'No plan yet. Use the builder to generate a simple outline you can try.';
      downloadLink.href = '#';
    });
  }

})();