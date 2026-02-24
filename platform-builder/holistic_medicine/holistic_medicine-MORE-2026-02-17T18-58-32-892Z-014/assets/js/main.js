(function(){
  // Mood-to-Method selector
  const moods = document.querySelectorAll('.mood');
  const methodTitle = document.querySelector('.method-title');
  const methodDesc = document.querySelector('.method-desc');
  const methodCta = document.getElementById('methodCta');

  const approaches = {
    tired:{
      title:'Gentle Reset Session',
      desc:'Short, restorative protocol focused on sleep hygiene, nervous-system regulation, and a compact home routine to restore energy reserve.',
      cta:'Book a Reset Session'
    },
    wound:{
      title:'Repair-Focused Intensive',
      desc:'A paced intake and targeted care plan emphasizing trauma-informed pacing, somatic resourcing, and relational safety strategies.',
      cta:'Schedule Repair Intensive'
    },
    overwhelmed:{
      title:'Clarity & Boundaries Plan',
      desc:'A structured consult to map stressors, create simple boundary experiments, and practice short stabilization tools you can use daily.',
      cta:'Start a Clarity Session'
    },
    ready:{
      title:'Transformation Intensive',
      desc:'An in-depth working session with measurable targets, followed by short follow-ups to translate shifts into routine change.',
      cta:'Book a Transformation Intensive'
    }
  };

  function setActiveMood(key, btn){
    moods.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const a = approaches[key];
    if(!a) return;
    // morph text with simple fade
    methodTitle.style.opacity = 0;
    methodDesc.style.opacity = 0;
    methodCta.style.opacity = 0;
    setTimeout(()=>{
      methodTitle.textContent = a.title;
      methodDesc.textContent = a.desc;
      methodCta.textContent = a.cta + ' — {{PRIMARY_CTA_LABEL}}';
      methodCta.setAttribute('href','{{PRIMARY_CTA_URL}}');
      methodTitle.style.opacity = 1;
      methodDesc.style.opacity = 1;
      methodCta.style.opacity = 1;
    },220);
    // small background pulse
    const card = document.querySelector('.mood-method');
    card.animate([{boxShadow:'0 0 0 0 rgba(143,211,199,0.1)'},{boxShadow:'0 20px 40px -20px rgba(143,211,199,0.05)'}],{duration:420,fill:'forwards'});
  }

  moods.forEach(btn=>{
    btn.addEventListener('click',()=>setActiveMood(btn.getAttribute('data-key'),btn));
  });
  // default
  const defaultBtn = document.querySelector('.mood[data-key="tired"]');
  if(defaultBtn) setActiveMood('tired',defaultBtn);

  // Pricing comparator (this page includes styles; support for other pages)
  const pricingAreas = document.querySelectorAll('.pricing-compare');
  // Example data for site-global usage
  const pricingData = {
    monthly:[
      {name:'Pulse Plan',price:145,sub:'per month — ongoing support'},
      {name:'Rhythm Intensive',price:420,sub:'per month — single intensive'},
      {name:'Core Reset',price:85,sub:'per month — short follow-ups'}
    ],
    package:[
      {name:'Pulse Plan',price:410,sub:'3-month bundle — save 15%'},
      {name:'Rhythm Intensive',price:990,sub:'one intensive + 2 check-ins'},
      {name:'Core Reset',price:230,sub:'3 follow-ups bundle'}
    ]
  };

  function animateNumber(el,target){
    const start = parseInt(el.textContent.replace(/[^0-9]/g,''))||0;
    const duration = 600; // ms
    const startTime = performance.now();
    function frame(now){
      const t = Math.min(1,(now-startTime)/duration);
      const v = Math.round(start + (target-start)*t);
      el.textContent = '$'+v;
      if(t<1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  pricingAreas.forEach(area=>{
    const toggle = area.querySelector('.toggle');
    const btns = toggle.querySelectorAll('button');
    const list = area.querySelector('.pricing-list');
    function render(mode){
      const set = pricingData[mode];
      const cards = list.querySelectorAll('.price-card');
      set.forEach((item,i)=>{
        const card = cards[i];
        const priceEl = card.querySelector('.price');
        animateNumber(priceEl,item.price);
        card.querySelector('.price-name').textContent = item.name;
        card.querySelector('.price-sub').textContent = item.sub;
      });
    }
    // wire toggle
    btns.forEach(b=>b.addEventListener('click',function(){
      btns.forEach(x=>x.classList.remove('active'));
      this.classList.add('active');
      const mode = this.getAttribute('data-mode');
      render(mode);
    }));
    // initialize
    render('monthly');
  });

})();
