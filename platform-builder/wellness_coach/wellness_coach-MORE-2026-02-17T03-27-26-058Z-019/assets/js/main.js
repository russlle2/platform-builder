(function(){
  // Set current year
  document.getElementById('year').textContent = new Date().getFullYear();

  // SESSION PLANNER
  var spGenerate = document.getElementById('sp-generate');
  var spCopy = document.getElementById('sp-copy');
  var spOutput = document.getElementById('sp-output');

  function buildSessionText(){
    var name = document.getElementById('sp-name').value.trim() || 'Session';
    var focus = document.getElementById('sp-focus').value;
    var duration = document.getElementById('sp-duration').value || '20';
    var actions = document.getElementById('sp-actions').value.trim().split('\n').map(function(s){return s.trim()}).filter(Boolean);
    var when = document.getElementById('sp-when').value.trim() || 'unspecified';

    var lines = [];
    lines.push(name + ' — ' + focus);
    lines.push('Duration: ' + duration + ' minutes');
    lines.push('When: ' + when);
    lines.push('Steps:');
    if(actions.length){
      actions.forEach(function(a,i){ lines.push((i+1)+'. '+a); });
    } else {
      lines.push('1. One clear action');
      lines.push('2. One mindful check');
      lines.push('3. One short reset');
    }
    lines.push('Notes:');
    lines.push('—');
    return lines.join('\n');
  }

  spGenerate.addEventListener('click',function(){
    spOutput.textContent = buildSessionText();
  });

  spCopy.addEventListener('click',function(){
    var text = spOutput.textContent || buildSessionText();
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){
        spCopy.textContent = 'Copied';
        setTimeout(function(){ spCopy.textContent = 'Copy'; },1200);
      });
    } else {
      var ta = document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');spCopy.textContent='Copied';setTimeout(function(){spCopy.textContent='Copy';},1200);}catch(e){}ta.remove();
    }
  });

  // HABIT BUILDER (7-day challenge)
  var hbGenerate = document.getElementById('hb-generate');
  var hbPrint = document.getElementById('hb-print');
  var hbCopy = document.getElementById('hb-copy');
  var hbOutput = document.getElementById('hb-output');

  function formatDateISO(d){
    return d.toISOString().slice(0,10);
  }

  function buildHabitList(){
    var habit = document.getElementById('hb-habit').value.trim() || 'Daily habit';
    var startVal = document.getElementById('hb-start').value;
    var start = startVal ? new Date(startVal+'T00:00:00') : new Date();
    // Normalize to local midnight
    start.setHours(0,0,0,0);
    var items = [];
    for(var i=0;i<7;i++){
      var d = new Date(start.getTime() + i*24*60*60*1000);
      items.push({day:i+1,date:formatDateISO(d),label:habit});
    }
    return items;
  }

  function renderHabitList(items){
    var ul = document.createElement('ul');ul.className='hb-list';
    items.forEach(function(it){
      var li = document.createElement('li');
      var chk = document.createElement('input'); chk.type='checkbox'; chk.id='hb-'+it.day;
      var label = document.createElement('label'); label.htmlFor = chk.id; label.textContent = it.date + ' — ' + it.label;
      li.appendChild(chk); li.appendChild(label); ul.appendChild(li);
    });
    hbOutput.innerHTML=''; hbOutput.appendChild(ul);
    // attach printable hidden header
    var header = document.createElement('div'); header.className='hb-header'; header.style.marginTop='10px'; header.textContent='7-Day Challenge — '+(document.getElementById('hb-habit').value||'Habit');
    hbOutput.insertBefore(header,ul);
  }

  hbGenerate.addEventListener('click',function(){
    var items = buildHabitList(); renderHabitList(items);
  });

  hbCopy.addEventListener('click',function(){
    var items = buildHabitList();
    var lines = items.map(function(it){ return it.date + ' — ' + it.label; });
    var text = '7-Day Challenge:\n' + lines.join('\n');
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){ hbCopy.textContent='Copied'; setTimeout(function(){hbCopy.textContent='Copy';},1200); });
    } else { var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');hbCopy.textContent='Copied';setTimeout(function(){hbCopy.textContent='Copy';},1200);}catch(e){}ta.remove(); }
  });

  hbPrint.addEventListener('click',function(){
    var items = buildHabitList();
    var win = window.open('','_blank');
    var html = ['<html><head><title>7-Day Challenge</title>','<style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}h1{font-size:18px}ul{list-style:none;padding:0}li{padding:8px;border-bottom:1px solid #eee}</style>','</head><body>'];
    html.push('<h1>7-Day Challenge — '+(document.getElementById('hb-habit').value||'Habit')+'</h1>');
    html.push('<ul>');
    items.forEach(function(it){ html.push('<li><input type="checkbox"/> '+it.date+' — '+it.label+'</li>'); });
    html.push('</ul>');
    html.push('</body></html>');
    win.document.write(html.join(''));
    win.document.close();
    win.print();
  });

})();