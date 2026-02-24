(function(){
  // Utilities
  function qs(id){return document.getElementById(id)}
  document.getElementById('year').textContent = new Date().getFullYear();

  // Guided Exercise Modal
  var modal = qs('exercise-modal');
  var tryBtn = qs('try-exercise');
  var closeBtn = qs('close-exercise');
  var startBtn = qs('start-exercise');
  var journalBtn = qs('start-journal');
  var instr = qs('exercise-instructions');
  var timerEl = qs('exercise-timer');
  var exerciseInterval;

  function openModal(){ modal.setAttribute('aria-hidden','false'); }
  function closeModal(){ modal.setAttribute('aria-hidden','true'); clearInterval(exerciseInterval); instr.textContent='Ready?'; timerEl.textContent='0'; }

  tryBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);

  // 2-minute breathing + intention sequence
  startBtn.addEventListener('click', function(){
    var steps = [
      {text:'Set an intention. One sentence.', time:6},
      {text:'Breathe in for 4', time:4},
      {text:'Hold for 4', time:4},
      {text:'Breathe out for 6', time:6},
      {text:'Repeat breathing cycle 6 times, slowly', time:36},
      {text:'Sit in quiet for the remaining moments', time:20}
    ];
    runSequence(steps, 2*60);
  });

  // Short journaling prompt instead
  journalBtn.addEventListener('click', function(){
    instr.textContent = 'Prompt: What small shift would make today easier? Write one line.';
    timerEl.textContent = '60';
    var t=60; clearInterval(exerciseInterval);
    exerciseInterval = setInterval(function(){ t--; timerEl.textContent = t; if(t<=0) clearInterval(exerciseInterval); },1000);
  });

  function runSequence(steps, total){
    var remaining = total; clearInterval(exerciseInterval);
    var stepIndex = 0; var localTimer;
    instr.textContent = steps[0].text; timerEl.textContent = steps[0].time;
    localTimer = steps[0].time;
    exerciseInterval = setInterval(function(){
      localTimer--; remaining--; timerEl.textContent = localTimer;
      if(localTimer<=0){
        stepIndex++;
        if(stepIndex>=steps.length || remaining<=0){ clearInterval(exerciseInterval); instr.textContent='Complete — gently open your eyes.'; timerEl.textContent='0'; return; }
        instr.textContent = steps[stepIndex].text;
        localTimer = steps[stepIndex].time;
        timerEl.textContent = localTimer;
      }
    },1000);
  }

  // Blend builder
  var vibeMap = {
    calm: {notes:['Lavender','Chamomile','Bergamot'], inhalation:'A soft inhalation: 2–3 short sniffs from a tissues or diffuser.'},
    focus:{notes:['Rosemary','Sweet orange','Peppermint'], inhalation:'Brief inhalations while at work; keep sessions short.'},
    sleep:{notes:['Lavender','Cedarwood','Ylang Ylang'], inhalation:'Diffuse briefly 20–30 minutes before bedtime.'},
    uplift:{notes:['Grapefruit','Basil','Ginger'], inhalation:'Use short inhalation bursts to reset mood.'}
  };

  var form = qs('blend-form');
  var vibe = qs('vibe');
  var carrier = qs('carrier');
  var strength = qs('strength');
  var strengthValue = document.querySelector('.strength-value');
  var output = qs('blend-output');
  var generate = qs('generate-blend');

  function pctToText(pct){ return pct + '% dilution — typical topical guidance for most adults when using in the carrier.' }

  strength.addEventListener('input', function(){
    var val = strength.value; strengthValue.textContent = val + '% dilution';
  });

  generate.addEventListener('click', function(){
    var v = vibe.value; var c = carrier.value; var s = parseFloat(strength.value);
    var picks = vibeMap[v];
    var notes = picks.notes.slice(0,3);
    // Construct safe dilution guide
    var guide = 'Blend card\nVibe: ' + v.charAt(0).toUpperCase() + v.slice(1) + '\nNotes: ' + notes.join(', ') + '\nCarrier: ' + c.replace(/_/g,' ') + '\nDilution: ' + pctToText(s);
    guide += '\n\nInhalation: ' + picks.inhalation;
    guide += '\n\nSafety: Patch test any topical use. Not for use undiluted. If pregnant or on medication, consult a professional. Keep out of reach of children and pets.';
    // Render visual card
    var cardHtml = '<div class="card"><h4>' + v.charAt(0).toUpperCase() + v.slice(1) + ' — Blend</h4>';
    cardHtml += '<p class="notes">' + notes.join(' • ') + '</p>';
    cardHtml += '<p class="meta">Carrier: ' + c.replace(/_/g,' ') + ' • Dilution: ' + s + '%</p>';
    cardHtml += '<pre class="guide">' + guide + '</pre>';
    cardHtml += '<button id="save-blend" class="btn primary">Save blend</button>';
    cardHtml += '</div>';
    output.innerHTML = cardHtml;

    // Attach save handler
    var saveBtn = qs('save-blend');
    if(saveBtn){
      saveBtn.addEventListener('click', function(){
        // create downloadable card text
        var blob = new Blob([guide],{type:'text/plain'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = url; a.download = (v + '-blend.txt');
        a.click(); URL.revokeObjectURL(url);
      });
    }
  });

  // Accessibility: close modal with Escape
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ closeModal(); } });

})();