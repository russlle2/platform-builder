(function(){
  // Blend builder logic
  const blends = {
    calm: {name:'Calm', oils:[{name:'Lavender',pct:40},{name:'Bergamot',pct:30},{name:'Vetiver',pct:30}]},
    focus: {name:'Focus', oils:[{name:'Rosemary',pct:40},{name:'Peppermint',pct:30},{name:'Lemon',pct:30}]},
    sleep: {name:'Sleep', oils:[{name:'Lavender',pct:50},{name:'Roman Chamomile',pct:25},{name:'Cedarwood',pct:25}]},
    uplift: {name:'Uplift', oils:[{name:'Sweet Orange',pct:50},{name:'Grapefruit',pct:30},{name:'Ylang Ylang',pct:20}]}
  };

  function dropsForVolume(ml, dilutionPercent){
    // Approx: 20 drops = 1 ml
    const mlOfOil = (dilutionPercent/100) * (ml/1); // percent of bottle in ml
    const drops = Math.round(mlOfOil * 20);
    return Math.max(drops,1);
  }

  function dilutionByAudience(audience){
    switch(audience){
      case 'adult': return 2; // percent
      case 'sensitive': return 1;
      case 'child': return 0.5;
      case 'pregnant': return 1; // conservative recommend review
      case 'pet': return 0.5; // for ambient diffusion only; consult vet
      default: return 1.5;
    }
  }

  function buildBlend(vibe, ml, audience){
    const recipe = blends[vibe];
    const dilution = dilutionByAudience(audience);
    const totalDrops = dropsForVolume(ml, dilution);
    // split drops according to oil pct
    const oilDrops = recipe.oils.map(o => ({name:o.name, drops: Math.max(1, Math.round(totalDrops * (o.pct/100)))}));
    return {title:recipe.name, ml, audience, dilution, totalDrops, oilDrops};
  }

  function renderCard(data){
    const card = document.createElement('div');
    card.className = 'blend-card';
    const lines = [];
    lines.push('<strong>'+data.title+' blend</strong>');
    lines.push('<div class="muted">Bottle: '+data.ml+' ml &middot; Approx dilution: '+data.dilution+'% &middot; Total drops: '+data.totalDrops+'</div>');
    lines.push('<ol>');
    data.oilDrops.forEach(o => lines.push('<li>'+o.name+': '+o.drops+' drops</li>'));
    lines.push('</ol>');
    lines.push('<div class="muted">Carrier recommendation: fractionated coconut oil or jojoba to reach the chosen bottle volume. Patch test before topical use.</div>');
    card.innerHTML = lines.join('');
    return card;
  }

  // attach form handlers
  document.addEventListener('DOMContentLoaded', function(){
    const makeBtn = document.getElementById('makeBlend');
    const vibeEl = document.getElementById('vibe');
    const dropsEl = document.getElementById('drops');
    const audEl = document.getElementById('audience');
    const resultWrap = document.getElementById('blendCard');

    makeBtn.addEventListener('click', function(){
      const vibe = vibeEl.value;
      const ml = Number(dropsEl.value);
      const audience = audEl.value;
      const data = buildBlend(vibe, ml, audience);
      resultWrap.classList.remove('empty');
      resultWrap.innerHTML = '';
      resultWrap.appendChild(renderCard(data));
    });

    // Guided practice modal controls
    const modal = document.getElementById('practiceModal');
    const tryBtns = [document.getElementById('tryNowHero'), document.getElementById('tryNowInline')];
    const closeBtn = document.getElementById('closeModal');
    const startBtn = document.getElementById('startPractice');
    const nextBtn = document.getElementById('nextStep');
    const stepText = document.getElementById('practiceStep');
    const title = document.getElementById('practiceTitle');
    const progress = document.getElementById('practiceProgress');

    tryBtns.forEach(b => { if(b) b.addEventListener('click', openModal); });
    closeBtn.addEventListener('click', closeModal);

    let stepIndex = 0; let timer = null;
    const steps = [
      {label:'Ground: Sit tall. Close your eyes if comfortable.', duration:6},
      {label:'Breathe: Inhale 4 seconds, hold 4, exhale 4. Repeat for 3 cycles.', duration:24},
      {label:'Journaling prompt: What do I need right now? Write one short sentence.', duration:30},
      {label:'Set an intention: Choose a tiny action to anchor to this feeling.', duration:10}
    ];

    function openModal(){
      modal.setAttribute('aria-hidden','false');
      stepIndex = 0;
      title.textContent = 'Guided 3-minute practice';
      stepText.textContent = 'Prepare: find a quiet seat and a comfortable posture.';
      startBtn.style.display='inline-block'; nextBtn.style.display='none';
      progress.innerHTML = '<div class="bar" style="width:0%"></div>';
    }
    function closeModal(){
      modal.setAttribute('aria-hidden','true');
      clearInterval(timer);
    }

    function playStep(i){
      const s = steps[i];
      stepText.textContent = s.label;
      // animate progress for the duration
      const bar = progress.querySelector('.bar');
      let elapsed = 0;
      if(timer) clearInterval(timer);
      timer = setInterval(()=>{
        elapsed += 250;
        const pct = Math.min(100, (elapsed/(s.duration*1000))*100);
        if(bar) bar.style.width = pct + '%';
        if(elapsed >= s.duration*1000){
          clearInterval(timer);
          if(i < steps.length-1){ nextBtn.style.display='inline-block'; }
          else { nextBtn.style.display='none'; startBtn.style.display='inline-block'; startBtn.textContent='Done'; }
        }
      },250);
    }

    startBtn.addEventListener('click', function(){
      if(startBtn.textContent === 'Done'){ closeModal(); startBtn.textContent='Start'; return; }
      startBtn.style.display='none';
      nextBtn.style.display='inline-block';
      playStep(stepIndex);
    });

    nextBtn.addEventListener('click', function(){
      stepIndex++;
      if(stepIndex < steps.length){
        playStep(stepIndex);
        nextBtn.style.display='none';
      } else { closeModal(); }
    });

    // Close modal on escape
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeModal(); });
  });
})();