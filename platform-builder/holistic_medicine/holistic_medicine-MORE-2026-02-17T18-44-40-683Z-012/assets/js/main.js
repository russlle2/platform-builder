(function(){
  // Utility: prefers-reduced-motion
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Section reveal with IntersectionObserver
  function initReveal(){
    const items = document.querySelectorAll('.reveal');
    if(items.length===0) return;
    if(reduceMotion){
      items.forEach(i=>i.classList.add('visible'));
      return;
    }
    const obs = new IntersectionObserver((entries, o)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('visible');
          o.unobserve(e.target);
        }
      });
    },{root:null,rootMargin:'0px 0px -10% 0px',threshold:0.12});
    items.forEach(i=>obs.observe(i));
  }

  // Guided exercise modal
  function createModal(){
    const root = document.getElementById('guided-root');
    if(!root) return;
    root.innerHTML = '';

    const modal = document.createElement('div');
    modal.className = 'guided-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.tabIndex = -1;

    modal.innerHTML = `
      <div class="guided-header">
        <strong>Try a short pause</strong>
        <button id="close-guided" aria-label="Close">✕</button>
      </div>
      <div class="guided-body">
        <p class="small">Choose a quick session to try: breathing, journaling, or setting an intention.</p>
        <div class="guided-controls">
          <button id="mode-breathe" class="cta outline">Breathing</button>
          <button id="mode-journal" class="cta outline">Journaling</button>
          <button id="mode-intent" class="cta outline">Intention</button>
        </div>
        <div id="guided-stage"></div>
      </div>
    `;

    root.appendChild(modal);

    // Close
    function close(){
      root.setAttribute('aria-hidden','true');
      root.innerHTML='';
      document.removeEventListener('keydown', escHandler);
      document.body.classList.remove('no-scroll');
    }
    document.getElementById('close-guided').addEventListener('click', close);
    function escHandler(e){ if(e.key==='Escape') close(); }
    document.addEventListener('keydown', escHandler);

    const stage = document.getElementById('guided-stage');

    // Breathe
    document.getElementById('mode-breathe').addEventListener('click', ()=>{
      stage.innerHTML = '';
      const info = document.createElement('div');
      info.innerHTML = '<p class="small">Follow a few paced breaths. We will do 5 cycles: inhale 4s, hold 2s, exhale 6s. Sit comfortably.</p>';
      const circle = document.createElement('div');
      circle.className = 'breathe-circle';
      circle.textContent = 'Ready';
      info.appendChild(circle);
      stage.appendChild(info);

      let step = 0; // 0 inhale,1 hold,2 exhale
      let cycle = 0;
      const totalCycles = 5;
      const labelMap = ['Inhale','Hold','Exhale'];
      const durations = [4000,2000,6000];

      function tick(){
        if(cycle>=totalCycles){ circle.textContent = 'Done'; return; }
        circle.textContent = labelMap[step] + ' ' + (cycle+1)+'/'+totalCycles;
        // animate size
        if(!reduceMotion){
          const scale = step===0?1.25:step===1?1.05:0.85;
          circle.style.transition = `transform ${durations[step]}ms ease-in-out`;
          circle.style.transform = `scale(${scale})`;
        }
        setTimeout(()=>{
          step = (step+1)%3;
          if(step===0) cycle++;
          tick();
        }, durations[step]);
      }
      // start after small delay
      setTimeout(tick,250);
    });

    // Journal
    document.getElementById('mode-journal').addEventListener('click', ()=>{
      stage.innerHTML = '';
      const instruct = document.createElement('p');
      instruct.className='small';
      instruct.textContent = 'A short journaling prompt: What was one small moment today that felt supportive? Write for 6 minutes.';
      const ta = document.createElement('textarea');
      ta.className='journal';
      ta.placeholder = 'Write here...';
      const saver = document.createElement('div');
      saver.style.display='flex';saver.style.gap='8px';saver.style.marginTop='8px';
      const saveBtn = document.createElement('button'); saveBtn.className='cta'; saveBtn.textContent='Save to device';
      const startBtn = document.createElement('button'); startBtn.className='cta outline'; startBtn.textContent='Start 6 min timer';
      saver.appendChild(saveBtn); saver.appendChild(startBtn);
      stage.appendChild(instruct); stage.appendChild(ta); stage.appendChild(saver);

      startBtn.addEventListener('click', ()=>{
        if(reduceMotion){ alert('Timer started — write freely.'); return; }
        let remaining = 6*60; // seconds
        startBtn.textContent = 'Time: 6:00';
        const timer = setInterval(()=>{
          remaining--;
          const m = Math.floor(remaining/60); const s = (remaining%60).toString().padStart(2,'0');
          startBtn.textContent = 'Time: '+m+':'+s;
          if(remaining<=0){ clearInterval(timer); startBtn.textContent='Done'; }
        },1000);
      });

      saveBtn.addEventListener('click', ()=>{
        try{
          const data = ta.value;
          const blob = new Blob([data],{type:'text/plain'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'journal.txt'; document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
        }catch(e){ console.warn(e); }
      });
    });

    // Intention
    document.getElementById('mode-intent').addEventListener('click', ()=>{
      stage.innerHTML = '';
      const p = document.createElement('p'); p.className='small'; p.textContent='Set a single intention: something simple you can try for one week.';
      const input = document.createElement('input'); input.type='text'; input.placeholder='My intention for this week...'; input.style.width='100%'; input.style.padding='10px'; input.style.borderRadius='8px'; input.style.border='1px solid #e6efe7';
      const save = document.createElement('button'); save.className='cta'; save.textContent='Save intention';
      stage.appendChild(p); stage.appendChild(input); stage.appendChild(save);
      save.addEventListener('click', ()=>{
        const val = input.value.trim();
        if(!val) return alert('Write a short intention.');
        localStorage.setItem('weekly_intention', val);
        alert('Saved: ' + val);
      });
    });

    root.setAttribute('aria-hidden','false');
    document.body.classList.add('no-scroll');
  }

  // Hook up Try it button
  document.addEventListener('DOMContentLoaded', ()=>{
    initReveal();
    const btn = document.getElementById('try-now');
    if(btn){
      btn.addEventListener('click', ()=>{
        createModal();
      });
    }
    // set year
    const y = new Date().getFullYear(); document.getElementById('year').textContent = y;
  });

})();
