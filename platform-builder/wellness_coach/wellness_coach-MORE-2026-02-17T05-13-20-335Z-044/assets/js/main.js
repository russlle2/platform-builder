(function(){
  // Simple utilities
  function q(id){return document.getElementById(id)}
  function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt)e.textContent=txt;return e}

  // Modal management
  var modal = q('modal');
  var modalContent = q('modal-content');
  var modalClose = q('modal-close');
  function openModal(html){modalContent.innerHTML = ''; if(typeof html === 'string'){modalContent.innerHTML = html} else {modalContent.appendChild(html)}; modal.setAttribute('aria-hidden','false')}
  function closeModal(){modal.setAttribute('aria-hidden','true'); modalContent.innerHTML = ''}
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if(e.target === modal) closeModal(); });

  // Guided breathing exercise
  function breathingPane(){
    var pane = el('div','guided-breathe');
    pane.innerHTML = '\n      <h2>Breathe — a brief cycle</h2>\n      <p class="muted">A paced 4-4-6 cycle. Follow the words and the circle.</p>\n      <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">\n        <svg id="breath-circle" width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">\n          <circle cx="60" cy="60" r="46" stroke="#e6f2ee" stroke-width="10" fill="none"></circle>\n          <circle id="breath-arc" cx="60" cy="60" r="46" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" fill="none" stroke-dasharray="289" stroke-dashoffset="289"></circle>\n        </svg>\n        <div>\n          <div id="breath-instr" style="font-weight:600;font-size:1.05rem">Ready?</div>\n          <div style="margin-top:8px">\n            <button id="breath-start" class="btn primary">Start 3 cycles</button>\n            <button id="breath-stop" class="btn ghost">Stop</button>\n          </div>\n        </div>\n      </div>\n    ';

    setTimeout(function(){
      var start = pane.querySelector('#breath-start');
      var stop = pane.querySelector('#breath-stop');
      var instr = pane.querySelector('#breath-instr');
      var arc = pane.querySelector('#breath-arc');
      var running = false, timer = null, cycleCount = 0;

      function animateArc(frac){ arc.style.strokeDashoffset = String(289 - 289*frac); }

      function speak(text){ instr.textContent = text }

      function runCycle(){
        if(!running) return;
        cycleCount++;
        // inhale 4s
        speak('Inhale — 4'); animateArc(0); var t=0; var s1=setInterval(function(){ t+=0.1; animateArc(t/4); if(t>=4){ clearInterval(s1); speak('Hold — 4'); var u=0; var s2=setInterval(function(){ u+=0.1; if(u>=4){ clearInterval(s2); speak('Exhale — 6'); var v=0; var s3=setInterval(function(){ v+=0.1; animateArc(1 - v/6); if(v>=6){ clearInterval(s3); if(cycleCount<3) setTimeout(runCycle,400); else { running=false; speak('All done'); } } },100); } },100); } },100);
      }

      start.addEventListener('click', function(){ if(running) return; running=true; cycleCount=0; runCycle(); });
      stop.addEventListener('click', function(){ running=false; speak('Stopped'); });
    },10);

    return pane;
  }

  // Guided journaling exercise
  function journalPane(){
    var pane = el('div','guided-journal');
    pane.innerHTML = '\n      <h2>A short journaling prompt</h2>\n      <p class="muted">Pick one prompt. Write for 5 minutes. Keep it simple.</p>\n      <div class="prompt-list"></div>\n      <div style="margin-top:12px">\n        <label for="journal-time">Minutes:</label> <input id="journal-time" type="number" value="5" style="width:64px;padding:6px;margin-left:8px">\n        <button id="journal-start" class="btn primary">Start timer</button>\n      </div>\n      <div id="journal-timer" style="margin-top:12px;font-weight:600"></div>\n      <textarea id="journal-area" placeholder="Write here..." style="width:100%;height:140px;margin-top:12px;padding:10px;border-radius:8px;border:1px solid #eee"></textarea>\n      <div style="margin-top:10px"><button id="journal-save" class="btn">Save note</button></div>\n    ';

    setTimeout(function(){
      var prompts = [
        'What went well today and why?',
        'Where did I notice friction—and how small could a fix be?',
        'Name one tiny practice I can keep for the next week.'
      ];
      var list = pane.querySelector('.prompt-list'); prompts.forEach(function(p){ var b=el('button','btn ghost',p); b.style.display='block'; b.style.margin='6px 0'; b.addEventListener('click',function(){ q('journal-area').value = p + '\n'; }); list.appendChild(b); });
      var start = pane.querySelector('#journal-start'); var timerEl = pane.querySelector('#journal-timer'); var ta = pane.querySelector('#journal-area'); var save = pane.querySelector('#journal-save'); var timerId = null; start.addEventListener('click', function(){ var mins = parseInt(q('journal-time').value)||5; var remaining = mins*60; timerEl.textContent = formatTime(remaining); ta.focus(); clearInterval(timerId); timerId=setInterval(function(){ remaining--; timerEl.textContent = formatTime(remaining); if(remaining<=0){ clearInterval(timerId); timerEl.textContent = 'Time'; } },1000); }); save.addEventListener('click', function(){ var text = ta.value.trim(); if(!text) return alert('Write a line to save.'); var note = {text:text,date:new Date().toISOString()}; var notes = JSON.parse(localStorage.getItem('journal-notes'||'[]')||'[]'); notes.unshift(note); localStorage.setItem('journal-notes', JSON.stringify(notes)); alert('Saved locally — you can copy it to your notes app.'); });
    },10);

    function formatTime(s){ var m = Math.floor(s/60); var r = s%60; return m+':'+(r<10?'0'+r:r); }
    return pane;
  }

  // Attach Try it now handlers
  q('try-breathe').addEventListener('click', function(){ openModal(breathingPane()); });
  q('try-journal').addEventListener('click', function(){ openModal(journalPane()); });

  // Habit builder: generate 7-day checklist and printable
  q('generate-challenge').addEventListener('click', function(){
    var type = q('habit-type').value; var goal = q('habit-goal').value || 'Do the habit';
    var title = '7-day <'+type+'> practice: '+goal;
    var container = el('div');
    container.appendChild(el('h2',null,title));
    var checklist = el('div','checklist');
    for(var i=1;i<=7;i++){
      var row = el('div','checkrow');
      var cb = document.createElement('input'); cb.type='checkbox'; cb.id='d'+i;
      var lab = el('label',null,'Day '+i+' — '+goal); lab.setAttribute('for','d'+i);
      row.appendChild(cb); row.appendChild(lab); checklist.appendChild(row);
    }
    container.appendChild(checklist);
    var toolbar = el('div','print-toolbar');
    var pr = el('button','btn','Print checklist');
    var close = el('button','btn ghost','Close');
    toolbar.appendChild(pr); toolbar.appendChild(close);
    container.appendChild(toolbar);
    pr.addEventListener('click', function(){
      var win = window.open('','_blank');
      var html = '<!doctype html><html><head><meta charset="utf-8"><title>'+escapeHtml(title)+'</title><style>body{font-family:sans-serif;padding:24px} .check{display:flex;gap:10px;margin:8px 0}</style></head><body><h1>'+escapeHtml(title)+'</h1>';
      for(var j=1;j<=7;j++){ html += '<div class="check"><input type="checkbox" id="p'+j+'"><label for="p'+j+'">Day '+j+' — '+escapeHtml(goal)+'</label></div>'; }
      html += '<script>window.onload=function(){window.print();}</script></body></html>';
      win.document.write(html); win.document.close();
    });
    close.addEventListener('click', function(){ closeModal(); });
    openModal(container);
  });

  // Minor helpers
  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // Accessibility: trap focus in modal when open (light)
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && modal.getAttribute('aria-hidden')==='false') closeModal(); });

})();