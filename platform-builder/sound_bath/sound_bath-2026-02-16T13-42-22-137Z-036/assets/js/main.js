// Light interaction: nav toggle, FAQ accordion, inject year & next event
(function(){
  document.addEventListener('DOMContentLoaded',function(){
    // Year
    var y=document.getElementById('year');if(y) y.textContent=new Date().getFullYear();
    // Nav toggle
    var toggle=document.querySelector('.nav-toggle'), nav=document.querySelector('.nav');
    if(toggle && nav){
      toggle.addEventListener('click',function(){
        var expanded=this.getAttribute('aria-expanded')== 'true';
        this.setAttribute('aria-expanded',!expanded);
        nav.classList.toggle('open');
      });
    }
    // FAQ accordion
    document.querySelectorAll('.q').forEach(function(btn){
      btn.addEventListener('click',function(){
        var id=this.getAttribute('data-toggle');
        var panel=document.getElementById(id);
        if(!panel) return;
        panel.classList.toggle('open');
        panel.style.maxHeight = panel.classList.contains('open') ? panel.scrollHeight + 'px' : null;
      });
    });
    // Smooth scroll for internal anchors
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        e.preventDefault();
        var t=document.querySelector(this.getAttribute('href'));
        if(t) t.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
    // Inject NEXT_EVENT_DATE placeholders into any element with data-next-event
    var nexts = document.querySelectorAll('[data-next-event]');
    nexts.forEach(function(el){ el.textContent = el.textContent.replace(/\{\{NEXT_EVENT_DATE\}\}/g, ''); });
  });
})();