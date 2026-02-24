(function(){
  'use strict';
  // Utility: prefers reduced motion
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll-triggered reveal
  function initReveal(){
    var sections = document.querySelectorAll('[data-reveal]');
    if(reduced){
      sections.forEach(function(s){s.classList.add('revealed');});
      return;
    }
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },{threshold:0.12});
    sections.forEach(function(s){observer.observe(s)});
  }

  // Modal + Guided exercise flow
  var modal = document.getElementById('exerciseModal');
  var tryBtn = document.getElementById('tryBtn');
  var tryNow = document.getElementById('tryNow');
  var closeModal = document.getElementById('closeModal');
  var exerciseArea = document.getElementById('exerciseArea');

  function openModal(){ modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  function closeModalFn(){ modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; resetExercise(); }
  if(tryBtn) tryBtn.addEventListener('click', openModal);
  if(tryNow) tryNow.addEventListener('click', openModal);
  if(closeModal) closeModal.addEventListener('click', closeModalFn);
  modal.addEventListener('click', function(e){ if(e.target===modal) closeModalFn(); });

  // Exercise selections
  var choices = document.querySelectorAll('.ex-choice');
  choices.forEach(function(b){ b.addEventListener('click', function(){ startExercise(b.getAttribute('data-mode')); }); });

  var breathTimer = null;
  function resetExercise(){
    clearInterval(breathTimer); breathTimer=null; exerciseArea.innerHTML='';
  }

  function startExercise(mode){
    resetExercise(); exerciseArea.removeAttribute('hidden');
    if(mode==='breath') buildBreathing();
    if(mode==='journal') buildJournaling();
    if(mode==='intention') buildIntention();
  }

  // Breathing exercise: simple inhale/hold/exhale cycles
  function buildBreathing(){
    var container = document.createElement('div'); container.className='breath-visual';
    var circle = document.createElement('div'); circle.className='pulse'; circle.textContent='Ready';
    var info = document.createElement('div'); info.className='muted small'; info.textContent='Follow the text. 3 cycles.';
    var controls = document.createElement('div'); controls.style.marginTop='8px';
    var start = document.createElement('button'); start.className='btn'; start.textContent='Start';
    var stop = document.createElement('button'); stop.className='btn'; stop.textContent='Stop'; stop.style.marginLeft='8px';
    controls.appendChild(start); controls.appendChild(stop);
    container.appendChild(circle); container.appendChild(info); container.appendChild(controls);
    exerciseArea.appendChild(container);

    var stages = [ {label:'Breathe in',sec:4},{label:'Hold',sec:2},{label:'Breathe out',sec:6} ];
    var totalCycles=3; var cycle=0; var stageIndex=0; var tick=0; var remaining=stages[0].sec;

    function step(){
      var stage = stages[stageIndex];
      circle.textContent = stage.label + '\n' + remaining + 's';
      // visual scale based on stage
      if(stage.label==='Breathe in') circle.style.transform='scale(1.18)';
      else if(stage.label==='Hold') circle.style.transform='scale(1.0)';
      else circle.style.transform='scale(0.86)';

      remaining--;
      if(remaining<0){
        stageIndex++;
        if(stageIndex>=stages.length){
          cycle++; if(cycle>=totalCycles){ clearInterval(breathTimer); circle.textContent='Done'; return; }
          stageIndex=0; remaining=stages[0].sec; return;
        }
        remaining=stages[stageIndex].sec;
      }
    }
    start.onclick=function(){ if(breathTimer) return; remaining=stages[0].sec; stageIndex=0; cycle=0; circle.style.transition='transform .4s ease'; breathTimer=setInterval(step,1000); step(); };
    stop.onclick=function(){ clearInterval(breathTimer); breathTimer=null; circle.textContent='Stopped'; };
  }

  // Journaling exercise: timed prompt + local save
  function buildJournaling(){
    var root = document.createElement('div');
    var prompt = document.createElement('p'); prompt.textContent = 'Write for 4 minutes: What did I notice today?';
    var area = document.createElement('textarea'); area.rows=8; area.style.width='100%'; area.placeholder='Your thoughts...';
    var timer = document.createElement('div'); timer.className='muted small'; timer.textContent='4:00';
    var controls = document.createElement('div'); controls.style.marginTop='8px';
    var start = document.createElement('button'); start.className='btn'; start.textContent='Start timer';
    var save = document.createElement('button'); save.className='btn'; save.textContent='Save note'; save.style.marginLeft='8px';
    controls.appendChild(start); controls.appendChild(save);
    root.appendChild(prompt); root.appendChild(area); root.appendChild(timer); root.appendChild(controls);
    exerciseArea.appendChild(root);

    var seconds=240; var tId=null;
    function format(s){var m=Math.floor(s/60);var ss=s%60;return m+':'+(ss<10?'0'+ss:ss)}
    timer.textContent=format(seconds);
    start.onclick=function(){ if(tId) return; tId=setInterval(function(){ seconds--; timer.textContent=format(seconds); if(seconds<=0){clearInterval(tId);tId=null;timer.textContent='Done';}},1000); };
    save.onclick=function(){ var notes = localStorage.getItem('soundbath_journal') || '[]'; try{ var arr=JSON.parse(notes); }catch(e){var arr=[];} arr.push({when:new Date().toISOString(),text:area.value}); localStorage.setItem('soundbath_journal',JSON.stringify(arr)); save.textContent='Saved'; setTimeout(function(){save.textContent='Save note'},1200); };
  }

  // Intention setting: quick guided prompts
  function buildIntention(){
    var root = document.createElement('div');
    var steps = [ 'Name one small aim for today.', 'How will you notice progress?', 'One short action you can take in the next hour.' ];
    var idx=0;
    var text = document.createElement('p'); text.textContent = steps[idx];
    var next = document.createElement('button'); next.className='btn'; next.textContent='Next';
    var done = document.createElement('button'); done.className='btn'; done.textContent='Finish'; done.style.marginLeft='8px';
    root.appendChild(text); root.appendChild(next); root.appendChild(done);
    exerciseArea.appendChild(root);
    next.onclick=function(){ idx++; if(idx>=steps.length) idx=steps.length-1; text.textContent=steps[idx]; };
    done.onclick=function(){ // store a minimal intention
      localStorage.setItem('soundbath_intention',JSON.stringify({when:new Date().toISOString(),note:steps[idx]})); text.textContent='Saved — a small steady step.'; next.style.display='none'; done.style.display='none'; };
  }

  // Kick off reveals when DOM ready
  document.addEventListener('DOMContentLoaded',function(){ initReveal(); });
})();