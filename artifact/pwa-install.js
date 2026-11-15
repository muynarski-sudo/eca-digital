/* Registro do service worker (uso offline) e aviso de instalação. */
(function () {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
    // quando uma versão nova assume o controle, recarrega uma vez para mostrar a versão nova
    var had = !!navigator.serviceWorker.controller;
    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!had || reloaded) return;
      reloaded = true;
      location.reload();
    });
  }
  var standalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) return;
  var KEY = 'ffp-install-dismissed';
  var dismissed = false;
  try {
    dismissed = localStorage.getItem(KEY) === '1';
  } catch (e) {}
  if (dismissed) return;
  var deferred = null;
  function bar(text, withInstall) {
    var el = document.createElement('div');
    el.id = 'pwa-bar';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Instalar o app');
    el.innerHTML = '<p></p><div class="row2"></div>';
    el.querySelector('p').textContent = text;
    var row = el.querySelector('.row2');
    if (withInstall) {
      var b = document.createElement('button');
      b.className = 'btn';
      b.textContent = 'Instalar';
      b.addEventListener('click', function () {
        if (!deferred) return;
        deferred.prompt();
        deferred.userChoice.finally(function () {
          el.remove();
        });
      });
      row.appendChild(b);
    }
    var x = document.createElement('button');
    x.className = 'btn sec';
    x.textContent = 'Agora não';
    x.addEventListener('click', function () {
      try {
        localStorage.setItem(KEY, '1');
      } catch (e) {}
      el.remove();
    });
    row.appendChild(x);
    document.body.appendChild(el);
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    bar('Instale o app no seu celular para usar sem internet.', true);
  });
  var ua = navigator.userAgent;
  var ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) {
    setTimeout(function () {
      if (!document.getElementById('pwa-bar'))
        bar(
          'Para instalar: toque em Compartilhar e depois em "Adicionar à Tela de Início".',
          false,
        );
    }, 1500);
  }
})();
