/* Founder-access form — posts to the same-origin Vercel function.
   Field names and endpoint are unchanged from the previous build. */
(function () {
  'use strict';

  var ENDPOINT = '/api/founder-access';
  var form = document.getElementById('claim-form');
  if (!form) return;

  var errorBox = document.getElementById('claim-error');
  var successBox = document.getElementById('claim-success');
  var button = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.style.display = 'none';

    var payload = {
      name: form.name.value,
      email: form.email.value,
      practice_name: form.practice_name.value,
      clinicians: form.clinicians.value,
      monthly_consultations: form.monthly_consultations.value,
      website: form.website.value,
      plan: new URLSearchParams(location.search).get('plan') || '',
      source_page: location.pathname + location.search
    };

    if (!payload.name.trim() || !payload.practice_name.trim() ||
        !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email.trim())) {
      errorBox.textContent = 'Please fill in your name, a valid email, and your practice name.';
      errorBox.style.display = 'block';
      return;
    }

    button.disabled = true;
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.ok && data.ok) {
          form.style.display = 'none';
          successBox.style.display = 'block';
        } else {
          throw new Error(data.error || 'Request failed');
        }
      });
    }).catch(function (err) {
      button.disabled = false;
      errorBox.innerHTML = (err.message === 'Failed to fetch'
        ? 'Something went wrong sending your request.'
        : err.message) + ' You can also email <a href="mailto:haroonismail87@gmail.com">haroonismail87@gmail.com</a> directly.';
      errorBox.style.display = 'block';
    });
  });
})();
