// Minimal JS for nav toggle, ripple effect, and diagnostic logic
(function(){
  const navToggle=document.getElementById('navToggle');
  const mainNav=document.getElementById('mainNav');
  navToggle&&navToggle.addEventListener('click',()=>{
    if(mainNav.style.display==='flex'){mainNav.style.display='none'}else{mainNav.style.display='flex';mainNav.style.flexDirection='column';mainNav.style.background='rgba(2,6,11,0.6)';mainNav.style.padding='12px';navToggle.innerText='✕'}
  });

  // Simple ripple on hero based on pointermove
  const hero=document.getElementById('hero');
  const rippleCanvas=document.getElementById('rippleCanvas');
  function makeDrop(x,y){
    const d=document.createElement('div');
    d.className='drop';
    const size=120+Math.random()*80;
    d.style.width=size+'px';
    d.style.height=size+'px';
    d.style.left=x+'px';
    d.style.top=y+'px';
    d.style.background='radial-gradient(circle at 30% 30%, rgba(155,231,196,0.35), rgba(124,199,255,0.12))';
    rippleCanvas.appendChild(d);
    requestAnimationFrame(()=>{d.style.transition='opacity 900ms ease, transform 900ms ease';d.style.opacity='0';d.style.transform='scale(2)'});
    setTimeout(()=>{d.remove()},1000);
  }
  hero&&hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();makeDrop(e.clientX-r.left,e.clientY-r.top)});

  // Diagnostic form logic (safety-forward suggestions)
  const diagForm=document.getElementById('diagForm');
  const diagRun=document.getElementById('diagRun');
  const diagReset=document.getElementById('diagReset');
  const diagResult=document.getElementById('diagResult');

  function readChecks(){
    const data={};
    new FormData(diagForm).forEach((v,k)=>{data[k]=true});
    return data;
  }

  function suggest(){
    const checks=readChecks();
    const parts=[];
    // Safety-first branching
    if(checks.pregnancy){
      parts.push('Pregnancy note: avoid certain oils and consult your care provider. We recommend citrus- and floral-free, low-concentration diffuser blends and patch tests.');
    }
    if(checks.pets){
      parts.push('Pet-friendly note: keep diffusers in rooms pets can leave; avoid tea tree, eucalyptus, and other oils known to affect animals, and never diffuse near birds.');
    }
    if(checks.sensitivity){
      parts.push('Sensitivity note: start with very low dilution (0.5–1%) and do a small patch test before topical use. Consider inhalation-based routines instead of topical if unsure.');
    }
    if(checks.sleep){
      parts.push('Sleep suggestion: a short 15–20 minute diffusion window 30 minutes before bed with a gentle base of bergamot or lavender alternatives; use low concentration.');
    }
    if(!Object.keys(checks).length){
      parts.push('General suggestion: try a discovery consult to build a personalized plan. You can also start with a single gentle blend in a roller at low dilution for a week.');
    }

    // Always add micro-habit suggestion
    parts.push('Micro-habit: a 3-breath reset using a diffuser at low concentration is an easy daily practice to evaluate response. Patch-test any topical use.');

    return parts.join('\n\n');
  }

  diagRun&&diagRun.addEventListener('click',()=>{
    diagResult.innerText=suggest();
    diagResult.focus();
  });
  diagReset&&diagReset.addEventListener('click',()=>{diagForm.reset();diagResult.innerText='';});

  // Helpful: intercept primary CTA default if placeholder URL not replaced
  document.querySelectorAll('a').forEach(a=>{
    const href=a.getAttribute('href')||'';
    if(href.includes('{{PRIMARY_CTA_URL}}')){
      a.addEventListener('click',e=>{e.preventDefault();alert('Primary CTA not configured. Please set {{PRIMARY_CTA_URL}} in site settings.');});
    }
  });
})();