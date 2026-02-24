(function(){
  // Year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.primary-nav');
  toggle && toggle.addEventListener('click', function(){
    nav.style.display = (nav.style.display === 'flex') ? 'none' : 'flex';
  });

  // Diagnostic guidance - safety-forward
  var diagBtn = document.getElementById('diagCheck');
  var diagResult = document.getElementById('diagResult');
  diagBtn && diagBtn.addEventListener('click', function(){
    var form = document.getElementById('diagForm');
    var data = new FormData(form);
    var flags = [];
    if(data.get('pregnancy')) flags.push('pregnancy or trying to conceive');
    if(data.get('pets')) flags.push('pets in the home');
    if(data.get('sensitive_skin')) flags.push('sensitive skin or known allergies');
    if(data.get('asthma')) flags.push('asthma or respiratory sensitivities');

    var text = '';
    if(!flags.length){
      text = 'Gentle guidance: You may explore mild inhalation and diluted topical blends. Always patch test and follow dilution charts.';
    } else {
      text = 'Safety notes for: ' + flags.join(', ') + '. Please prioritize low dilution, avoid certain topicals (if pregnant or with pets), and consult relevant care providers. Do a patch test before topical use.';
    }
    diagResult.textContent = text;
    diagResult.classList.remove('hidden');
  });

  // Pricing toggle
  var priceButtons = document.querySelectorAll('.pricing-toggle .btn');
  var pricingGrid = document.getElementById('pricingGrid');
  priceButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      var period = btn.getAttribute('data-period');
      document.querySelectorAll('.pricing-toggle .btn').forEach(function(b){b.classList.remove('primary')});
      btn.classList.add('primary');
      document.querySelectorAll('.price-card .price').forEach(function(el){
        var m = el.getAttribute('data-monthly');
        var y = el.getAttribute('data-yearly');
        if(period === 'monthly'){
          el.textContent = '$' + m + ' / mo';
        } else {
          el.textContent = '$' + y + ' / yr';
        }
      });
    });
  });

  // Default monthly selected
  var defaultBtn = document.querySelector('.pricing-toggle .btn[data-period="monthly"]');
  defaultBtn && defaultBtn.click();

})();
