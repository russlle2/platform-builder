(function(){
  // helper
  function el(id){return document.getElementById(id)}
  // Year in footer
  var y= new Date().getFullYear(); var ye=el('year'); if(ye) ye.textContent=y;

  // SESSION PLANNER
  var buildBtn = el('build-plan');
  var clearBtn = el('clear-plan');
  var copyPlan = el('copy-plan');
  var downloadPlan = el('download-plan');
  var planText = el('plan-text');

  function makePlan(){
    var focus = el('focus').value || 'Undisclosed focus';
    var length = el('length').value || '50 min';
    var cadence = el('cadence').value || 'Weekly';
    var goals = el('goals').value.trim() || 'No details provided yet.';
    var supports = el('supports').value.trim() || 'None noted.';

    var sessions = [];
    // base blueprint for first 4 sessions
    sessions.push('Session 1 — Intake & priorities: share the story, set 1–2 practical goals.');
    sessions.push('Session 2 — Strategy building: introduce 1 tailored practice and a boundary or communication script.');
    sessions.push('Session 3 — Practice review: troubleshoot what worked, adjust tasks, plan next steps.');
    sessions.push('Session 4 — Consolidation: review progress; set a maintenance rhythm or next steps.');

    // adjust blueprint for short series
    if(cadence.includes('Short')){
      sessions = sessions.slice(0,3);
    }

    var habit = 'Micro-practice suggestion: a brief daily cue (2–10 minutes) tied to an existing routine.';

    var text = [];
    text.push('Session Planner — draft');
    text.push('Primary focus: ' + focus);
    text.push('Session length: ' + length + ' • Cadence: ' + cadence);
    text.push('\nStated goals:\n' + goals);
    text.push('\nSupports that have helped:\n' + supports);
    text.push('\nSuggested session outline:');
    sessions.forEach(function(s,i){ text.push((i+1)+'. '+s); });
    text.push('\n'+habit);
    text.push('\nNotes for consult: Bring any recent notes, a short timeline of the concern, and one concrete example you want to change.');

    return text.join('\n');
  }

  if(buildBtn){
    buildBtn.addEventListener('click', function(){
      planText.textContent = makePlan();
      // setup download link
      var blob = new Blob([planText.textContent],{type:'text/plain'});
      var url = URL.createObjectURL(blob);
      downloadPlan.href = url;
    });
  }
  if(clearBtn){
    clearBtn.addEventListener('click', function(){
      ['focus','length','cadence','goals','supports'].forEach(function(id){var elc=document.getElementById(id); if(elc) elc.value='';});
      planText.textContent='Use the form to generate a short plan — then copy to bring to your consult.';
    });
  }
  if(copyPlan){
    copyPlan.addEventListener('click', function(){
      navigator.clipboard.writeText(planText.textContent).then(function(){
        copyPlan.textContent='Copied'; setTimeout(function(){copyPlan.textContent='Copy plan'},1500);
      }).catch(function(){alert('Copy unavailable — please select and copy manually.');});
    });
  }

  // INTAKE WIZARD
  var steps = Array.from(document.querySelectorAll('.wizard .step'));
  function showStep(n){ steps.forEach(function(s){ s.classList.add('hidden'); }); var s = steps.find(function(x){ return x.dataset.step==n;}); if(s) s.classList.remove('hidden'); }
  document.querySelectorAll('.btn-next').forEach(function(btn){btn.addEventListener('click',function(){var n=this.dataset.next; showStep(n);});});
  document.querySelectorAll('.btn-prev').forEach(function(btn){btn.addEventListener('click',function(){var n=this.dataset.prev; showStep(n);});});

  var gen = el('generate-intake');
  var intakeText = el('intake-text');
  var copyIntake = el('copy-intake');
  var saveQuestions = el('save-questions');

  function makeIntake(){
    var focus = (el('w-focus')||{value:''}).value || 'Undisclosed focus';
    var duration = (el('w-duration')||{value:''}).value || 'Not specified';
    var helps = (el('w-helps')||{value:''}).value || 'None noted';
    var success = (el('w-success')||{value:''}).value || 'Not specified';

    var summary = [];
    summary.push('Intake summary');
    summary.push('Focus: '+focus);
    summary.push('Duration: '+duration);
    summary.push('\nWhat has helped:');
    summary.push(helps);
    summary.push('\nShort-term goal (3 months):');
    summary.push(success);

    // generate suggested questions to bring
    var questions = [];
    questions.push('1) Based on this focus, what short-term strategies might we try in the first 4 sessions?');
    questions.push('2) How will we measure progress in early sessions?');
    questions.push('3) Are there brief practices I can try between sessions?');
    questions.push('4) What should I mention if I feel more overwhelmed or notice new symptoms?');

    return {summary: summary.join('\n'), questions: questions.join('\n')};
  }

  if(gen){ gen.addEventListener('click', function(){ var out = makeIntake(); intakeText.textContent = out.summary + '\n\nSuggested questions to bring:\n' + out.questions; }); }
  if(copyIntake){ copyIntake.addEventListener('click', function(){ navigator.clipboard.writeText(intakeText.textContent).then(function(){ copyIntake.textContent='Copied'; setTimeout(function(){copyIntake.textContent='Copy summary'},1300); }).catch(function(){ alert('Use manual copy if needed.'); }); }); }
  if(saveQuestions){ saveQuestions.addEventListener('click', function(){ var out = makeIntake(); navigator.clipboard.writeText(out.questions).then(function(){ saveQuestions.textContent='Copied'; setTimeout(function(){saveQuestions.textContent='Copy questions'},1300); }).catch(function(){ alert('Use manual copy if needed.'); }); }); }

  // small accessibility: focus first step on load
  showStep(1);
})();