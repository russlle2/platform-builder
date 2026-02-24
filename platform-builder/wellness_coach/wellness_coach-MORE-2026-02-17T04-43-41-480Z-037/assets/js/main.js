(function(){
  // Session Planner
  function $(sel){return document.querySelector(sel)}
  function $all(sel){return Array.from(document.querySelectorAll(sel))}

  var spBuild = $('#sp-build');
  var spCopy = $('#sp-copy');
  var spDownload = $('#sp-download');
  var spOutput = $('#sp-output');

  function makeSessionSummary(){
    var focus = $('#sp-focus').value;
    var length = $('#sp-length').value;
    var days = $('#sp-days').value;
    var includes = $all('#session-planner fieldset input[type="checkbox"]')
      .filter(function(cb){return cb.checked}).map(function(cb){return cb.value});

    var focusMap = {
      stress:'Manage stress and tension',
      sleep:'Prime for better sleep',
      energy:'Support steady energy throughout the day',
      focus:'Sharpen sustained attention'
    };

    var lines = [];
    lines.push('Session focus: '+(focusMap[focus]||focus));
    lines.push('Length: '+length);
    lines.push('Planned sessions per week: '+days);
    lines.push('Included elements: '+(includes.length?includes.join(', '):'none'));
    lines.push('');
    lines.push('Suggested structure:');

    // Suggest simple structure based on chosen components
    if(includes.indexOf('breath')>-1) lines.push('- 3–5 minutes grounding breathwork at start');
    if(includes.indexOf('movement')>-1) lines.push('- 5–10 minutes gentle movement or mobility');
    if(includes.indexOf('reflection')>-1) lines.push('- 5–10 minutes guided reflection or journaling');
    if(includes.indexOf('nutrition')>-1) lines.push('- 3–5 minutes simple nourishment or hydration prompt');

    lines.push('');
    lines.push('Weekly checkpoints:');
    lines.push('- Note one win each session');
    lines.push('- Quick rating (1–5) on how you feel before and after');

    return lines.join('\n');
  }

  function copyToClipboard(text, btn, statusEl){
    navigator.clipboard && navigator.clipboard.writeText(text).then(function(){
      statusEl.textContent = 'Copied.';
      setTimeout(function(){statusEl.textContent=''},2000);
    },function(){
      statusEl.textContent = 'Copy failed.';
    });
  }

  if(spBuild){
    spBuild.addEventListener('click',function(){
      var summary = makeSessionSummary();
      spOutput.value = summary;
    });
  }

  if(spCopy){
    spCopy.addEventListener('click',function(){
      copyToClipboard(spOutput.value, spCopy, $('#sp-copy-status'));
    });
  }

  if(spDownload){
    spDownload.addEventListener('click',function(){
      var text = spOutput.value || makeSessionSummary();
      var blob = new Blob([text],{type:'text/plain'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'session-plan.txt';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });
  }

  // Habit Builder: 7-day challenge + printable checklist
  var hbGenerate = $('#hb-generate');
  var hbPrint = $('#hb-print');
  var hbOutput = $('#hb-output');

  function buildChecklist(){
    var focus = $('#hb-focus').value;
    var intensity = $('#hb-intensity').value;
    var actions = [];

    var baseMap = {
      sleep:['Wind-down ritual (30 min)','Reduce screen time before bed','Brief evening reflection'],
      water:['Drink 250ml on waking','Drink a glass mid-morning','Sip water before each meal'],
      move:['10-minute morning movement','Walk after lunch','Stretch breaks midday'],
      mindful:['2-minute breathing break','Brief body scan','Single-task focus block']
    };

    var base = baseMap[focus] || ['Small action'];

    // Determine actions per day by intensity
    var perDay = intensity==='gentle'?1:(intensity==='moderate'?2:3);

    // Create 7-day rows
    var table = document.createElement('table');
    table.className = 'printable';
    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Day</th><th>Target actions</th><th>Done</th></tr>';
    table.appendChild(thead);
    var tbody = document.createElement('tbody');

    for(var d=1;d<=7;d++){
      var tr = document.createElement('tr');
      var tdDay = document.createElement('td'); tdDay.textContent = 'Day '+d;
      var tdActions = document.createElement('td');
      var list = document.createElement('ul');
      list.style.margin='0'; list.style.paddingLeft='18px';
      for(var i=0;i<perDay;i++){
        var actionText = base[(d+i-1)%base.length];
        var li = document.createElement('li'); li.textContent = actionText;
        list.appendChild(li);
      }
      tdActions.appendChild(list);
      var tdCheck = document.createElement('td');
      tdCheck.innerHTML = '<input type="checkbox" aria-label="done"> <input type="checkbox" aria-label="done">';
      // Adjust number of checkboxes
      tdCheck.innerHTML = '';
      for(var c=0;c<perDay;c++){
        tdCheck.innerHTML += '<label style="margin-right:8px"><input type=\"checkbox\" /> Done</label>';
      }

      tr.appendChild(tdDay); tr.appendChild(tdActions); tr.appendChild(tdCheck);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    // Replace output
    hbOutput.innerHTML = '';
    var heading = document.createElement('div');
    heading.innerHTML = '<strong>7-Day: '+(focus.charAt(0).toUpperCase()+focus.slice(1))+' ('+intensity+')</strong>';
    hbOutput.appendChild(heading);
    hbOutput.appendChild(table);

    // Attach print behavior to ensure only checklist prints
    table.classList.add('printable');
    heading.classList.add('printable');
  }

  if(hbGenerate){
    hbGenerate.addEventListener('click',function(){ buildChecklist(); });
  }

  if(hbPrint){
    hbPrint.addEventListener('click',function(){
      // Toggle printable class on body to constrain print
      document.body.classList.add('printing');
      setTimeout(function(){ window.print(); document.body.classList.remove('printing'); },100);
    });
  }

  // small accessibility touch: show textarea content on load
  document.addEventListener('DOMContentLoaded',function(){
    try{ if(!$('#sp-output').value) $('#sp-output').value = 'Build a session note to see a simple plan here.'; }catch(e){}
  });

})();