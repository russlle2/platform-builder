(function(){
  // Small interactions: nav toggle, year, newsletter stub
  document.addEventListener('DOMContentLoaded',function(){
    var navToggle=document.getElementById('navToggle');
    var nav=document.getElementById('nav');
    if(navToggle && nav){
      navToggle.addEventListener('click',function(){
        var open=nav.style.display==='flex';
        nav.style.display=open? 'none' : 'flex';
        nav.style.flexDirection='column';
      });
    }

    var year=document.getElementById('year');
    if(year) year.textContent=new Date().getFullYear();

    var newsletter=document.getElementById('newsletter');
    if(newsletter){
      newsletter.addEventListener('submit',function(e){
        e.preventDefault();
        var em=newsletter.querySelector('input[name=email]');
        if(em && em.value){
          // Simple feedback; integrate with real backend as needed
          alert('Thanks — we\'ll send occasional safety tips and blend notes to '+em.value);
          em.value='';
        }
      });
    }
  });
})();
