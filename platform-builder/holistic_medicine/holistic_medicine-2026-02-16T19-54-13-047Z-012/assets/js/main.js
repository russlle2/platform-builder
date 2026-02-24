document.addEventListener('DOMContentLoaded',function(){
  // Nav toggle
  const btn=document.getElementById('nav-toggle');
  const nav=document.getElementById('main-nav');
  btn&&btn.addEventListener('click',()=>{
    nav.classList.toggle('open');
    const expanded = nav.classList.contains('open');
    btn.setAttribute('aria-expanded', expanded);
  });

  // Diagnostic interactivity
  const run=document.getElementById('diag-run');
  const reset=document.getElementById('diag-reset');
  const form=document.getElementById('mini-check');
  const result=document.getElementById('diag-result');

  function summarize(choices){
    if(!choices.length) return 'No area selected. Try one small focus—sleep, movement, or breath—and see how it shifts.';
    const notes=[];
    if(choices.includes('stress')) notes.push('Begin with short breathing resets and 1 small boundary to reduce overload.');
    if(choices.includes('sleep')) notes.push('Create a consistent wind-down: low light, screens off, and a simple evening ritual.');
    if(choices.includes('digestion')) notes.push('Try gentle post-meal movement and a brief food log to notice patterns.');
    if(choices.includes('inflammation')) notes.push('Consider anti-inflammatory meal patterns and paced recovery; discuss with your practitioner.');
    if(choices.includes('energy')) notes.push('Micro-movements, small protein at meals, and focused breaks can lift energy cyclically.');
    return notes.join(' ')+"\n\nThis is educational guidance, not medical diagnosis. For persistent issues, please schedule a consultation.";
  }

  run&&run.addEventListener('click',function(){
    const checked=[...form.querySelectorAll('input[name=q]:checked')].map(i=>i.value);
    result.textContent='Thinking…';
    setTimeout(()=>{ result.textContent=summarize(checked) },300);
  });

  reset&&reset.addEventListener('click',function(){ result.textContent=''; });

  // update year
  const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
});