(function(){
  // Small utilities
  function $id(id){return document.getElementById(id)}
  function copyText(txt){navigator.clipboard && navigator.clipboard.writeText(txt).catch(function(){alert('Copy failed — please copy manually.');});}

  // Planner
  var buildBtn=$id('planner-build');
  var copyBtn=$id('planner-copy');
  var output=$id('planner-output');
  buildBtn && buildBtn.addEventListener('click',function(){
    var goal=$id('planner-goal').value;
    var sessions=$id('planner-sessions').value;
    var length=$id('planner-length').value;
    var note=$id('planner-note').value || 'None';
    var summary=[
      'Session Plan — generated',
      'Primary focus: '+goal,
      'Planned sessions: '+sessions,
      'Session length: '+length,
      'Immediate notes: '+note,
      '',
      'Suggested topics for first session:',
      '- What brought you here and what feels most urgent?',
      '- What small change would feel like progress in 3 sessions?',
      '- Practical constraints or schedule preferences.'
    ].join('\n');
    output.value=summary;
  });
  copyBtn && copyBtn.addEventListener('click',function(){
    if(output.value && output.value.trim().length>0){copyText(output.value);}
  });

  // Quick Wizard
  var quickRun=$id('quick-run');
  var quickOut=$id('quick-output');
  quickRun && quickRun.addEventListener('click',function(){
    var a=$id('q1').value; var b=$id('q2').value; var c=$id('q3').value;
    var note='Quick Check — reflection\nPrimary concern: '+a+'\nDuration noted: '+b+'\nImpact on daily life: '+c+'\n\nSuggested prompts to bring to a consultation:\n- Can you describe when these feelings began or changed?\n- What has helped or not helped before?\n- What would you like to be different in the near term?\n';
    quickOut.value=note;
  });

  // Deep Wizard
  var deepRun=$id('deep-run');
  var deepCopy=$id('deep-copy');
  var deepOut=$id('deep-output');
  deepRun && deepRun.addEventListener('click',function(){
    var a=$id('d1').value||'<not entered>'; var b=$id('d2').value||'none'; var c=$id('d3').value||'<not entered>';
    var d=$id('d4').value||'none'; var e=$id('d5').value||'no immediate crisis';
    var questions=[];
    questions.push('Deep Check — reflections');
    questions.push('1) What matters most now: '+a);
    questions.push('2) What have you tried: '+b);
    questions.push('3) What would look like progress: '+c);
    questions.push('4) Practical barriers: '+d);
    questions.push('5) Safety/urgent note: '+e);
    questions.push('');
    questions.push('Suggested questions to ask a clinician:');
    questions.push('- How might we structure short-term work focused on the outcome I named?');
    questions.push('- What would you recommend to test in the first 2–3 sessions?');
    questions.push('- How will we measure progress in a way that feels meaningful to me?');
    deepOut.value=questions.join('\n');
  });
  deepCopy && deepCopy.addEventListener('click',function(){if(deepOut.value && deepOut.value.trim().length>0) copyText(deepOut.value);});

  // Small footer year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // Accessible menu toggle (small)
  var menuToggle=document.querySelector('.menu-toggle');
  var mainNav=document.querySelector('.main-nav');
  if(menuToggle && mainNav){
    menuToggle.addEventListener('click',function(){
      var open=this.getAttribute('aria-expanded')==='true';
      this.setAttribute('aria-expanded',!open);
      var links=mainNav.querySelectorAll('a');
      for(var i=0;i<links.length;i++){links[i].style.display = open ? 'none' : 'inline-block';}
    });
  }
})();