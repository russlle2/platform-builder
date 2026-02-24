document.addEventListener('DOMContentLoaded',function(){
  // Pricing toggle with animated numbers
  const toggle=document.getElementById('price-toggle');
  const priceElems=Array.from(document.querySelectorAll('.plans li .price'));
  const animateNumber=(el,from,to,duration=600)=>{
    const start=performance.now();
    const prefix='';
    const suffixEl=el.querySelector('.suffix');
    const numEl=el.querySelector('.num');
    const fromN=from; const toN=to;
    requestAnimationFrame(function step(now){
      const p=Math.min(1,(now-start)/duration);
      const eased=1 - Math.pow(1-p,3);
      const val=Math.round(fromN + (toN-fromN)*eased);
      numEl.textContent=val;
      if(p<1) requestAnimationFrame(step);
      else { if(to===Math.round(to)) numEl.textContent=to; }
    });
    // adjust suffix
    if(to>300){ suffixEl.textContent=toggle.checked?"":"/mo"; }
  };

  priceElems.forEach(el=>{
    // initialize numbers
    const numEl=el.querySelector('.num');
    if(!numEl){
      const span=document.createElement('span'); span.className='num';
      const text=el.getAttribute('data-month')||el.getAttribute('data-package')||'0';
      span.textContent=text; el.prepend(span);
      const suffix=document.createElement('span'); suffix.className='suffix'; suffix.textContent='/mo'; el.appendChild(suffix);
    }
  });

  const updatePrices=()=>{
    const isPackage=toggle.checked;
    document.querySelectorAll('.plans li .price').forEach(el=>{
      const month=Number(el.getAttribute('data-month'))||0;
      const pack=Number(el.getAttribute('data-package'))||0;
      const from=Number(el.querySelector('.num').textContent)||0;
      const to=isPackage?pack:month;
      const suffix=el.querySelector('.suffix');
      suffix.textContent=isPackage?"/package":"/mo";
      animateNumber(el,from,to,500);
    });
  };
  toggle.addEventListener('change',updatePrices);

  // Mood-to-Method selector
  const moodBtns=document.querySelectorAll('.mood');
  const methodTitle=document.getElementById('method-title');
  const methodDesc=document.getElementById('method-desc');
  const moodCta=document.getElementById('mood-cta');
  const moodMap={
    'starter':{
      title:'Starter Series',
      desc:'Six brief, weekly meetings to build immediate tools and an action plan you can try between sessions.',
      cta:'Book a Starter Session'
    },
    'cohort':{
      title:'Foundations Cohort',
      desc:'An 8-week small group that mixes live teaching and shared support—good when you want company and structure.',
      cta:'Join a Cohort'</n    },
    'intensive':{
      title:'Deep Focus Intensive',
      desc:'One or two focused days to map a single decision or challenge and set concentrated next steps.',
      cta:'Schedule an Intensive'
    },
    'skill':{
      title:'Skill-Building Plan',
      desc:'A short tailored series targeting patterns with concrete exercises and accountability.',
      cta:'Start a Skill Plan'
    },
    'grief':{
      title:'Gentle Support Series',
      desc:'Slower-paced sessions with emphasis on pacing, self-compassion, and stabilizing routines.',
      cta:'Request Gentle Support'
    }
  };

  moodBtns.forEach(btn=>{
    btn.addEventListener('click',()=>{
      moodBtns.forEach(b=>b.setAttribute('aria-pressed','false'));
      btn.setAttribute('aria-pressed','true');
      const key=btn.getAttribute('data-method');
      const info=moodMap[key]||moodMap['starter'];
      // subtle morph animation
      methodTitle.animate([{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'ease-out'});
      methodDesc.animate([{opacity:0},{opacity:1}],{duration:320});
      methodTitle.textContent=info.title;
      methodDesc.textContent=info.desc;
      moodCta.textContent=info.cta;
      // update primary CTA wording if present
      const primary=document.getElementById('primary-cta');
      if(primary){
        primary.textContent=info.cta;
      }
    });
  });

  // Initialize
  updatePrices();

});