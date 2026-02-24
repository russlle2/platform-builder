(function(){
  // Date in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Simple reveal on scroll with prefers-reduced-motion support
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = document.querySelectorAll('.reveal');
  function show(el){ el.classList.add('is-visible'); }
  if(prefersReduced){ reveals.forEach(show); }
  else if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting) { show(e.target); io.unobserve(e.target); }
      });
    },{rootMargin:'-10% 0px',threshold:0.08});
    reveals.forEach(function(r){ io.observe(r); });
  } else { reveals.forEach(show); }

  // FAQ toggles
  document.querySelectorAll('.faq .q').forEach(function(btn){
    btn.addEventListener('click',function(){
      var a = this.nextElementSibling;
      var visible = a.style.display === 'block';
      document.querySelectorAll('.faq .a').forEach(function(x){ x.style.display = 'none'; });
      a.style.display = visible ? 'none' : 'block';
    });
  });

  // Session Planner
  var form = document.getElementById('planner-form');
  var buildBtn = document.getElementById('build-plan');
  var copyBtn = document.getElementById('copy-plan');
  var output = document.getElementById('plan-output');

  function gather(){
    var data = {};
    var f = new FormData(form);
    data.focus = f.get('focus') || '';
    data.routine = f.get('routine') || '';
    data.obstacle = f.get('obstacle') || '';
    data.time = f.get('time') || '';
    data.style = f.get('style') || '';
    return data;
  }

  function buildText(d){
    var lines = [];
    lines.push('Personal session plan');
    lines.push('---------------------');
    if(d.focus) lines.push('Focus: ' + d.focus);
    if(d.routine) lines.push('Routine note: ' + d.routine);
    if(d.obstacle) lines.push('Biggest obstacle: ' + d.obstacle);
    lines.push('Weekly time commitment: ' + d.time);
    lines.push('Preferred approach: ' + (d.style === 'learning' ? 'Cohort + learning' : 'Guided plan'));
    lines.push('');
    lines.push('Suggested first steps:');
    if(d.focus.match(/sleep|bed/i)){
      lines.push('- Establish two simple evening anchors (lighting, 20-min wind-down).');
    } else if(d.focus.match(/digest|gut|stomach/i)){
      lines.push('- Try a 3-day gentle food log and one timing adjustment.');
    } else {
      lines.push('- Pick one small experiment to try for 1 week tied to energy or routine.');
    }
    lines.push('- Schedule a 20–30 minute check-in in 10–14 days to review how it went.');
    lines.push('');
    lines.push('Notes: This is educational guidance, not a diagnosis. Share with your healthcare team as needed.');
    return lines.join('\n');
  }

  buildBtn.addEventListener('click', function(){
    var data = gather();
    if(!data.focus){ output.value = 'Please add a short focus to build a plan.'; return; }
    output.value = buildText(data);
    // focus animation to show output
    output.scrollIntoView({behavior: 'smooth', block: 'center'});
  });

  copyBtn.addEventListener('click', function(){
    if(!output.value){ alert('No plan to copy — build a plan first.'); return; }
    navigator.clipboard.writeText(output.value).then(function(){
      copyBtn.textContent = 'Copied!';
      setTimeout(function(){ copyBtn.textContent = 'Copy summary'; },1500);
    }, function(){
      alert('Could not copy to clipboard.');
    });
  });

})();
