(function(){
  // Utilities
  function q(id){return document.getElementById(id)}
  function el(tag,attrs){var e=document.createElement(tag);for(var k in attrs)if(k!=='text')e.setAttribute(k,attrs[k]);if(attrs.text)e.textContent=attrs.text;return e}

  // Year
  var y = new Date().getFullYear(); document.getElementById('year').textContent = y;

  // Habit builder
  var habitForm = q('habit-form');
  var habitOutput = q('habit-output');
  habitForm.addEventListener('submit',function(e){
    e.preventDefault();
    var focus = q('habit-focus').value;
    var action = q('habit-action').value || 'Daily practice';
    renderHabit(focus,action);
  });

  function renderHabit(focus,action){
    habitOutput.innerHTML = '';
    var panel = el('div',{class:'card printable'});
    var h = el('h4',{text:focus + ' — 7 day checklist'}); panel.appendChild(h);
    var p = el('p',{text:'Small habit: ' + action}); panel.appendChild(p);
    var list = el('ul',{class:'habit-list'});
    for(var i=1;i<=7;i++){
      var li = el('li',{});
      var cb = el('input',{type:'checkbox'});
      cb.id = 'day-'+i;
      var lab = el('label',{'for':cb.id,text:'Day '+i});
      li.appendChild(cb); li.appendChild(lab);
      list.appendChild(li);
    }
    panel.appendChild(list);
    var btns = el('div',{});
    var printBtn = el('button',{class:'btn',text:'Print checklist'});
    printBtn.addEventListener('click',function(){
      window.print();
    });
    btns.appendChild(printBtn);
    panel.appendChild(btns);
    habitOutput.appendChild(panel);
  }

  // Practice modal
  var modal = q('practice-modal');
  var openPractice = q('open-practice');
  var closePractice = q('close-practice');
  var floating = q('floating-practice');
  var startBtn = q('start-practice');
  var modeSelect = q('practice-mode');
  var durationSelect = q('practice-duration');
  var stage = q('practice-stage');

  function openModal(){ modal.setAttribute('aria-hidden','false'); }
  function closeModal(){ modal.setAttribute('aria-hidden','true'); stage.innerHTML=''; }

  openPractice.addEventListener('click',openModal);
  floating.addEventListener('click',openModal);
  closePractice.addEventListener('click',closeModal);

  // Start practice handler
  startBtn.addEventListener('click',function(){
    var mode = modeSelect.value;
    var dur = parseInt(durationSelect.value,10);
    stage.innerHTML = '';
    if(mode==='breathing'){ renderBreathing(dur); }
    else if(mode==='journaling'){ renderJournaling(dur); }
    else { renderIntention(dur); }
  });

  // Breathing exercise: visual guide + countdown
  function renderBreathing(minutes){
    var seconds = minutes*60;
    var container = el('div',{});
    var circle = el('div',{class:'breath-circle'});
    circle.style.width='160px';circle.style.height='160px';circle.style.borderRadius='50%';circle.style.margin='0 auto';circle.style.background='radial-gradient(circle at 30% 30%, rgba(138,90,68,0.12), rgba(176,122,90,0.06))';
    var info = el('div',{text:'Follow the inhale/exhale guide'});
    info.style.textAlign='center';info.style.marginTop='12px';
    var timer = el('div',{text:formatTime(seconds)});timer.style.textAlign='center';timer.style.fontSize='18px';timer.style.marginTop='8px';
    container.appendChild(circle);container.appendChild(info);container.appendChild(timer);
    stage.appendChild(container);

    var phase=0; // 0 inhale,1 hold,2 exhale
    var cycle = 6; // seconds per inhale+hold+exhale approx
    var start = Date.now();
    var id = setInterval(function(){
      var elapsed = Math.floor((Date.now()-start)/1000);
      var remaining = seconds - elapsed;
      if(remaining<0){ clearInterval(id); timer.textContent='Done'; return; }
      timer.textContent = formatTime(remaining);
      // breathing animation (simple scale)
      var t = (elapsed % cycle) / cycle;
      var scale = 1 + 0.18 * Math.sin(t * Math.PI * 2);
      circle.style.transform = 'scale('+scale+')';
    },250);
  }

  // Journaling: prompt + countdown + save
  function renderJournaling(minutes){
    var secs = minutes*60;
    var promptList = [
      'What would make today feel better by evening? Write one tiny step.',
      'Name one thing you are holding and one small release you can try.',
      'Describe a recent success and how you can repeat it.'
    ];
    var prompt = promptList[Math.floor(Math.random()*promptList.length)];
    var p = el('p',{text:prompt});
    var ta = el('textarea',{id:'journal-text'});ta.style.width='100%';ta.style.height='120px';ta.style.marginTop='8px';
    var timer = el('div',{text:formatTime(secs)});timer.style.marginTop='8px';
    var save = el('button',{class:'btn',text:'Save to file'});
    save.addEventListener('click',function(){
      var text = ta.value || '';
      var blob = new Blob([text],{type:'text/plain'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');a.href=url;a.download='journal.txt';document.body.appendChild(a);a.click();a.remove();
      URL.revokeObjectURL(url);
    });
    stage.appendChild(p);stage.appendChild(ta);stage.appendChild(timer);stage.appendChild(save);
    var start = Date.now();
    var id = setInterval(function(){
      var elapsed = Math.floor((Date.now()-start)/1000);
      var remaining = secs - elapsed;
      if(remaining<0){ clearInterval(id); timer.textContent='Done'; return; }
      timer.textContent = formatTime(remaining);
    },300);
  }

  // Intention setting: short prompt + store in localStorage
  function renderIntention(minutes){
    var p = el('p',{text:'Set an intention for the next '+minutes+' minute(s). Keep it brief.'});
    var input = el('input',{id:'int-input',type:'text'});input.style.width='100%';input.style.marginTop='8px';
    var save = el('button',{class:'btn',text:'Set intention'});
    var show = el('div',{id:'current-int',text:'No intention set.'});show.style.marginTop='10px';
    save.addEventListener('click',function(){
      var v = input.value || '';
      localStorage.setItem('intention',JSON.stringify({text:v,ts:Date.now()}));
      show.textContent = 'Intention: ' + v;
    });
    var existing = localStorage.getItem('intention');
    if(existing) try{ show.textContent = 'Intention: ' + JSON.parse(existing).text }catch(e){}
    stage.appendChild(p);stage.appendChild(input);stage.appendChild(save);stage.appendChild(show);
  }

  function formatTime(sec){
    var m = Math.floor(sec/60); var s = sec%60; return (m?m+':':'') + (s<10? '0'+s : s);
  }

  // Close modal with Escape
  window.addEventListener('keydown',function(e){ if(e.key==='Escape') closeModal(); });

})();
