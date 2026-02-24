// Intersection-based reveal with reduced-motion support
(function(){
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(prefersReduced){
    document.querySelectorAll('.reveal-from-left, .reveal-from-right, .reveal-from-bottom').forEach(el=>el.classList.add('revealed'));
    return;
  }

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('revealed');
        io.unobserve(entry.target);
      }
    })
  },{threshold:0.12});

  document.querySelectorAll('.reveal-from-left, .reveal-from-right, .reveal-from-bottom').forEach(el=>io.observe(el));
})();

// Session Planner widget
(function(){
  const form = document.getElementById('planner-form');
  if(!form) return;

  const concern = document.getElementById('concern');
  const goals = document.getElementById('goals');
  const length = document.getElementById('length');
  const rhythm = document.getElementById('rhythm');
  const build = document.getElementById('build-plan');
  const copyBtn = document.getElementById('copy-plan');
  const output = document.getElementById('plan-output');

  function sanitize(text){
    return (text||'').trim();
  }

  function buildPlan(){
    const c = sanitize(concern.value)||'(not provided)';
    const g = sanitize(goals.value)||'(not provided)';
    const l = length.value;
    const r = rhythm.value;

    const rhythmLabel = ({weekly:'Weekly',biweekly:'Every other week',short_intensive:'Short intensive (3-4 sessions)'}[r]||r);

    const lines = [];
    lines.push('Session Planner — '+ (new Date()).toLocaleDateString());
    lines.push('Primary concern: '+c);
    lines.push('Top goals: '+g.replace(/\n+/g, ' | '));
    lines.push('Session length: '+l+' minutes');
    lines.push('Suggested rhythm: '+rhythmLabel);
    lines.push('Suggested starting items:');
    lines.push('- First session: brief assessment, clarify priorities, set a small first task.');
    lines.push('- Subsequent sessions: track one progress indicator, problem-solve obstacles, introduce between-session tool if helpful.');
    lines.push('Notes: Keep the focus practical and time-limited as desired. Confidential clinical contact will be discussed at intake.');

    return lines.join('\n');
  }

  build.addEventListener('click',()=>{
    const text = buildPlan();
    output.textContent = text;
    copyBtn.disabled = false;
    copyBtn.setAttribute('aria-disabled','false');
  });

  copyBtn.addEventListener('click',async ()=>{
    try{
      const txt = output.textContent;
      if(!txt) return;
      await navigator.clipboard.writeText(txt);
      copyBtn.textContent = 'Copied';
      setTimeout(()=>copyBtn.textContent = 'Copy summary',1600);
    }catch(e){
      // Fallback
      const range = document.createRange();
      range.selectNodeContents(output);
      const sel = window.getSelection();
      sel.removeAllRanges();sel.addRange(range);
      try{document.execCommand('copy');copyBtn.textContent='Copied';setTimeout(()=>copyBtn.textContent='Copy summary',1600);}catch(e2){alert('Copy failed — select and copy the text manually.');}
      sel.removeAllRanges();
    }
  });

})();

// Small enhancement: year in footer
(function(){
  const y = new Date().getFullYear();
  const el = document.getElementById('year');
  if(el) el.textContent = y;
})();