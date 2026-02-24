(function(){
  // small UI behaviors for the cohort site
  var navToggle = document.getElementById('navToggle');
  navToggle && navToggle.addEventListener('click', function(){
    var nav = document.querySelector('.nav ul');
    if(!nav) return;
    nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
  });

  // diagnostic form simple matcher
  var form = document.getElementById('diagnosticForm');
  var result = document.getElementById('diagResult');
  form && form.addEventListener('submit', function(e){
    e.preventDefault();
    var data = new FormData(form);
    var score = 0;
    var map = {low:0,rare:0,none:0,poor:0,moderate:1,sometimes:1,ok:1,high:2,daily:2,regular:2,good:2};
    for(var pair of data.entries()){ score += (map[pair[1]]||0); }
    var path = '';
    if(score <= 4) path = 'Rest & Rebuild: focus on gentle rhythms and sleep hygiene.';
    else if(score <= 8) path = 'Stability Path: anchor micro-habits and weekly rhythm.';
    else path = 'Momentum Path: deepen routines and community accountability.';
    result.textContent = path + ' Recommended program: ' + (score<=4? 'Spark' : (score<=8? 'Flow' : 'Tribe')) + '.';
  });

  // pricing toggle
  var toggles = document.querySelectorAll('.pricing-toggle .btn');
  toggles.forEach(function(btn){
    btn.addEventListener('click', function(){
      toggles.forEach(function(b){b.classList.remove('active')});
      btn.classList.add('active');
      var level = btn.getAttribute('data-level');
      document.querySelectorAll('.price-card').forEach(function(card){
        var m = card.getAttribute('data-price-monthly');
        var c = card.getAttribute('data-price-cohort');
        var amount = level === 'monthly' ? m : c;
        card.querySelector('.amount').textContent = '$' + amount;
      });
    });
  });

  // set year
  var y = document.getElementById('year');
  if(y) y.textContent = new Date().getFullYear();
})();