(function(){
  // Helpers
  function qs(sel, ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Modal and guided exercises
  var modal = qs('#guidedModal');
  var tryBtn = qs('#tryNowBtn');
  var closeBtn = qs('#modalClose');
  var exerciseArea = qs('#exerciseArea');
  var modalTitle = qs('#modalTitle');

  function openModal(){modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
  function closeModal(){modal.setAttribute('aria-hidden','true');document.body.style.overflow='');resetExercise();}

  tryBtn && tryBtn.addEventListener('click', function(){ openModal(); });
  closeBtn && closeBtn.addEventListener('click', function(){ closeModal(); });
  modal && modal.addEventListener('click', function(e){ if(e.target===modal) closeModal(); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && modal.getAttribute('aria-hidden')==='false') closeModal(); });

  // Exercise behaviors
  var breathTimer = null; var breathIndex = 0; var breathPhase = null;
  function resetExercise(){ if(breathTimer) {clearTimeout(breathTimer);breathTimer=null;} exerciseArea.innerHTML=''; }

  function startBreathing(){
    modalTitle.textContent = 'Breathing — 2 minutes';
    var container = document.createElement('div');
    container.className = 'breath';
    var instruction = document.createElement('div'); instruction.className='instruction';
    var circle = document.createElement('div'); circle.className='breath-circle';
    container.appendChild(circle); container.appendChild(instruction);
    exerciseArea.innerHTML=''; exerciseArea.appendChild(container);

    var sequence = [ {label:'Breathe in', len:4000}, {label:'Hold', len:4000}, {label:'Breathe out', len:6000} ];
    var cycles = Math.floor((2*60*1000) / (4000+4000+6000)); // ~2 minutes
    var cycle = 0; breathIndex = 0;
    function step(){
      var cur = sequence[breathIndex];
      instruction.textContent = cur.label;
      // animate circle size
      circle.style.transition = 'transform '+(cur.len/1000)+'s ease';
      if(cur.label==='Breathe in'){ circle.style.transform='scale(1.25)'; }
      else if(cur.label==='Hold'){ circle.style.transform='scale(1.1)'; }
      else { circle.style.transform='scale(0.7)'; }
      breathTimer = setTimeout(function(){ breathIndex = (breathIndex+1) % sequence.length; if(breathIndex===0){ cycle++; if(cycle>=cycles){ resetExercise(); exerciseArea.innerHTML='<p>Nice—end of practice. Take this steadier rhythm forward today.</p>'; return; }} step(); }, cur.len);
    }
    step();
  }

  function startJournaling(){
    modalTitle.textContent = 'Journaling — 6 minutes';
    exerciseArea.innerHTML = '';
    var prompts = [
      'What felt like a win today?',
      'Where did I notice tension and why?',
      'One small action to try tomorrow.'
    ];
    var idx=0;
    var promptEl = document.createElement('div'); promptEl.className='prompt'; promptEl.textContent = prompts[idx];
    var textarea = document.createElement('textarea'); textarea.rows=6; textarea.placeholder='Write freely...';
    var next = document.createElement('button'); next.className='btn'; next.textContent='Next prompt';
    var finish = document.createElement('button'); finish.className='btn'; finish.textContent='Finish';
    var controls = document.createElement('div'); controls.style.display='flex'; controls.style.gap='8px'; controls.appendChild(next); controls.appendChild(finish);
    exerciseArea.appendChild(promptEl); exerciseArea.appendChild(textarea); exerciseArea.appendChild(controls);
    next.addEventListener('click', function(){ idx = (idx+1) % prompts.length; promptEl.textContent = prompts[idx]; textarea.focus(); });
    finish.addEventListener('click', function(){ exerciseArea.innerHTML = '<p>Thanks — journaling like this builds clarity. Keep a copy of your notes if you want to track progress.</p>'; });
  }

  function startIntention(){
    modalTitle.textContent = 'Set an intention';
    exerciseArea.innerHTML='';
    var form = document.createElement('form');
    var input = document.createElement('input'); input.type='text'; input.placeholder='Write a short intention (e.g., "Pause before email")'; input.style.width='100%'; input.required=true;
    var submit = document.createElement('button'); submit.className='btn btn-primary'; submit.textContent='Save intention'; submit.type='submit';
    form.appendChild(input); form.appendChild(document.createElement('div')).style.height='8px'; form.appendChild(submit);
    form.addEventListener('submit', function(e){ e.preventDefault(); exerciseArea.innerHTML = '<p>Intentions saved for this session: "'+(input.value||'—')+'". Try linking it to a cue in your day.</p>'; });
    exerciseArea.appendChild(form);
  }

  // Delegate modal buttons
  qs('.modal-controls') && qs('.modal-controls').addEventListener('click', function(e){ var a = e.target.closest('button[data-action]'); if(!a) return; var action = a.getAttribute('data-action'); resetExercise(); if(action==='breathing') startBreathing(); if(action==='journaling') startJournaling(); if(action==='intention') startIntention(); });

  // Reveal on scroll
  document.addEventListener('DOMContentLoaded', function(){
    var prefersReduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    var reveals = qsa('.reveal');
    if(prefersReduced){ reveals.forEach(function(el){ el.classList.add('in-view'); }); return; }
    var io = new IntersectionObserver(function(items){ items.forEach(function(i){ if(i.isIntersecting){ i.target.classList.add('in-view'); io.unobserve(i.target); } }); }, {threshold:0.12});
    reveals.forEach(function(r){ io.observe(r); });
  });

})();