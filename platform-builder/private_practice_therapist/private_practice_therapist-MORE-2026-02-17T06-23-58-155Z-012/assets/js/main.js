(function(){
  // Mood-to-Method mapping
  const map = {
    'overwhelmed':{
      title:'Rhythm Reset — short series',
      desc:'A 4–6 session pathway to structure small habits and reduce scattered overwhelm. We focus on one manageable change at a time and check what actually helps you keep going.',
      ctaLabel:'Join a short pathway',
      ctaUrl:'/book.html?pathway=rhythm-reset'
    },
    'stuck':{
      title:'Pattern Lab — focused coaching series',
      desc:'Hands-on experiments to uncover repeating patterns and test new responses. Ideal if you notice the same outcomes and want to try a different approach with clinical support.',
      ctaLabel:'Explore the Pattern Lab',
      ctaUrl:'/book.html?pathway=pattern-lab'
    },
    'in_transition':{
      title:'Transition Cohort — time-limited group',
      desc:'A cohort designed for endings and beginnings: shared learning, brief skill practice, and practical planning to land intentionally on the other side of change.',
      ctaLabel:'See upcoming cohorts',
      ctaUrl:'/specialties.html#cohorts'
    },
    'anxious':{
      title:'Anchor Sessions — stabilization pathway',
      desc:'Short-term sessions aimed at immediate regulation tools and building a simple plan to reduce daily reactivity. We prioritize safety and quick, usable strategies.',
      ctaLabel:'Start with an Anchor Session',
      ctaUrl:'/book.html?pathway=anchor'
    },
    'grieving':{
      title:'Companion Pathway — grief-friendly support',
      desc:'A gentle sequence honoring loss and practical steps for pacing activity and rest. You can bring memories, decisions, or logistical needs—each has a place in this work.',
      ctaLabel:'Request a companion pathway',
      ctaUrl:'/contact.html#grief'
    },
    'seeking_focus':{
      title:'Clarity Sprint — 3-session focus',
      desc:'Three precise sessions to set priorities, test a routine, and decide the next step. Designed for people who want to emerge with clearer choices and a short plan.',
      ctaLabel:'Book a Clarity Sprint',
      ctaUrl:'/book.html?pathway=clarity-sprint'
    }
  };

  const select = document.getElementById('mood-select');
  const result = document.getElementById('mood-result');
  const primary = document.getElementById('primary-cta');
  const originalCta = {label:primary.textContent, url:primary.getAttribute('href')};

  function renderNone(){
    result.innerHTML = '<h4 class="small">Recommended pathway</h4><p class="lead">Pick a mood to see a recommended approach.</p>';
    primary.textContent = originalCta.label;
    primary.setAttribute('href', originalCta.url);
  }

  select.addEventListener('change', function(){
    const val = select.value;
    if(!val || val==='none'){ renderNone(); return; }
    const item = map[val];
    if(!item){ renderNone(); return; }
    result.innerHTML = '<h4 class="small">'+escapeHtml(item.title)+'</h4><p class="lead">'+escapeHtml(item.desc)+'</p>';
    primary.textContent = item.ctaLabel || originalCta.label;
    primary.setAttribute('href', item.ctaUrl || originalCta.url);
  });

  // Simple accordion behavior for FAQ
  document.querySelectorAll('.acc-toggle').forEach(btn => {
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-target');
      const panel = document.getElementById(id);
      const open = panel.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  // Basic HTML escape
  function escapeHtml(str){
    return String(str).replace(/[&<>\"]/g, function(s){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s];
    });
  }
})();
