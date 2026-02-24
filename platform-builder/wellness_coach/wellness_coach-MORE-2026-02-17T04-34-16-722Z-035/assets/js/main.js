// Interactive Mood-to-Method + 30-day path map
document.addEventListener('DOMContentLoaded',function(){
  // Mood selector
  const moodSelect = document.getElementById('moodSelect');
  const moodLabel = document.getElementById('moodLabel');
  const moodDesc = document.getElementById('moodDesc');
  const moodCta = document.getElementById('moodCta');
  const heroPrimary = document.getElementById('heroPrimary');
  const primaryCta = document.getElementById('primaryCta');
  const finalPrimary = document.getElementById('finalPrimary');

  const MOODS = {
    stressed: {
      name: 'Soothing Reset',
      desc: 'Short rituals and micro-breaks to release tension across a week.',
      cta: 'Start a Soothing Reset',
      tag: 'stressed'
    },
    stuck: {
      name: 'Tiny Unstick',
      desc: 'One tiny, repeatable move to rebuild momentum — tested in days.',
      cta: 'Try Tiny Unstick',
      tag: 'stuck'
    },
    energized: {
      name: 'Amplify Flow',
      desc: 'Channel energy into short, focused bursts and a simple review ritual.',
      cta: 'Amplify Flow Now',
      tag: 'energized'
    },
    curious: {
      name: 'Micro-Adventure',
      desc: 'Experiment with playful micro-tasks and note what lands.',
      cta: 'Launch a Micro-Adventure',
      tag: 'curious'
    }
  };

  moodSelect.addEventListener('click',function(e){
    const btn = e.target.closest('button');
    if(!btn) return;
    const mood = btn.dataset.mood;
    if(!MOODS[mood]) return;
    const data = MOODS[mood];
    moodLabel.textContent = data.name;
    moodDesc.textContent = data.desc;
    // Update CTA text and add query tag
    const newLabel = data.cta;
    const url = ({{PRIMARY_CTA_URL}} || '') + '?mood=' + data.tag;
    // If placeholders are present (server will replace), keep them for now but update visible text
    moodCta.textContent = newLabel;
    heroPrimary.textContent = newLabel;
    primaryCta.textContent = newLabel;
    finalPrimary.textContent = newLabel;
    // attach mood tag as data attribute for client flows
    moodCta.dataset.tag = data.tag;
    heroPrimary.dataset.tag = data.tag;
    primaryCta.dataset.tag = data.tag;
    finalPrimary.dataset.tag = data.tag;
  });

  // Path map
  const goalForm = document.getElementById('goalForm');
  const drawPathBtn = document.getElementById('drawPath');
  const pathCanvas = document.getElementById('pathCanvas');
  const pathSummary = document.getElementById('pathSummary');

  function randomChoice(arr){return arr[Math.floor(Math.random()*arr.length)];}

  const GOAL_MAP = {
    sleep: {color:'#6b8cff', actions:['Wind-down minute','Lighting check','Pre-sleep note']},
    movement: {color:'#ff6b6b', actions:['3-min walk','Desk stretch','3 squats']},
    mindfulness: {color:'#ffb86b', actions:['2-min breath','Body scan','Check-in']},
    hydration: {color:'#6bffb0', actions:['Glass before meal','Sip timer','Flavor water']},
    workspace: {color:'#b86bff', actions:['Desk clear','Air/plant','Posture check']}
  };

  function renderPath(selected){
    pathCanvas.innerHTML = '';
    if(selected.length===0){
      pathSummary.textContent = 'No goals selected yet.';
      return;
    }
    const bullets = [];
    // for 30 days create dots, rotate actions
    for(let d=1;d<=30;d++){
      const dot = document.createElement('span');
      dot.className = 'dot';
      // choose a goal to emphasize that day
      const goal = selected[(d-1)%selected.length];
      const meta = GOAL_MAP[goal];
      dot.style.background = meta.color;
      dot.title = 'Day ' + d + ' — ' + randomChoice(meta.actions);
      pathCanvas.appendChild(dot);
      bullets.push({day:d,goal:goal,action:dot.title});
      if(d%10===0) pathCanvas.appendChild(document.createElement('br'));
    }
    pathSummary.textContent = 'Mapped ' + selected.length + ' goal(s) across 30 days. Hover a dot for the day action.';
    // also expose a simple map object on window for demo/export
    window._lastPath = {generatedAt:Date.now(), goals:selected, bullets:bullets};
  }

  drawPathBtn.addEventListener('click',function(){
    const form = new FormData(goalForm);
    const goals = [];
    for(const val of form.getAll('goals')) goals.push(val);
    renderPath(goals);
  });

  // quick demo default: preselect movement + mindfulness
  // do not auto-run on small screens
  if(window.innerWidth>520){
    // prefill a light map
    const inputs = goalForm.querySelectorAll('input[name="goals"]');
    inputs.forEach(i=>{ if(i.value==='movement' || i.value==='mindfulness') i.checked=true });
    drawPathBtn.click();
  }

});
