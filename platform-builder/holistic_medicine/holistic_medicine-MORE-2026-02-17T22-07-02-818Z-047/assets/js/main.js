(function(){
  // Mood-to-Method selector
  const moods = document.querySelectorAll('.mood');
  const moodTitle = document.getElementById('mood-title');
  const moodDesc = document.getElementById('mood-desc');
  const methodName = document.getElementById('method-name');
  const methodSummary = document.getElementById('method-summary');
  const methodList = document.getElementById('method-list');
  const moodCta = document.getElementById('mood-cta');
  const primaryCta = document.getElementById('primary-cta');
  const finalCta = document.getElementById('final-cta');

  const moodData = {
    grounding:{title:'Grounding sequence',summary:'Short regulation steps to reduce overwhelm and restore clarity.',items:['2-week sleep window','3-min grounding practice','consistent morning protein'],ctaLabel:'Book a Stabilization Check-in',ctaUrl:'{{PRIMARY_CTA_URL}}?entry=stabilize'},
    rhythm:{title:'Restore rhythm',summary:'Rebuild energy patterns through timing and micro-movement.',items:['Meal timing template','3x/week mobility','hydration routine'],ctaLabel:'Start Rhythm Support',ctaUrl:'{{PRIMARY_CTA_URL}}?entry=rhythm'},
    regulate:{title:'Regulate reactivity',summary:'Micro-practices for anxiety reduction and clearer decision windows.',items:['2-min breath cycles','pause-and-plan prompt','evening reset'],ctaLabel:'Begin Regulation Track',ctaUrl:'{{PRIMARY_CTA_URL}}?entry=regulate'},
    optimize:{title:'Optimize routines',summary:'Performance-minded routines with an emphasis on recovery and testing where helpful.',items:['Strength mini-sessions','recovery windows','baseline labs discussion'],ctaLabel:'Explore Optimization Membership',ctaUrl:'{{PRIMARY_CTA_URL}}?entry=optimize'}
  };

  function clearSelection(){
    moods.forEach(m=>{m.setAttribute('aria-checked','false');m.classList.remove('active')});
  }

  moods.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      clearSelection();
      btn.setAttribute('aria-checked','true');
      btn.classList.add('active');
      const key = btn.getAttribute('data-method');
      const data = moodData[key];
      if(!data) return;
      moodTitle.textContent = data.title;
      methodName.textContent = data.title;
      methodSummary.textContent = data.summary;
      // populate list
      methodList.innerHTML = '';
      data.items.forEach(i=>{
        const li = document.createElement('li'); li.textContent = i; methodList.appendChild(li);
      });
      // update CTAs
      moodCta.textContent = data.ctaLabel;
      moodCta.href = data.ctaUrl;
      primaryCta.textContent = data.ctaLabel;
      primaryCta.href = data.ctaUrl;
      finalCta.textContent = data.ctaLabel;
      finalCta.href = data.ctaUrl;
      // small animation
      methodName.animate([{opacity:0, transform:'translateY(6px)'},{opacity:1, transform:'translateY(0)'}],{duration:260,easing:'ease-out'});
    });
  });

  // Timeline planner interactions
  const phaseButtons = document.querySelectorAll('.phase-action');
  phaseButtons.forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const target = btn.getAttribute('data-target');
      const phase = document.querySelector('.phase[data-phase="'+target+'"]');
      if(!phase) return;
      // toggle detail panel
      const expanded = phase.classList.toggle('expanded');
      if(expanded){
        btn.textContent = 'Save Phase '+target+' Preferences';
        // simulate saving and show a small note
        const note = document.createElement('div');
        note.className = 'saved-note';
        note.textContent = 'Phase '+target+' preferences saved to your draft plan.';
        note.style.marginTop = '8px';note.style.fontSize='0.9rem';note.style.color='#2e6b59';
        phase.querySelector('.phase-body').appendChild(note);
        setTimeout(()=>{ note.style.opacity='0.95' }, 60);
      } else {
        btn.textContent = 'Personalize Phase '+target;
        const note = phase.querySelector('.saved-note');
        if(note) note.remove();
      }
    });
  });

  // Lightweight state persistence (localStorage) for selected mood
  try{
    const last = localStorage.getItem('hm_selected_mood');
    if(last && moodData[last]){
      const btn = document.querySelector('.mood[data-method="'+last+'"]');
      if(btn) btn.click();
    }
    moods.forEach(m=> m.addEventListener('click', ()=>{
      localStorage.setItem('hm_selected_mood', m.getAttribute('data-method'));
    }));
  }catch(e){/* ignore storage errors */}

  // Accessibility: keyboard support for mood buttons
  moods.forEach(btn=>{
    btn.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); btn.click(); }
    });
  });

})();