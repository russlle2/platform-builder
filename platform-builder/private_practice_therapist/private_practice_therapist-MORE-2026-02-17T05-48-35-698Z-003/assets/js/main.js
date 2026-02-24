(function(){
  // Scroll-triggered reveal with reduced motion respect
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = document.querySelectorAll('.reveal');

  function revealOnScroll(){
    if(prefersReduced){
      reveals.forEach(el=>el.classList.add('visible'));
      return;
    }
    const buffer = window.innerHeight * 0.85;
    reveals.forEach(el=>{
      const r = el.getBoundingClientRect();
      if(r.top < buffer){
        el.classList.add('visible');
      }
    });
  }
  revealOnScroll();
  window.addEventListener('scroll', revealOnScroll, {passive:true});
  window.addEventListener('resize', revealOnScroll);

  // Session Planner widget
  const form = document.getElementById('planner-form');
  if(form){
    const buildBtn = document.getElementById('build-plan');
    const copyBtn = document.getElementById('copy-plan');
    const downloadBtn = document.getElementById('download-plan');
    const summaryArea = document.getElementById('plan-summary');

    function safeVal(id){
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    }

    function buildSummary(){
      const concern = safeVal('concern');
      const outcome = safeVal('outcome');
      const freq = safeVal('frequency');
      const approach = safeVal('approach');
      const notes = safeVal('notes');

      const lines = [];
      lines.push('Session Planner — summary');
      lines.push('');
      if(concern) lines.push('Primary focus: ' + concern);
      if(outcome) lines.push('Target in ~3 months: ' + outcome);
      if(freq) lines.push('Preferred rhythm: ' + freq);
      if(approach) lines.push('Helpful approaches: ' + approach);
      if(notes) lines.push('Additional notes: ' + notes);

      lines.push('');
      lines.push('Notes: this is a planning tool and not a substitute for clinical assessment.');

      return lines.join('\n');
    }

    buildBtn.addEventListener('click', ()=>{
      const text = buildSummary();
      summaryArea.value = text;
      summaryArea.focus();
      summaryArea.setSelectionRange(0,0);
    });

    copyBtn.addEventListener('click', async ()=>{
      try{
        const text = summaryArea.value;
        if(!text) return;
        if(navigator.clipboard && navigator.clipboard.writeText){
          await navigator.clipboard.writeText(text);
        } else {
          // fallback
          summaryArea.select();
          document.execCommand('copy');
        }
        copyBtn.textContent = 'Copied';
        setTimeout(()=>copyBtn.textContent='Copy summary',1500);
      }catch(e){
        console.warn('Copy failed',e);
      }
    });

    downloadBtn.addEventListener('click', ()=>{
      const text = summaryArea.value || buildSummary();
      const blob = new Blob([text],{type:'text/plain;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'session-plan.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  // Basic accessible enhancements: external links open appropriately
  document.addEventListener('click', function(e){
    const t = e.target.closest('a');
    if(!t) return;
    const href = t.getAttribute('href') || '';
    if(href.startsWith('http') && !href.includes(location.host)){
      t.setAttribute('rel','noopener noreferrer');
      t.setAttribute('target','_blank');
    }
  });
})();