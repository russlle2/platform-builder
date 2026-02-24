(function(){
  // Utilities
  function by(id){return document.getElementById(id)}
  function qs(sel){return document.querySelector(sel)}

  // Year in footer
  var yearEl = qs('#year'); if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Session Planner
  var buildBtn = by('planner-build');
  var output = by('planner-output');
  var copyBtn = by('planner-copy');
  var saveLink = by('planner-save');

  function craftSession(focus,length,tone){
    var steps = [];
    steps.push('Session focus: '+focus);
    steps.push('Estimated length: '+length+' minutes');
    steps.push('Tone: '+tone);

    if(focus==='energy'){
      steps.push('1) 1–2 minutes: gentle breath counting to arrive.');
      steps.push('2) '+Math.max(3,(length-6))+' minutes: light movement or standing sequence.');
      steps.push('3) 3 minutes: grounding check—note one small win to carry forward.');
    } else if(focus==='clarity'){
      steps.push('1) 2 minutes: focused breath to clear the desk.');
      steps.push('2) '+Math.max(8,(length-8))+' minutes: guided prompt—define the single next action.');
      steps.push('3) 2 minutes: close with a simple commitment statement.');
    } else if(focus==='sleep'){
      steps.push('1) 3 minutes: lower lights, settle breath.');
      steps.push('2) '+Math.max(6,(length-9))+' minutes: progressive relaxation or silence.');
      steps.push('3) 2 minutes: note one gratitude and plan one simple task for morning.');
    } else if(focus==='movement'){
      steps.push('1) 1 minute: joint awareness.');
      steps.push('2) '+Math.max(6,(length-6))+' minutes: gentle flow (hips, shoulders, spine).');
      steps.push('3) 2 minutes: steady breath and two stretches to repeat later.');
    }

    if(tone==='guided') steps.push('Guidance: follow short prompts every few minutes.');
    if(tone==='solo') steps.push('Guidance: silent practice with an initial prompt only.');
    if(tone==='mixed') steps.push('Guidance: mix short prompts and silence.');

    steps.push('\nNotes: Keep the session tidy—choose one element to repeat for a week.');
    return steps.join('\n');
  }

  if(buildBtn){
    buildBtn.addEventListener('click',function(){
      var focus = by('planner-focus').value;
      var length = by('planner-length').value;
      var tone = by('planner-tone').value;
      var summary = craftSession(focus,length,tone);
      output.textContent = summary;
      // prepare download link
      var blob = new Blob([summary],{type:'text/plain'});
      var url = URL.createObjectURL(blob);
      saveLink.setAttribute('href',url);
      saveLink.setAttribute('download','session-plan.txt');
    });
  }

  if(copyBtn){
    copyBtn.addEventListener('click',function(){
      var text = output.textContent || '';
      if(!text) return;
      navigator.clipboard && navigator.clipboard.writeText(text).then(function(){
        copyBtn.textContent = 'Copied';
        setTimeout(function(){copyBtn.textContent='Copy summary'},1200);
      },function(){
        // fallback
        var ta = document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');copyBtn.textContent='Copied';setTimeout(function(){copyBtn.textContent='Copy summary';document.body.removeChild(ta)},1200)}catch(e){document.body.removeChild(ta)}
      });
    });
  }

  // Habit Builder
  var habitGen = by('habit-generate');
  var habitChecklist = by('habit-checklist');
  var habitCopy = by('habit-copy');
  var habitPrint = by('habit-print');

  var templates = {
    movement:{low:['3 minute walk','2 gentle stretches','1 standing breath','1 minute shoulder rolls','2 minute leg swings','2 minute neck mobility','1 minute closing breath'],
              moderate:['5 minute walk','5 minute movement flow','2 squats / slow reps','2 minute breath pause','5 minute stretch sequence','3 minute cool down','1 minute reflection'],
              stretch:['10 minute flow','7 minute mobility circuit','5 minute core awake','3 minute breath reset','10 minute walk','5 minute restorative stretch','2 minute gratitude']},
    mind:{low:['1 minute breath','1 minute noting','2 minute jot thought','1 minute breath','1 minute plan','1 minute counting back','1 minute close'],
          moderate:['3 minute breath','5 minute reflection','3 minute write','3 minute prioritize','3 minute set intent','3 minute mini-review','2 minute close'],
          stretch:['5 minute free write','10 minute reflection','5 minute map goals','5 minute plan block','5 minute choice exercise','5 minute calm practice','5 minute closing note']},
    sleep:{low:['dim lights 30m before','2 minute breath','warm drink','gentle stretch','put phone away','set tomorrow task','read 10 pages'],
           moderate:['warm bath / shower','10 minute relaxation','no screens 40m','gentle mobility','light journaling','breath practice','bed at same time'],
           stretch:['longer bath','extended stretch','technology fast','write 3 gratitudes','5 minute breathing','short meditation','consistent lights out']},
    focus:{low:['clear desk 2 min','define one task','set timer 25m','short walk after','note progress','close small tasks','prepare next slot'],
           moderate:['plan 10m','block 50m work','single-task only','short review','2 minute breath between','log progress','end-of-block note'],
           stretch:['plan chunking','alternate deep/sprint','long focus block 90m','planned break','review wins','adjust plan','set tomorrow intent']}
  };

  function buildChecklist(theme,intensity){
    var set = (templates[theme] && templates[theme][intensity]) || [];
    var parts = ['<strong>7‑Day '+theme.replace(/^[a-z]/,function(m){return m.toUpperCase()})+' challenge — '+intensity+'</strong>','<ol>'];
    for(var i=0;i<7;i++){
      var item = set[i] || 'Simple practice';
      parts.push('<li><label><input type="checkbox"> '+item+'</label></li>');
    }
    parts.push('</ol>');
    parts.push('<p class="muted">Tip: repeat the element that felt easiest — consistency over perfection.</p>');
    return parts.join('\n');
  }

  if(habitGen){
    habitGen.addEventListener('click',function(){
      var theme = by('habit-theme').value;
      var intensity = by('habit-intensity').value;
      var html = buildChecklist(theme,intensity);
      habitChecklist.innerHTML = html;
    });
  }

  if(habitCopy){
    habitCopy.addEventListener('click',function(){
      var text = habitChecklist.innerText || habitChecklist.textContent || '';
      if(!text) return;
      navigator.clipboard && navigator.clipboard.writeText(text).then(function(){
        habitCopy.textContent='Copied';setTimeout(function(){habitCopy.textContent='Copy checklist'},1000);
      });
    });
  }

  if(habitPrint){
    habitPrint.addEventListener('click',function(){
      var w = window.open('','print');
      w.document.write('<html><head><title>Checklist</title>');
      w.document.write('<style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#3f3329}.muted{color:#7b6a60}</style>');
      w.document.write('</head><body>');
      w.document.write(habitChecklist.innerHTML);
      w.document.write('</body></html>');
      w.document.close();
      setTimeout(function(){w.print();},200);
    });
  }

  // Accessible small enhancements
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      var selects = document.querySelectorAll('select');
      selects.forEach(function(s){s.blur();});
    }
  });

})();
