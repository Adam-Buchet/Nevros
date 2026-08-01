(function () {
  'use strict';

  const form = document.getElementById('login-form');
  const input = document.getElementById('password');
  const errBox = document.getElementById('login-err');
  const submit = document.getElementById('login-submit');
  const pwToggle = document.getElementById('pw-toggle');

  pwToggle.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    pwToggle.dataset.icon = show ? 'eyeoff' : 'eye';
    pwToggle.querySelector('svg').innerHTML =
      show
        ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
        : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  });

  async function checkAlreadyLogged() {
    try {
      await window.App.api('/api/auth/me');
      window.location.href = 'index.html';
    } catch (e) {}
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = input.value;
    errBox.classList.remove('show');
    submit.disabled = true;

    try {
      await window.App.api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password })
      });
      await window.App.navigate('index.html?intro=1');
      return;
    } catch (err) {
      errBox.textContent = err.message || 'Mot de passe incorrect';
      errBox.classList.add('show');
    }
    submit.disabled = false;
    input.select();
  });

  checkAlreadyLogged();
})();
