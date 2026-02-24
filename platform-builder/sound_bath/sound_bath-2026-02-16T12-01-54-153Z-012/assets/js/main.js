// Simple interactivity: mobile nav toggle and diagnostic suggestion
document.addEventListener('DOMContentLoaded',function(){
  var navToggle=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.nav');
  if(navToggle){navToggle.addEventListener('click',function(){nav.classList.toggle('open');});}

  var checkBtn=document.getElementById('check-continue');
  if(checkBtn){
    checkBtn.addEventListener('click',function(e){
      e.preventDefault();
      var radios=document.querySelectorAll('input[name="mood"]');
      var selected=null;for(var r of radios)if(r.checked){selected=r.value;break}
      if(!selected){alert('Choose a feeling to get a suggestion.');return}
      var msg='Try our monthly sound bath to reset — consider the Anchor membership.';
      if(selected==='stressed') msg='We suggest grounding practices: use the 60-Second Breath before the session and arrive early.';
      if(selected==='tired') msg='Consider Companion membership for extra sessions; use the Evening Unwind track after practice.';
      if(selected==='curious') msg='Attend a group gathering and try a private 1:1 intro to explore instruments.';
      if(selected==='grounded') msg='You might benefit from volunteering as a circle host or gifting a session to a friend.';
      alert(msg);
    });
  }

  // Dynamic year
  var y=document.querySelector('.year'); if(y) y.textContent=new Date().getFullYear();
});