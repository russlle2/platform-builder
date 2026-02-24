(function(){
  // Basic DOM helpers
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // Modal logic
  const modal = $('#exerciseModal');
  const overlay = $('#modalOverlay');
  const openButtons = ['#tryExercise','#tryExercise2'];
  const closeBtn = modal.querySelector('.modal-close');

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    // reset content
    $('#exerciseTitle').textContent = 'Guided practice';
    $('#exerciseContent').innerHTML = '<p>Select a short practice:</p>'+
      '<div class="exercise-controls">'+
      '<button class="btn" data-ex="breathing">Breathing</button>'+
      '<button class="btn" data-ex="journaling">Journaling</button>'+
      '<button class="btn" data-ex="intention">Set an intention</button>'+
      '</div>';
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    overlay.hidden = true;
    document.body.style.overflow = '';
  }
  openButtons.forEach(id => {
    const b = $(id);
    if(b) b.addEventListener('click', openModal);
  });
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  // Delegate inside modal for exercise choices
  modal.addEventListener('click', function(e){
    const ex = e.target.getAttribute && e.target.getAttribute('data-ex');
    if(!ex) return;
    startExercise(ex);
  });

  // Guided exercise flows
  function startExercise(type){
    const title = $('#exerciseTitle');
    const content = $('#exerciseContent');
    if(type === 'breathing'){
      title.textContent = 'Guided breathing — 1 minute';
      content.innerHTML = '<p style="margin-top:0">Find a comfortable seat. Follow the cues below. (You can stop at any time.)</p>'+
        '<div id="breathBox" style="display:flex;gap:1rem;align-items:center;flex-direction:column">'+
        '<svg width="120" height="120" viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" stroke="#cfeff1" stroke-width="6" fill="none"></circle><circle id="pulse" cx="50" cy="50" r="30" stroke="#0a7f8c" stroke-width="6" fill="none" stroke-linecap="round" transform="rotate(-90 50 50)" stroke-dasharray="188" stroke-dashoffset="188"></circle></svg>'+
        '<div id="breathText" style="font-weight:600;color:#094244">Breathe in…</div>'+
        '<div style="display:flex;gap:.5rem"><button class="btn" id="stopBreath">Stop</button></div>'+
        '</div>';
      // animation
      const pulse = document.getElementById('pulse');
      const breathText = document.getElementById('breathText');
      const stop = document.getElementById('stopBreath');
      let running = true;
      stop.addEventListener('click', ()=>{running=false; closeModal();});
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(prefersReduced){
        breathText.textContent = 'Take slow breaths for one minute.';
        setTimeout(()=>{if(running) closeModal();}, 60000);
        return;
      }
      // cycle: inhale 4s, hold 2s, exhale 6s -> 12s per cycle -> 5 cycles = 60s
      let cycle = 0;
      function animateCycle(){
        if(!running) return;
        cycle++;
        // inhale
        breathText.textContent = 'Breathe in — 4';
        animateDash(188, 0, 4000);
        countdown(breathText,4).then(()=>{
          // hold
          breathText.textContent = 'Hold — 2';
          return countdown(breathText,2);
        }).then(()=>{
          // exhale
          breathText.textContent = 'Breathe out — 6';
          animateDash(0,188,6000);
          return countdown(breathText,6);
        }).then(()=>{
          if(cycle < 5 && running) animateCycle();
          else { if(running) closeModal(); }
        });
      }
      function animateDash(from,to,duration){
        const start = performance.now();
        function step(now){
          const p = Math.min(1,(now-start)/duration);
          const val = from + (to-from)*p;
          pulse.style.strokeDashoffset = 188 - val;
          if(p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }
      function countdown(el,sec){
        return new Promise(res=>{
          let s = sec;
          el.textContent = (el.textContent.split('—')[0]||'').trim() + ' — ' + s;
          const t = setInterval(()=>{
            s--;
            if(s<=0){ clearInterval(t); res(); }
            else el.textContent = (el.textContent.split('—')[0]||'').trim() + ' — ' + s;
          },1000);
        });
      }
      animateCycle();
    }
    else if(type === 'journaling'){
      title.textContent = '3-minute reflective journaling';
      content.innerHTML = '<p>Set a timer for three minutes and write freely in the space below. Focus prompts are provided to help you begin.</p>'+
        '<div style="display:flex;flex-direction:column;gap:.5rem"><label for="prompt">Prompt</label><select id="prompt"><option>What is asking for my attention right now?</option><option>What do I need to let go of?</option><option>What small action would help today?</option></select></div>'+
        '<textarea id="journal" rows="6" style="width:100%;margin-top:.5rem;padding:.6rem;border-radius:6px;border:1px solid #e6eef0"></textarea>'+
        '<div style="display:flex;gap:.5rem;margin-top:.5rem"><button class="btn" id="startJournal">Start 3-min timer</button><button class="btn" id="stopJournal">Close</button></div>';
      const start = $('#startJournal');
      const stop = $('#stopJournal');
      start.addEventListener('click',()=>{
        start.disabled = true; const timer = 180; let s = timer; start.textContent = '00:03:00';
        const it = setInterval(()=>{
          s--; const mm = String(Math.floor(s/60)).padStart(2,'0'); const ss = String(s%60).padStart(2,'0'); start.textContent = `${mm}:${ss}`;
          if(s<=0){ clearInterval(it); start.textContent='Done'; start.disabled=false; }
        },1000);
      });
      stop.addEventListener('click',()=>closeModal());
    }
    else if(type === 'intention'){
      title.textContent = 'Set a short intention';
      content.innerHTML = '<p>Make an intention that is small and specific. Use the steps below to name it and plan one tiny action.</p>'+
        '<ol><li>Name one outcome you care about.</li><li>Choose one small action you can do today.</li><li>Decide when you will do it and how you will remind yourself.</li></ol>'+
        '<div style="display:flex;flex-direction:column;gap:.5rem;margin-top:.5rem"><input id="intendText" placeholder="My intention…" style="padding:.6rem;border-radius:6px;border:1px solid #e6eef0"><input id="intendAction" placeholder="My small action…" style="padding:.6rem;border-radius:6px;border:1px solid #e6eef0"></div>'+
        '<div style="display:flex;gap:.5rem;margin-top:.5rem"><button class="btn" id="saveIntent">Save intention</button><button class="btn" id="closeIntent">Close</button></div>';
      $('#saveIntent').addEventListener('click',()=>{
        const t = $('#intendText').value || 'My intention';
        const a = $('#intendAction').value || 'One small action';
        // show a simple confirmation — nothing stored server-side
        $('#exerciseContent').innerHTML = '<p style="font-weight:600">Saved (temporary):</p><p>'+t+'</p><p style="font-size:.95rem;color:var(--muted);">Action: '+a+'</p><div style="margin-top:.6rem"><button class="btn" id="doneIntent">Close</button></div>';
        $('#doneIntent').addEventListener('click', closeModal);
      });
      $('#closeIntent').addEventListener('click', closeModal);
    }
  }

  // Simple reveal on scroll with reduced-motion respect
  const reveals = $$('.reveal');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(prefersReduced){
    reveals.forEach(r=>r.classList.add('visible'));
  } else if('IntersectionObserver' in window){
    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    },{threshold:0.12});
    reveals.forEach(r=>obs.observe(r));
  } else {
    // fallback: reveal on scroll
    const onScroll = ()=>{
      const h = window.innerHeight;
      reveals.forEach(r=>{
        if(r.classList.contains('visible')) return;
        const rect = r.getBoundingClientRect();
        if(rect.top < h - 60){ r.classList.add('visible'); }
      });
    };
    window.addEventListener('scroll', onScroll); onScroll();
  }

  // Minimal mobile menu toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if(menuToggle){
    menuToggle.addEventListener('click', ()=>{
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!expanded));
      if(nav) nav.style.display = expanded ? 'none' : 'block';
    });
  }
})();