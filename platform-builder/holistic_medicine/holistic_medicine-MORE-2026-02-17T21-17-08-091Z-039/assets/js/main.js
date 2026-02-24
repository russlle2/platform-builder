(function(){
  // Mood-to-Method selector
  const moods = document.querySelectorAll('.mood');
  const methodTitle = document.getElementById('method-title');
  const methodDesc = document.getElementById('method-desc');
  const methodFeatures = document.getElementById('method-features');
  const methodCta = document.getElementById('method-cta');
  const finalCta = document.getElementById('final-cta');

  const moodMap = {
    stressed: {
      title: 'Calm-first approach',
      desc: 'Short, stabilizing steps to reduce activation and create breathing room. Prioritize safety and recovery signals.',
      features: ['Brief safety checks','Night routine priority','Two quick stabilization practices'],
      ctaLabel: 'Book a Stabilizing Call',
      ctaUrl: '{{PRIMARY_CTA_URL}}?flow=stabilize'
    },
    worn: {
      title: 'Replenish sequence',
      desc: 'Gentle rebuilding: rest-supportive habits, pacing and micro-assignments to restore baseline energy.',
      features: ['Energy log','Gentle movement plan','Sleep-friendly cues'],
      ctaLabel: 'Start a Replenish Cycle',
      ctaUrl: '{{PRIMARY_CTA_URL}}?flow=replenish'
    },
    blocked: {
      title: 'Unstick framework',
      desc: 'Identify bottlenecks, test one habit at a time, and build momentum with short feedback loops.',
      features: ['Bottleneck mapping','Micro-goal toolkit','Weekly review slot'],
      ctaLabel: 'Try an Unstick Session',
      ctaUrl: '{{PRIMARY_CTA_URL}}?flow=unstick'
    },
    ready: {
      title: 'Constructive build',
      desc: 'For people ready to add capacity: measured progressions, accountability, and integration plans.',
      features: ['Goal scaffolding','Structured cycles','Maintenance plan options'],
      ctaLabel: 'Plan a Build Cycle',
      ctaUrl: '{{PRIMARY_CTA_URL}}?flow=build'
    }
  };

  function setActiveMood(key, button){
    moods.forEach(m=>m.classList.remove('active'));
    if(button) button.classList.add('active');
    const data = moodMap[key];
    if(!data) return;
    methodTitle.textContent = data.title;
    methodDesc.textContent = data.desc;
    methodFeatures.innerHTML = '';
    data.features.forEach(f=>{
      const li = document.createElement('li'); li.textContent = f; methodFeatures.appendChild(li);
    });
    methodCta.textContent = data.ctaLabel; methodCta.href = data.ctaUrl;
    finalCta.textContent = data.ctaLabel; finalCta.href = data.ctaUrl;
  }

  moods.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.getAttribute('data-key');
      setActiveMood(key, btn);
    });
  });

  // Initialize: no default mood
  document.addEventListener('DOMContentLoaded', ()=>{
    document.getElementById('year').textContent = new Date().getFullYear();
  });

  // Timeline expand/collapse logic (works for both planners)
  const toggles = document.querySelectorAll('.toggle');
  toggles.forEach(t=>{
    t.addEventListener('click', ()=>{
      const target = document.getElementById(t.getAttribute('data-target'));
      if(!target) return;
      target.classList.toggle('open');
      t.textContent = target.classList.contains('open') ? 'Hide' : 'Details';
    });
  });

  // Small progressive reveal when selecting a mood
  function pulseCard(){
    const card = document.getElementById('method-card');
    card.animate([{transform:'scale(0.995)',opacity:0.98},{transform:'scale(1)',opacity:1}],{duration:220,easing:'ease-out'});
  }

  // Observe changes to method-title to pulse
  const obs = new MutationObserver(pulseCard);
  obs.observe(methodTitle,{childList:true});

  // Simple accessibility: allow keyboard selection for mood buttons
  moods.forEach(m=>{
    m.setAttribute('tabindex','0');
    m.addEventListener('keydown', (e)=>{
      if(e.key==='Enter' || e.key===' '){ e.preventDefault(); m.click(); }
    });
  });

})();