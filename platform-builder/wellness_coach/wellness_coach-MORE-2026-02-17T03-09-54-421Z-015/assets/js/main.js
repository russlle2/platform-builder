document.addEventListener('DOMContentLoaded',function(){
  // Year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // Mini diagnostic
  var diag=document.getElementById('miniDiagnostic');
  if(diag){
    diag.addEventListener('submit',function(e){
      e.preventDefault();
      var f=new FormData(diag);
      var q1=f.get('q1'), q2=parseInt(f.get('q2'),10), q3=f.get('q3');
      var note='Suggested focus: ';
      if(q2<=2){
        note += 'Begin with a single short ritual (2-3 minute anchor) focused on '+q1+'. Prefer '+q3+'.';
      } else if(q2<=3){
        note += 'Aim for small repeated practices on '+q3+'s to build routine around '+q1+'.';
      } else {
        note += 'Establish a lightweight daily signal in the '+q3+' to stabilize '+q1+'.';
      }
      document.getElementById('diagResult').textContent=note;
    });
  }

  // Session planner
  var sessionForm=document.getElementById('sessionForm');
  var planOutput=document.getElementById('planOutput');
  var copyPlan=document.getElementById('copyPlan');
  if(sessionForm){
    sessionForm.addEventListener('submit',function(e){
      e.preventDefault();
      var fd=new FormData(sessionForm);
      var focus=fd.get('focus')||'Focused session';
      var length=fd.get('length')||'20';
      var perWeek=fd.get('perWeek')||'3';
      var actions=fd.get('actions')||'';
      var notes=fd.get('notes')||'';
      var days=[]; sessionForm.querySelectorAll('input[name="days"]:checked').forEach(function(c){days.push(c.value)});
      if(days.length===0) days=['Flexible days'];
      var summary=['Session Planner summary','-----------','Focus: '+focus,'Length (mins): '+length,'Sessions per week: '+perWeek,'Days: '+days.join(', '),'Core actions: '+(actions||'Not specified'),'Notes: '+(notes||'None')].join('\n');
      planOutput.textContent=summary;
      copyPlan.disabled=false;
    });
    copyPlan.addEventListener('click',function(){
      navigator.clipboard.writeText(planOutput.textContent).then(function(){
        copyPlan.textContent='Copied'; setTimeout(function(){copyPlan.textContent='Copy summary'},1200);
      });
    });
  }

  // Habit builder (7-day challenge)
  var habitForm=document.getElementById('habitForm');
  var checklistArea=document.getElementById('checklistArea');
  var checklistTitle=document.getElementById('checklistTitle');
  var checklistList=document.getElementById('checklistList');
  var printChecklist=document.getElementById('printChecklist');
  var copyChecklist=document.getElementById('copyChecklist');
  if(habitForm){
    habitForm.addEventListener('submit',function(e){
      e.preventDefault();
      var fd=new FormData(habitForm);
      var habit=fd.get('habit')||'Daily practice';
      var goal=fd.get('goal')||'';
      var start=fd.get('start')||'Mon';
      var daysOrder=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      var startIdx=daysOrder.indexOf(start); if(startIdx<0) startIdx=0;
      // Build 7-day list
      checklistList.innerHTML='';
      var textLines=[];
      for(var i=0;i<7;i++){
        var d=daysOrder[(startIdx+i)%7];
        var li=document.createElement('li');
        li.innerHTML="<label><input type='checkbox'> <strong>"+d+"</strong><div class='muted'>"+habit+""+(goal?(' — '+goal):'')+"</div></label>";
        checklistList.appendChild(li);
        textLines.push('- '+d+': '+habit+(goal?(' ('+goal+')'):''));
      }
      checklistTitle.textContent=habit+(goal?(' — '+goal):'');
      checklistArea.classList.remove('invisible'); checklistArea.setAttribute('aria-hidden','false');
      printChecklist.disabled=false; copyChecklist.disabled=false;
      // attach copy behavior
      copyChecklist.onclick=function(){ navigator.clipboard.writeText(checklistTitle.textContent+'\n'+textLines.join('\n')).then(function(){ copyChecklist.textContent='Copied'; setTimeout(function(){copyChecklist.textContent='Copy text'},1000); }); };
      printChecklist.onclick=function(){ window.print(); };
    });
  }

});
