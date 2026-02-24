(function(){
  // Small interactive behaviors: nav toggle, quiz, year
  document.addEventListener('DOMContentLoaded', function(){
    // Year
    var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
    // Nav toggle
    var toggle=document.querySelector('.nav-toggle');
    var nav=document.querySelector('.nav');
    if(toggle && nav){
      toggle.addEventListener('click', function(){
        nav.style.display = (nav.style.display==='flex') ? 'none' : 'flex';
      });
    }
    // Simple diagnostic calc
    var calc=document.getElementById('quiz-calc');
    if(calc){
      calc.addEventListener('click', function(){
        var q1=+document.getElementById('q1').value;
        var q2=+document.getElementById('q2').value;
        var q3=+document.getElementById('q3').value;
        var avg = Math.round((q1+q2+q3)/3);
        var result=document.getElementById('quiz-result');
        var focus='';
        if(avg<=3) focus='Start with anchors: five breaths, sleep window, and a short morning ritual.';
        else if(avg<=6) focus='Track + small experiments: add a micro-walk and evening note for two weeks.';
        else focus='Deepen practice: integrate group check-ins and a weekly expansion challenge.';
        result.textContent = 'Your focus: '+focus;
      });
    }
    // Smooth scroll for in-page links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click', function(e){
        e.preventDefault();
        var t=document.querySelector(this.getAttribute('href'));
        if(t) t.scrollIntoView({behavior:'smooth'});
      });
    });
  });
})();