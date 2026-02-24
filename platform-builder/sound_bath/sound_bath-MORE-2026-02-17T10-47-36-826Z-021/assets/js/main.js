(function(){
  // Utilities
  function q(sel){return document.querySelector(sel)}
  function qa(sel){return Array.from(document.querySelectorAll(sel))}

  // Year in footer
  var year = new Date().getFullYear();
  var yearEl = q('#year'); if(yearEl) yearEl.textContent = year;

  // Program templates for different textures
  var programs = {
    gentle: [
      {id:'p1',title:'Drift — Short Cohort',desc:'A softer field with breath cues and bell textures. Ideal for a first try or a midday reset.',price:'$12-$25 (tiered)'} ,
      {id:'p2',title:'Murmur — Deepening Set',desc:'Warm tones, longer sustain; group prompts for gentle reflection and shared anchoring.',price:'$18-$35 (sliding)'} ,
      {id:'p3',title:'Anchor — Grounding Mini',desc:'Low-tone focus with guided breathing for practical calm before your day continues.',price:'$10-$20'}
    ],
    medium: [
      {id:'p4',title:'Current — Balanced Cohort',desc:'Mid-range harmonics, steady pulses and attentive transitions for a full session.',price:'$20-$40 (per seat)'} ,
      {id:'p5',title:'Ridge — Focused Set',desc:'Layered bowls and chimes; designed to open attention and then land softly.',price:'$24-$45'} ,
      {id:'p6',title:'Evening Field',desc:'Designed for evening doings; soft-and-warm textures to support rest routines.',price:'$16-$32'}
    ],
    intense: [
      {id:'p7',title:'Tonic — Deep Sound Field',desc:'Denser harmonics and sustained tones for those comfortable with fuller vibration.',price:'$28-$55'} ,
      {id:'p8',title:'Crescent — Extended Cohort',desc:'Longer arcs, layered instruments, intentional silence windows.',price:'$35-$65'} ,
      {id:'p9',title:'Pulse — Sturdy Reset',desc:'Sharper transient elements for a decisive reorientation and clarity.',price:'$22-$48'}
    ]
  };

  // Render program cards
  var cardsContainer = q('#programCards');
  function renderPrograms(level){
    var list = programs[level]||programs.gentle;
    cardsContainer.innerHTML = '';
    list.forEach(function(p){
      var div = document.createElement('div');
      div.className = 'program card';
      div.innerHTML = '<h3>'+p.title+'</h3><p class="desc">'+p.desc+'</p><p class="price">'+p.price+'</p><div style="margin-top:12px"><a class="btn btn-sm btn-primary" href="book.html?program='+encodeURIComponent(p.id)+'">Reserve</a> <a class="btn btn-sm" href="pricing.html">Details</a></div>';
      cardsContainer.appendChild(div);
    });
  }
  // default
  renderPrograms('gentle');

  // Mixer interactions
  qa('.mixer-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      qa('.mixer-btn').forEach(function(b){b.classList.remove('active');b.setAttribute('aria-checked','false')});
      btn.classList.add('active');btn.setAttribute('aria-checked','true');
      var level = btn.getAttribute('data-level');
      renderPrograms(level);
      // subtle visual cue
      cardsContainer.animate([{opacity:0.6,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:380,easing:'cubic-bezier(.2,.8,.2,1)'});
    })
  });

  // Testimonials rotation
  var testimonials = [
    {quote:'The session kept me centered for the rest of the afternoon. I recommend starting with the gentle cohort.',name:'— Talia, educator'},
    {quote:'The sound field felt intentional — not loud, but not diluted. Afterwards I noticed a steadier breath.',name:'— Marco, nurse'},
    {quote:'I liked the tiered ticketing and the clear instructions. The mix suited my needs.',name:'— Priya, engineer'}
  ];
  var tIndex = 0;
  var testimonialWrap = q('.testimonials');
  function showTestimonial(i){
    testimonialWrap.innerHTML = '';
    var t = testimonials[i%testimonials.length];
    var block = document.createElement('blockquote');
    block.className = 'testimonial card';
    block.innerHTML = '<p class="quote">"'+t.quote+'"</p><footer>'+t.name+'</footer>';
    testimonialWrap.appendChild(block);
  }
  showTestimonial(0);
  setInterval(function(){ tIndex++; showTestimonial(tIndex); },4200);

  // Badge tooltips already done with CSS [data-tip]

  // Menu toggle for small screens
  var menuToggle = q('.menu-toggle');
  menuToggle && menuToggle.addEventListener('click',function(){
    var nav = q('.main-nav');
    if(nav.style.display === 'flex'){nav.style.display='none'}else{nav.style.display='flex';nav.style.flexDirection='column';nav.style.gap='8px';nav.style.background='rgba(255,255,255,0.98)';nav.style.padding='12px';nav.style.borderRadius='10px'}
  });

  // Accessible focus outline for keyboard
  document.addEventListener('keydown',function(e){ if(e.key==='Tab'){document.documentElement.classList.add('show-focus')} });

})();
