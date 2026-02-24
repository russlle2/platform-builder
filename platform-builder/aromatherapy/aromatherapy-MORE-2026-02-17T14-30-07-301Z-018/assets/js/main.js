(function(){
  // Mobile toggle
  var mobileToggle=document.getElementById('mobileToggle');
  mobileToggle && mobileToggle.addEventListener('click',function(){
    var nav=document.querySelector('.nav');
    if(nav.style.display==='block'){nav.style.display='';}else{nav.style.display='block'}
  });

  // Pricing comparator
  var switches=document.querySelectorAll('.toggle .switch');
  var currentMode='monthly';
  var planEls=document.querySelectorAll('.plan');

  function animateNumber(el,start,end,duration){
    var startTime=null;
    var numEl=el.querySelector('.num');
    if(!numEl) return;
    window.requestAnimationFrame(function step(ts){
      if(!startTime) startTime=ts;
      var progress=Math.min((ts-startTime)/duration,1);
      var value=Math.round(start + (end-start)*progress);
      numEl.textContent=value;
      if(progress<1) window.requestAnimationFrame(step);
    });
  }

  function setMode(mode){
    currentMode=mode;
    switches.forEach(function(s){s.classList.toggle('active', s.getAttribute('data-mode')===mode);});
    planEls.forEach(function(p){
      var month=Number(p.getAttribute('data-month')||0);
      var pack=Number(p.getAttribute('data-package')||0);
      var displayStart=Number(p.querySelector('.num').textContent)||0;
      var target = (mode==='monthly')? month : pack;
      animateNumber(p,displayStart,target,550);
      var suffix = (mode==='monthly')? '/mo' : ' pack';
      var suffixEl = p.querySelector('.suffix');
      if(suffixEl) suffixEl.textContent = (mode==='monthly')? '/mo or $' + p.getAttribute('data-package') + ' pack' : '/pack';
    });
  }

  switches.forEach(function(s){
    s.addEventListener('click',function(){
      var mode=s.getAttribute('data-mode');
      setMode(mode);
    });
  });

  // Initialize pricing numbers from data-month
  planEls.forEach(function(p){
    var start = Number(p.getAttribute('data-month')||0);
    var numEl = p.querySelector('.num');
    if(numEl) numEl.textContent = start;
  });
  // Mark initial switch active
  setMode('monthly');

  // Testimonial rotation and badges with tooltips
  var tests=[
    {text:'"The session helped me tune into small, manageable practices I could actually try."',author:'— Workshop attendee'},
    {text:'"Clear guidance on safe blending and quick rituals I now use on busy days."',author:'— Private client'},
    {text:'"Thoughtful, safety-first approach; I appreciated the attention to pets and sensitivities."',author:'— Local participant'}
  ];
  var tIndex=0;
  var quoteEl=document.querySelector('.testimonial-box .quote');
  var authorEl=document.querySelector('.testimonial-box .author');
  function showTest(i){
    tIndex=(i+tests.length)%tests.length;
    quoteEl.style.opacity=0;authorEl.style.opacity=0;
    setTimeout(function(){
      quoteEl.textContent = tests[tIndex].text;
      authorEl.textContent = tests[tIndex].author;
      quoteEl.style.opacity=1;authorEl.style.opacity=1;
    },250);
  }
  document.getElementById('prevTest').addEventListener('click',function(){ showTest(tIndex-1); });
  document.getElementById('nextTest').addEventListener('click',function(){ showTest(tIndex+1); });
  // Auto-rotate
  setInterval(function(){ showTest(tIndex+1); },6000);

  // Badges tooltip
  var badges=document.querySelectorAll('.badge');
  var tip=document.getElementById('badgeTip');
  badges.forEach(function(b){
    b.addEventListener('mouseenter',function(e){
      tip.textContent = b.getAttribute('data-tip') || '';
      tip.style.display='block';
      tip.setAttribute('aria-hidden','false');
      // position
      var r=b.getBoundingClientRect();
      var parentRect=document.querySelector('.credibility').getBoundingClientRect();
      tip.style.position='absolute';
      tip.style.left = (r.left - parentRect.left) + 'px';
      tip.style.top = (r.bottom - parentRect.top + 8) + 'px';
    });
    b.addEventListener('mouseleave',function(){
      tip.style.display='none';tip.setAttribute('aria-hidden','true');
    });
    // keyboard accessible
    b.addEventListener('focus',function(){ b.dispatchEvent(new Event('mouseenter')); });
    b.addEventListener('blur',function(){ b.dispatchEvent(new Event('mouseleave')); });
  });

})();
