document.addEventListener('DOMContentLoaded',function(){
  // Year in footer
  const y=document.getElementById('year');if(y) y.textContent=new Date().getFullYear();

  // Micro habit toggles
  document.querySelectorAll('.micro-toggle').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const id='micro-'+btn.dataset.id;
      const el=document.getElementById(id);
      if(!el) return;
      const open=el.style.display==='block';
      document.querySelectorAll('.micro-content').forEach(c=>c.style.display='none');
      el.style.display = open ? 'none' : 'block';
    });
  });

  // Simple smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',function(e){
      e.preventDefault();const id=this.getAttribute('href').slice(1);const t=document.getElementById(id);if(t) t.scrollIntoView({behavior:'smooth'});
    });
  });

  // Tiny accessibility: focus trap for primary CTA when clicked
  const primary=document.querySelector('.nav .cta');
  if(primary){primary.addEventListener('click',()=>{
    // flash effect
    primary.animate([{boxShadow:'0 0 0px rgba(0,0,0,0)'},{boxShadow:'0 6px 24px rgba(139,84,68,0.18)'}],{duration:500,fill:'forwards'});
  });
});
