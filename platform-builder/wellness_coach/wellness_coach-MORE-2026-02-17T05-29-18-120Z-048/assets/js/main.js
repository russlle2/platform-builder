(function(){
  // Modal helpers
  function openModal(id){var m=document.getElementById(id);if(m){m.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}}
  function closeModal(id){var m=document.getElementById(id);if(m){m.setAttribute('aria-hidden','true');document.body.style.overflow=''} }

  // Attach header buttons
  document.getElementById('try-now-hero')?.addEventListener('click',function(){openModal('exercise-modal');setupExercise('breathing')});
  document.getElementById('try-now-hero-2')?.addEventListener('click',function(){openModal('exercise-modal');setupExercise('breathing')});
  document.getElementById('try-now-card')?.addEventListener('click',function(){openModal('exercise-modal');setupExercise('breathing')});

  // Habit builder open
  document.getElementById('open-habit-builder')?.addEventListener('click',function(){document.getElementById('habit-builder')?.scrollIntoView({behavior:'smooth'})});

  // Habit form logic
  var form=document.getElementById('habit-form');
  var output=document.getElementById('plan-output');
  var printPreview=document.getElementById('print-preview');
  var printModal=document.getElementById('print-modal');

  function padDay(dayIndex,startIndex){var days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    var idx=(startIndex+dayIndex)%7;return days[idx];}

  function generateChecklist(vals){
    var items=[];
    var start= ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].indexOf(vals.startDay||'Monday');
    for(var i=0;i<7;i++){var day=padDay(i,start);var row={day:day,entries:[]};
      ['habit1','habit2','habit3'].forEach(function(h){if(vals[h])row.entries.push(vals[h]);});
      items.push(row);
    }
    return items;
  }

  function renderPlan(checklist){
    var html='';
    html+='<div class="plan-card">';
    html+='<h4>Your 7-day challenge</h4>';
    html+='<ul style="list-style:none;padding:0;">';
    checklist.forEach(function(day){html+='<li style="margin-bottom:8px;padding:10px;border-radius:8px;background:#fff;">';
      html+='<strong>'+escapeHtml(day.day)+'</strong><div style="margin-top:8px;">';
      if(day.entries.length===0){html+='<em style="color:#A89A8C">No habits selected</em>'} else {
        day.entries.forEach(function(e,i){html+='<label style="display:block"><input type="checkbox" /> '+escapeHtml(e)+'</label>'});
      }
      html+='</div></li>'});
    html+='</ul>';
    html+='<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">';
    html+='<button class="btn btn-primary" id="open-print">Open printable</button>';
    html+='</div></div>';
    output.innerHTML=html;
    document.getElementById('open-print')?.addEventListener('click',function(){openPrintable(checklist)});
  }

  function openPrintable(checklist){
    // Build printable HTML in preview
    var doc='<div style="font-family:system-ui;padding:20px;">';
    doc+='<h2>{{BUSINESS_NAME}} — 7-day plan</h2>';
    doc+='<p>Start day: '+escapeHtml(checklist[0].day)+'</p>';
    doc+='<table style="width:100%;border-collapse:collapse;margin-top:12px;">';
    checklist.forEach(function(d){doc+='<tr><td style="border:1px solid #EEE;padding:8px;width:25%;"><strong>'+escapeHtml(d.day)+'</strong></td><td style="border:1px solid #EEE;padding:8px;">';
      if(d.entries.length===0) doc+='<em style="color:#A89A8C">No habits</em>'; else {d.entries.forEach(function(e){doc+='<div style="padding:6px 0;">[ ] '+escapeHtml(e)+'</div>'})}
      doc+='</td></tr>'});
    doc+='</table></div>';
    printPreview.innerHTML=doc;
    openModal('print-modal');
  }

  document.getElementById('generate-plan')?.addEventListener('click',function(ev){ev.preventDefault();
    var data={habit1:form.habit1.value.trim(),habit2:form.habit2.value.trim(),habit3:form.habit3.value.trim(),startDay:form.startDay.value};
    var checklist=generateChecklist(data);renderPlan(checklist);
  });
  document.getElementById('clear-plan')?.addEventListener('click',function(){form.reset();output.innerHTML='';printPreview.innerHTML=''});

  // Print controls
  document.getElementById('print-to-printer')?.addEventListener('click',function(){
    var w=window.open('','printwin','width=800,height=600');
    w.document.write('<html><head><title>7-day plan</title></head><body>'+printPreview.innerHTML+'</body></html>');
    w.document.close();
    setTimeout(function(){w.print();},300);
  });
  document.getElementById('download-pdf')?.addEventListener('click',function(){alert('For best results: use the Print button and choose "Save as PDF" in your browser.')});

  document.getElementById('print-close')?.addEventListener('click',function(){closeModal('print-modal')});
  document.getElementById('exercise-close')?.addEventListener('click',function(){closeModal('exercise-modal')});

  // Simple escape
  function escapeHtml(s){if(!s) return '';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

  // Guided exercise: breathing / journaling / intention
  var currentMode='breathing';
  function setupExercise(mode){currentMode=mode||'breathing';
    document.querySelectorAll('.exercise-tabs .tab').forEach(function(t){t.classList.toggle('active',t.dataset.mode===currentMode)})
    renderExercise();
  }

  document.querySelectorAll('.exercise-tabs .tab')?.forEach(function(t){t.addEventListener('click',function(){setupExercise(t.dataset.mode)})});

  document.getElementById('exercise-start')?.addEventListener('click',function(){startExercise(currentMode)});
  document.getElementById('exercise-skip')?.addEventListener('click',function(){closeModal('exercise-modal')});

  function renderExercise(){var body=document.getElementById('exercise-body');body.innerHTML='';
    if(currentMode==='breathing'){
      body.innerHTML='<p>Simple paced breath: 4s inhale • 6s exhale • 3 rounds</p><div id="breath-vis" style="display:flex;align-items:center;justify-content:center;height:80px;"></div>'
    } else if(currentMode==='journaling'){
      body.innerHTML='<p>Timed micro-journaling: respond to the prompt for 3 minutes.</p><div><strong>Prompt:</strong> List three small things you noticed today that you appreciate.</div><textarea id="journal-area" style="width:100%;height:90px;margin-top:8px;border-radius:8px;padding:8px;border:1px solid #EEE"></textarea>'
    } else if(currentMode==='intention'){
      body.innerHTML='<p>Set a clear intention for the next hour.</p><div style="display:flex;gap:8px;margin-top:8px;"><input id="intent-input" placeholder="I will..." style="flex:1;padding:8px;border-radius:8px;border:1px solid #EEE"/></div>'
    }
  }

  // start exercises
  var breathTimer=null;function startExercise(mode){
    if(mode==='breathing'){
      var rounds=3;var phase=0;var vis=document.getElementById('breath-vis');vis.innerHTML='';
      var circle=document.createElement('div');circle.style.width='48px';circle.style.height='48px';circle.style.borderRadius='50%';circle.style.background='linear-gradient(180deg,#C89A6B,#B76F46)';circle.style.transition='all 1s ease';vis.appendChild(circle);
      var c=0;function step(){if(c>=rounds){circle.style.transform='scale(1)';alert('Nice — 3 rounds complete.');clearInterval(breathTimer);return}
        // inhale (4s)
        circle.style.transform='scale(1.6)';
        setTimeout(function(){
          // hold shorten then exhale 6s
          circle.style.transform='scale(0.8)';
          setTimeout(function(){c++;},6000);
        },4000);
      }
      step();breathTimer=setInterval(step,11000);
    } else if(mode==='journaling'){
      var area=document.getElementById('journal-area');area.focus();var t=180;var countdown=setInterval(function(){t--; if(t<=0){clearInterval(countdown);alert('Time is up — great work!');} },1000);
    } else if(mode==='intention'){
      var inp=document.getElementById('intent-input');var val=inp.value||'I will pause and breathe for two minutes.';alert('Intent set: '+val);closeModal('exercise-modal');
    }
  }

  // Wire hero card open
  document.getElementById('try-now-card')?.addEventListener('click',function(){openModal('exercise-modal');setupExercise('breathing')});

  // Clean up on load
  renderExercise();

})();
