(function(){
  // Utility
  function $(sel){return document.querySelector(sel)}
  function $all(sel){return Array.from(document.querySelectorAll(sel))}

  // DOM refs
  var moodSelect = $('#moodSelect');
  var methodName = $('#methodName');
  var methodDesc = $('#methodDesc');
  var primaryCta = $('#primaryCta');
  var previewBtn = $('#previewPlan');
  var goalsForm = $('#goalsForm');
  var pathMap = $('#pathMap');
  var pathSummary = $('#pathSummary');
  var pathAdvice = $('#pathAdvice');
  var finalPrimary = $('#finalPrimary');

  // Methods mapped to moods
  var methods = {
    scattered: {name:'Micro-Rituals', desc:'Short cues and end-of-block rituals to reclaim fragmented attention.', cta:'Start Micro‑Rituals'},
    fatigued: {name:'Energy Reset', desc:'Gentle, repeatable energy cues and rhythm adjustments to stabilize days.', cta:'Begin Energy Reset'},
    stuck: {name:'Momentum Sprint', desc:'A focused rhythm for measurable wins and weekly momentum.', cta:'Launch Momentum Sprint'},
    overcommitted: {name:'Boundary Protocol', desc:'Decision rules and simple boundaries to protect high-value time.', cta:'Adopt Protocol'},
    steady: {name:'Scaling Plan', desc:'Accelerate momentum with layered rituals and accountability nodes.', cta:'Scale Momentum'}
  };

  // Initial population
  function setMethodForMood(key){
    var m = methods[key] || methods.steady;
    methodName.textContent = m.name;
    methodDesc.textContent = m.desc;
    // update CTA text (keeps original href)
    primaryCta.textContent = m.cta + ' — ' + primaryCta.textContent.split('—').pop().trim();
    finalPrimary.textContent = m.cta;
  }
  setMethodForMood(moodSelect.value);

  moodSelect.addEventListener('change', function(e){
    setMethodForMood(e.target.value);
  });

  // Progress meter: create 30-day path map based on selected goals
  var goalColors = {
    sleep:'#8fbaf1',energy:'#ffd97a',focus:'#ffb3a7',boundaries:'#c9a7ff',momentum:'#7ee6b8'
  };

  function readGoals(){
    return $all('#goalsForm input[name="goal"]:checked').map(function(el){return el.value}).slice(0,3);
  }

  function renderPath(days, goals){
    // Clear
    pathMap.innerHTML = '';
    if(goals.length===0){
      pathSummary.textContent = 'No goals selected. Choose up to 3 to preview a path.';
      pathAdvice.textContent = '';
      return;
    }
    pathSummary.textContent = 'Preview: ' + goals.join(', ');

    // Distribute goal emphasis across 30 days in bands
    var bandSize = Math.max(5, Math.floor(days / Math.max(1, goals.length)));
    var dayItems = [];
    for(var d=1; d<=days; d++){
      var idx = Math.floor((d-1)/bandSize) % goals.length;
      // rhythmic boost on Sundays (every 7th day)
      var isMilestone = (d%7===0);
      var color = goalColors[goals[idx]] || '#ffffff';
      var el = document.createElement('div');
      el.className='day';
      el.dataset.day = d;
      el.style.background = isMilestone ? 'linear-gradient(180deg,#111 0%,'+color+'40 100%)' : color;
      el.title = 'Day '+d+' — focus: '+goals[idx];
      el.textContent = d%5===0?d:''; // sparse labels
      pathMap.appendChild(el);
      dayItems.push(el);
    }

    // Compose advice: weekly focuses
    var weeks = Math.ceil(days/7);
    var adviceLines = [];
    for(var w=0; w<weeks; w++){
      var start = w*7+1; var end = Math.min(days,(w+1)*7);
      var goalIndex = w % goals.length;
      adviceLines.push('Week '+(w+1)+': Day '+start+'–'+end+' — focus: '+goals[goalIndex]+'.');
    }
    pathAdvice.innerHTML = '<strong>Weekly focuses:</strong><br>'+adviceLines.join('<br>');

    // Small interactive detail: clicking a day highlights a suggest action
    pathMap.addEventListener('click', function(ev){
      var target = ev.target.closest('.day');
      if(!target) return;
      var d = +target.dataset.day;
      var goalForDay = target.title.split(' — ')[1];
      alert('Day '+d+': a focused action to support '+goalForDay+'.\nSuggested quick ritual: 5–10 minute anchor you can repeat.');
    });
  }

  // Hook up form changes
  goalsForm.addEventListener('change', function(){
    var goals = readGoals();
    // limit selection to 3 visually
    $all('#goalsForm input[name="goal"]').forEach(function(el){
      if(goals.length>=3 && !el.checked) el.disabled = true; else el.disabled = false;
    });
    renderPath(30, goals);
  });

  // Preview button toggles default suggestions
  previewBtn.addEventListener('click', function(){
    var goals = readGoals();
    if(goals.length===0){
      // pick defaults based on mood
      var mood = moodSelect.value;
      if(mood==='scattered') goals = ['focus','boundaries'];
      else if(mood==='fatigued') goals = ['sleep','energy'];
      else if(mood==='stuck') goals = ['momentum','focus'];
      else goals = ['momentum','boundaries'];
    }
    renderPath(30, goals);
    // Smooth scroll to map
    pathMap.scrollIntoView({behavior:'smooth',block:'center'});
  });

  // Set current year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Accessibility: enable keyboard for day click by enter
  pathMap.addEventListener('keydown', function(e){
    if(e.key==='Enter' && e.target.classList.contains('day')) e.target.click();
  });

  // Initialize a tiny default map for steady mood
  renderPath(30, ['momentum','focus']);
})();