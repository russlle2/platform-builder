(function(){
  // Basic DOM helpers
  function q(sel, ctx){ return (ctx||document).querySelector(sel) }
  function qa(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)) }

  // Nav toggle for small screens
  var navToggle = q('.nav-toggle');
  var mainNav = q('.main-nav');
  if(navToggle){
    navToggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !expanded);
      if(mainNav){ mainNav.style.display = expanded ? 'none' : 'flex'; }
    });
  }

  // Accordion: session boundaries & confidentiality
  qa('[data-acc] .acc-toggle').forEach(function(btn){
    btn.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      var panel = this.nextElementSibling;
      if(!expanded){
        panel.style.maxHeight = panel.scrollHeight + 'px';
      } else {
        panel.style.maxHeight = '0px';
      }
    });
  });

  // Proof Gallery: rotating testimonials
  var testimonials = [
    {text: 'I left sessions with a clearer plan and less fog. The pace was intentional and useful.'},
    {text: 'Direct, thoughtful, and attuned — the work felt practical and humane.'},
    {text: 'Helped me reorganize a difficult situation so I could make a decision with less anxiety.'}
  ];
  var idx = 0;
  var el = q('#testimonial');
  var speed = (window.templateFields && window.templateFields.defaultTestimonialSpeed) ? window.templateFields.defaultTestimonialSpeed : 6000;
  function showTest(i){
    if(!el) return;
    el.textContent = '“' + testimonials[i].text + '”';
  }
  showTest(idx);
  var rot = setInterval(function(){ idx = (idx+1) % testimonials.length; showTest(idx); }, speed);
  q('#prev') && q('#prev').addEventListener('click', function(){ idx = (idx - 1 + testimonials.length) % testimonials.length; showTest(idx); clearInterval(rot); rot = setInterval(function(){ idx = (idx+1) % testimonials.length; showTest(idx); }, speed); });
  q('#next') && q('#next').addEventListener('click', function(){ idx = (idx + 1) % testimonials.length; showTest(idx); clearInterval(rot); rot = setInterval(function(){ idx = (idx+1) % testimonials.length; showTest(idx); }, speed); });

  // Badges: accessible tooltip on focus
  qa('.badge').forEach(function(b){
    b.setAttribute('tabindex','0');
    b.addEventListener('focus', function(){
      var tip = this.getAttribute('data-tip');
      if(!tip) return;
      var t = document.createElement('span');
      t.className = 'badge-tip';
      t.textContent = tip;
      t.style.position = 'absolute';
      t.style.left = '110%';
      t.style.top = '50%';
      t.style.transform = 'translateY(-50%)';
      t.style.background = '#222';
      t.style.color = '#fff';
      t.style.padding = '6px 8px';
      t.style.borderRadius = '6px';
      t.style.whiteSpace = 'nowrap';
      this.appendChild(t);
    });
    b.addEventListener('blur', function(){
      var tip = this.querySelector('.badge-tip');
      if(tip) tip.remove();
    });
  });

  // Expose template fields for potential editor use
  window.templateFields = window.templateFields || { defaultTestimonialSpeed: 6000 };
})();