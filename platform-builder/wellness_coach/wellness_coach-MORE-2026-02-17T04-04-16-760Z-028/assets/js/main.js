document.addEventListener('DOMContentLoaded',function(){
  // Scroll-triggered reveal with respects to prefers-reduced-motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealElements = document.querySelectorAll('.reveal');

  if(prefersReduced){
    revealElements.forEach(el=>el.classList.add('is-visible'));
  } else if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries, obs)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    },{threshold:0.12});
    revealElements.forEach(el=>io.observe(el));
  } else {
    // fallback
    revealElements.forEach(el=>el.classList.add('is-visible'));
  }

  // Quick check -> planner transfer
  const toPlannerBtn = document.getElementById('to-planner');
  if(toPlannerBtn){
    toPlannerBtn.addEventListener('click',()=>{
      const focus = document.getElementById('focus').value;
      const time = document.getElementById('time').value;
      // seed planner fields with suggested defaults
      const title = document.getElementById('sp-title');
      const outcome = document.getElementById('sp-outcome');
      const duration = document.getElementById('sp-duration');
      const habit = document.getElementById('sp-habit');

      const focusMap = {
        energy: 'Stabilize my energy swings',
        clarity: 'Create clearer focus blocks',
        sleep: 'Ease into a calmer evening routine',
        boundaries: 'Signal clear work and rest transitions'
      };

      title.value = focusMap[focus] || 'Weekly session';
      outcome.value = focusMap[focus] || '';
      duration.value = time;
      habit.value = (focus==='sleep')? '3-minute wind-down ritual' : (focus==='clarity')? '2-minute priority list' : '2-minute centering breath';

      // smooth-scroll to planner
      document.getElementById('planner').scrollIntoView({behavior:'smooth'});
    });
  }

  // Session Planner logic
  const buildBtn = document.getElementById('build-plan');
  const clearBtn = document.getElementById('clear-plan');
  const copyBtn = document.getElementById('copy-plan');
  const downloadLink = document.getElementById('download-plan');
  const summaryEl = document.getElementById('plan-summary');

  function createSummary(data){
    const lines = [];
    lines.push(`Session: ${data.title}`);
    lines.push(`Primary outcome: ${data.outcome}`);
    lines.push(`Daily commitment: ${data.duration} / day`);
    lines.push(`Weekly frequency: ${data.freq} times`);
    lines.push(`Core habit: ${data.habit}`);
    if(data.constraint) lines.push(`Constraints: ${data.constraint}`);
    lines.push('');
    lines.push('Micro-routine (try this):');
    lines.push(`• Start: 30s settle & breathe`);
    lines.push(`• Practice: ${data.habit} for ${Math.max(3,parseInt(data.duration))} min`);
    lines.push(`• Close: 60s note — what changed?`);
    lines.push('');
    lines.push('Quick checks:');
    lines.push('• Did I start within the first 10 minutes of my chosen window? (Y/N)');
    lines.push('• Did I complete the core habit? (Y/N)');
    lines.push('• One short note:')
    return lines.join('\n');
  }

  if(buildBtn){
    buildBtn.addEventListener('click',()=>{
      const data = {
        title: document.getElementById('sp-title').value.trim() || 'Session',
        outcome: document.getElementById('sp-outcome').value.trim() || 'Outcome',
        duration: document.getElementById('sp-duration').value,
        freq: document.getElementById('sp-freq').value,
        habit: document.getElementById('sp-habit').value.trim() || 'Short habit',
        constraint: document.getElementById('sp-constraint').value.trim()
      };

      const text = createSummary(data);
      summaryEl.value = text;

      // update download link (data URL)
      const blob = new Blob([text],{type:'text/plain;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      downloadLink.href = url;

      // focus summary for keyboard users
      summaryEl.focus();
    });
  }

  if(clearBtn){
    clearBtn.addEventListener('click',()=>{
      document.getElementById('planner-form').reset();
      summaryEl.value = '';
    });
  }

  if(copyBtn){
    copyBtn.addEventListener('click',async()=>{
      const text = summaryEl.value;
      if(!text) return;
      try{
        if(navigator.clipboard && navigator.clipboard.writeText){
          await navigator.clipboard.writeText(text);
        } else {
          // fallback
          const ta = document.createElement('textarea');
          ta.value = text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
        }
        copyBtn.textContent = 'Copied ✓';
        setTimeout(()=>copyBtn.textContent = 'Copy text',1600);
      }catch(e){
        console.warn('Copy failed',e);
        copyBtn.textContent = 'Copy failed';
        setTimeout(()=>copyBtn.textContent = 'Copy text',1600);
      }
    });
  }

  // small UX: set current year
  const yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();
});
