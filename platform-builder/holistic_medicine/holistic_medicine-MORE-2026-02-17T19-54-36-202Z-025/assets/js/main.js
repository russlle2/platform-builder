(function(){
  // Utility: prefers reduced motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll-trigger reveal
  function initReveal(){
    const reveals = document.querySelectorAll('.reveal');
    if(prefersReduced){
      reveals.forEach(el => el.classList.add('visible'));
      return;
    }
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    },{threshold:0.12});
    reveals.forEach(el=>io.observe(el));
  }

  // Planner widget
  function initPlanner(){
    const form = document.getElementById('planner-form');
    if(!form) return;
    const buildBtn = document.getElementById('build-plan');
    const clearBtn = document.getElementById('clear-plan');
    const copyBtn = document.getElementById('copy-plan');
    const downloadLink = document.getElementById('download-plan');
    const output = document.getElementById('plan-text');

    function collect(){
      const concern = document.getElementById('p-concern').value.trim();
      const goal1 = document.getElementById('p-goal-1').value.trim();
      const goal2 = document.getElementById('p-goal-2').value.trim();
      const mods = Array.from(document.querySelectorAll('.mod:checked')).map(i=>i.value);
      const time = document.getElementById('p-time').value;
      const pace = document.getElementById('p-pace').value;
      return {concern,goal1,goal2,mods,time,pace};
    }

    function synthesize(data){
      if(!data.concern || !data.goal1) return 'Please provide at least a primary concern and one goal to generate a plan.';
      const lines = [];
      lines.push('Personalized Planning Summary');
      lines.push('-----------------------------');
      lines.push('Primary concern: ' + data.concern);
      lines.push('Top goal: ' + data.goal1);
      if(data.goal2) lines.push('Secondary goal: ' + data.goal2);
      lines.push('Preferred modalities: ' + (data.mods.length?data.mods.join(', '):'Open to suggestions'));
      lines.push('Weekly time available: ' + data.time);
      lines.push('Recommended approach pace: ' + data.pace);
      lines.push('');

      // Simple logic to recommend micro-steps
      lines.push('Initial micro-steps (first 2 weeks):');
      if(data.mods.includes('Nutrition')){
        lines.push('- Start a simple meal pattern: 3 balanced meals + two snacks; note energy after meals.');
      }
      if(data.mods.includes('Movement')){
        lines.push('- 10–20 minutes movement 3x/week focusing on mobility or light strength.');
      }
      if(data.mods.includes('Stresswork')){
        lines.push('- Daily 5-minute breathing break: cue at morning or before bed.');
      }
      if(data.mods.includes('Supplements')){
        lines.push('- Discuss targeted supplements; keep a short log for 2 weeks if started.');
      }
      if(!data.mods.length){
        lines.push('- Keep a short daily log of sleep, meals, and energy; review after 7 days.');
      }

      lines.push('');
      // Time-based tailoring
      if(data.time === '<2 hours'){
        lines.push('If under 2 hrs/week: focus on 1 micro-habit and symptom tracking.');
      } else if(data.time === '2-5 hours'){
        lines.push('If 2–5 hrs/week: add 2 structured actions (eg. guided session + daily micro-practice).');
      } else {
        lines.push('If >5 hrs/week: you can adopt a short coaching rhythm plus a modest testing plan.');
      }

      lines.push('');
      lines.push('Suggested measures to track: symptom frequency, sleep duration, and a weekly overall score (1–10).');
      lines.push('Follow-up: review at 4 weeks to adapt the plan and set the next priorities.');

      return lines.join('\n');
    }

    function updateDownload(text){
      const blob = new Blob([text],{type:'text/plain'});
      const url = URL.createObjectURL(blob);
      downloadLink.href = url;
    }

    buildBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      const data = collect();
      const text = synthesize(data);
      output.textContent = text;
      updateDownload(text);
    });

    clearBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      form.reset();
      output.textContent = 'Fill the form and click Create plan to generate a concise summary here.';
      downloadLink.removeAttribute('href');
    });

    copyBtn.addEventListener('click', async ()=>{
      const text = output.textContent || '';
      try{
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Copied';
        setTimeout(()=>copyBtn.textContent='Copy summary',1400);
      }catch(err){
        // fallback
        const ta = document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');copyBtn.textContent='Copied';setTimeout(()=>copyBtn.textContent='Copy summary',1400);}catch(e){alert('Copy failed — select and copy manually.');}ta.remove();
      }
    });
  }

  // Small date insert
  function setYear(){
    const y = new Date().getFullYear();
    const el = document.getElementById('year'); if(el) el.textContent = y;
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    initReveal();
    initPlanner();
    setYear();
  });
})();