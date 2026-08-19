/* SmileOS — shared nav behaviour.
   Dropdown panels sit below the bar in flow, so they can never overlap a wrapped nav.
   Click to open, click again or navigate away to close. */
(function () {
  'use strict';

  var nav = document.querySelector('.site-nav');
  if (!nav) return;

  var triggers = Array.prototype.slice.call(nav.querySelectorAll('[data-panel]'));
  var panels = {};

  triggers.forEach(function (btn) {
    var key = btn.getAttribute('data-panel');
    var panel = document.getElementById('nav-panel-' + key);
    if (panel) panels[key] = panel;
  });

  function closeAll(except) {
    triggers.forEach(function (btn) {
      var key = btn.getAttribute('data-panel');
      if (key === except) return;
      btn.setAttribute('aria-expanded', 'false');
      if (panels[key]) panels[key].hidden = true;
    });
  }

  triggers.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var key = btn.getAttribute('data-panel');
      var panel = panels[key];
      if (!panel) return;
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      closeAll(key);
      btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      panel.hidden = isOpen;
    });
  });

  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target) && !Object.keys(panels).some(function (k) {
      return panels[k].contains(e.target);
    })) closeAll();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
  });

  /* Mobile menu toggle */
  var toggle = nav.querySelector('.nav-toggle');
  var links = nav.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!open) closeAll();
    });
  }
})();
