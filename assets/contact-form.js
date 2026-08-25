/* Contact form — posts to the same-origin Vercel function.
   Mirrors claim-form.js; the endpoint has no database behind it, so a failed
   send is reported to the visitor rather than silently swallowed. */
(function () {
  'use strict';

  var ENDPOINT = '/api/contact';
  var form = document.getElementById('contact-form');
  if (!form) return;

  var errorBox = document.getElementById('contact-error');
  var successBox = document.getElementById('contact-success');
  var button = form.querySelector('button[type="submit"]');

  // Preselect the topic when arriving from a deep link, e.g. the trust page's
  // "Ask the founder" CTA (?topic=trust) or the privacy policy's rights
  // section (?topic=data). Unknown values fall through to "Choose one".
  var TOPICS = {
    trust: 'Trust and security',
    data: 'Data protection request',
    pricing: 'Pricing',
    product: 'Product question'
  };
  var wanted = TOPICS[new URLSearchParams(location.search).get('topic')];
  if (wanted && form.topic.querySelector('option[value="' + wanted + '"]')) {
    form.topic.value = wanted;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.style.display = 'none';

    var payload = {
      name: form.name.value,
      email: form.email.value,
      practice_name: form.practice_name.value,
      topic: form.topic.value,
      message: form.message.value,
      website: form.website.value,
      source_page: location.pathname + location.search
    };

    if (!payload.name.trim() || !payload.message.trim() ||
        !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email.trim())) {
      errorBox.textContent = 'Please fill in your name, a valid email, and your message.';
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
      errorBox.textContent = (err.message === 'Failed to fetch'
        ? 'Something went wrong sending your message.'
        : err.message) + ' Please try again in a moment.';
      errorBox.style.display = 'block';
    });
  });
})();
