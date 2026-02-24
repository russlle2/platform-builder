document.addEventListener('DOMContentLoaded',function(){
  // Aroma wheel hover interactions
  var wheel = document.getElementById('aroma-wheel');
  var sectors = document.querySelectorAll('#sectors .sector');
  var title = document.getElementById('wheel-title');
  var desc = document.getElementById('wheel-desc');
  var notesList = document.getElementById('notes-list');

  var notes = {
    top: ['Bergamot','Grapefruit','Lemon'],
    middle: ['Lavender','Geranium','Rosemary'],
    base: ['Cedarwood','Patchouli','Vanilla']
  };

  function setWheel(slot){
    var el = document.querySelector('#sectors .'+slot);
    if(!el) return;
    title.textContent = el.getAttribute('data-title');
    desc.textContent = el.getAttribute('data-desc');
    // populate notes
    notesList.innerHTML = '';
    (notes[slot]||[]).forEach(function(n){
      var li = document.createElement('li'); li.className='note '+slot; li.textContent = n; notesList.appendChild(li);
    });
  }

  sectors.forEach(function(s){
    s.addEventListener('mouseover',function(){
      var slot = s.getAttribute('data-slot');
      setWheel(slot);
      s.style.opacity = 0.95;
    });
    s.addEventListener('mouseout',function(){
      s.style.opacity = 1;
    });
    s.addEventListener('focus',function(){ setWheel(s.getAttribute('data-slot')); });
  });

  // Init to top
  setWheel('top');

  // Testimonials rotation
  var testimonials = document.querySelectorAll('.testimonial');
  var idx = 0;
  var nextBtn = document.getElementById('next');
  var prevBtn = document.getElementById('prev');
  function showTest(i){
    testimonials.forEach(function(t){t.classList.remove('active');});
    testimonials[i].classList.add('active');
  }
  function advance(n){
    idx = (idx + n + testimonials.length) % testimonials.length; showTest(idx);
  }
  var rot = setInterval(function(){ advance(1); },6000);
  nextBtn.addEventListener('click',function(){ clearInterval(rot); advance(1); });
  prevBtn.addEventListener('click',function(){ clearInterval(rot); advance(-1); });

  // Badges tooltips (accessibility)
  var badges = document.querySelectorAll('.badge');
  badges.forEach(function(b){
    var tip = b.getAttribute('data-tip');
    var tt = document.createElement('div'); tt.className='badge-tooltip'; tt.textContent = tip; b.appendChild(tt);
    b.addEventListener('mouseenter',function(){ tt.style.display='block'; });
    b.addEventListener('mouseleave',function(){ tt.style.display='none'; });
  });

  // Simple keyboard shortcut: press "w" to cycle wheel notes
  document.addEventListener('keydown',function(e){
    if(e.key.toLowerCase()==='w'){
      var order = ['top','middle','base'];
      var cur = title.textContent.toLowerCase().includes('middle')?1:(title.textContent.toLowerCase().includes('base')?2:0);
      var next = (cur+1)%3; setWheel(order[next]);
    }
  });
});