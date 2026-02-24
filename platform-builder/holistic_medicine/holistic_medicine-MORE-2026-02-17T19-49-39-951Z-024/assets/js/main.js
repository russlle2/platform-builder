(function(){
  // Mood-to-Method selector
  const moodMap = {
    overwhelmed: {
      title: 'Simplify & Protect',
      text: 'Start by narrowing to two non-negotiable supports: a consistent wind-down and a single midday reset. Reduce decision load this week.',
      cta: 'Try a Simplify Call',
      url: '{{PRIMARY_CTA_URL}}'
    },
    drained: {
      title: 'Energy First',
      text: 'Focus on sleep timing, small protein snacks, and 10 minutes of light movement. These tests help reveal energy patterns.',
      cta: 'Book Energy Session',
      url: '{{PRIMARY_CTA_URL}}'
    },
    curious: {
      title: 'Explore & Measure',
      text: 'Set up tracking for sleep and mood, and pick one experiment to test for 2 weeks. Reflection matters as much as action.',
      cta: 'Start an Exploration',
      url: '{{PRIMARY_CTA_URL}}'
    },
    restless: {
      title: 'Rhythm Reset',
      text: 'Prioritize short rituals: a pre-bed ritual and an afternoon pause. Aim for consistency over perfection for 2 weeks.',
      cta: 'Begin Rhythm Reset',
      url: '{{PRIMARY_CTA_URL}}'
    }
  };

  function initMoodSelector(){
    const radios = document.querySelectorAll('.mood-selector input[name="mood"]');
    const title = document.getElementById('moodMethodTitle');
    const text = document.getElementById('moodMethodText');
    const primary = document.getElementById('primaryCta');

    radios.forEach(r=>r.addEventListener('change', (e)=>{
      const key = e.target.value;
      const m = moodMap[key];
      if(!m) return;
      title.textContent = m.title;
      text.textContent = m.text;
      primary.textContent = m.cta;
      primary.setAttribute('href', m.url || '{{PRIMARY_CTA_URL}}');
      // subtle highlight to draw attention
      primary.classList.add('pulse');
      setTimeout(()=>primary.classList.remove('pulse'),900);
    }));
  }

  // Timeline planner: save and reset
  function initPlanner(){
    const save = document.getElementById('savePlan');
    const reset = document.getElementById('resetPlan');
    const checkboxes = Array.from(document.querySelectorAll('.task-checkbox'));

    function load(){
      try{
        const raw = localStorage.getItem('hm_plan');
        if(!raw) return;
        const data = JSON.parse(raw);
        checkboxes.forEach((cb,i)=>cb.checked = !!data[i]);
      }catch(e){console.warn('load plan err',e)}
    }
    function savePlan(){
      const arr = checkboxes.map(cb=>cb.checked);
      localStorage.setItem('hm_plan',JSON.stringify(arr));
      save.textContent = 'Saved';
      setTimeout(()=>save.textContent='Save plan locally',1200);
    }
    function resetPlan(){
      checkboxes.forEach(cb=>cb.checked=false);
      localStorage.removeItem('hm_plan');
    }
    save.addEventListener('click',savePlan);
    reset.addEventListener('click',resetPlan);
    load();
  }

  // small utility: replace year and support keyboard quick select
  function initPage(){
    const y = new Date().getFullYear();
    const el = document.getElementById('year'); if(el) el.textContent = y;

    // keyboard shortcuts for moods (1-4)
    document.addEventListener('keydown', (e)=>{
      if(['1','2','3','4'].includes(e.key)){
        const idx = {'1':'overwhelmed','2':'drained','3':'curious','4':'restless'}[e.key];
        const input = document.querySelector(`.mood-selector input[value="${idx}"]`);
        if(input){ input.checked=true; input.dispatchEvent(new Event('change')); }
      }
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{
    initMoodSelector();
    initPlanner();
    initPage();
  });
})();
