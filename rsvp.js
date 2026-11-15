// Анкета гостя: собирает ответы в текст и отдаёт его в мессенджер или в буфер обмена.
// Сервера у сайта нет, поэтому ответы уходят сообщением на номер из RECIPIENT.
(function () {
  'use strict';

  var RECIPIENT = { whatsapp: '79777681520', telegram: '+79777681520' };

  var form = document.getElementById('rsvp');
  var status = document.getElementById('rsvp-status');
  var nameError = document.getElementById('name-error');
  var manualCopy = document.getElementById('rsvp-manual');
  if (!form) return;

  function value(name) {
    var field = form.elements[name];
    return field && typeof field.value === 'string' ? field.value.trim() : '';
  }

  function buildMessage() {
    var lines = [
      'Анкета гостя',
      'ФИО: ' + value('name'),
      'Вторая половинка: ' + (value('partner') || 'приду без пары'),
      'ЗАГС или ресторан: ' + (value('place') || 'не указано'),
      'Аллергия: ' + (value('allergy') || 'нет'),
      'Напитки: ' + (value('drinks') || 'не указано')
    ];
    return lines.join('\n');
  }

  // Запасной путь для старых браузеров, встроенных браузеров мессенджеров и страниц не по https.
  function copyViaSelection(text) {
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '0';
      area.style.fontSize = '16px';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      area.setSelectionRange(0, text.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(area);
      if (ok) { resolve(); } else { reject(new Error('copy failed')); }
    });
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { return copyViaSelection(text); });
    }
    return copyViaSelection(text);
  }

  // Показывает текст ответов на странице, чтобы гость скопировал его вручную.
  function showAnswersForManualCopy(text) {
    manualCopy.value = text;
    manualCopy.hidden = false;
    manualCopy.focus();
    manualCopy.select();
  }

  function showNameError(visible) {
    nameError.hidden = !visible;
    form.elements.name.setAttribute('aria-invalid', visible ? 'true' : 'false');
  }

  form.elements.name.addEventListener('input', function () { showNameError(false); });

  // Safari до 15.4 не передаёт нажатую кнопку в событии submit, поэтому запоминаем её сами.
  var pressedVia = null;
  form.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-via]');
    if (button) pressedVia = button.dataset.via;
  });

  function openMessenger(url) {
    var tab = window.open(url, '_blank');
    if (tab) {
      tab.opener = null;
    } else {
      // Встроенные браузеры мессенджеров новые вкладки не открывают.
      window.location.href = url;
    }
  }

  // Enter в однострочном поле переводит к следующему вопросу, а не отправляет недозаполненную анкету.
  form.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' || event.target.tagName !== 'INPUT' || event.target.type !== 'text') return;
    event.preventDefault();
    var fields = Array.prototype.slice.call(form.querySelectorAll('input, textarea'));
    var next = fields[fields.indexOf(event.target) + 1];
    if (next) next.focus();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    status.textContent = '';
    manualCopy.hidden = true;
    var via = (event.submitter && event.submitter.dataset.via) || pressedVia || 'copy';
    pressedVia = null;

    if (!value('name')) {
      showNameError(true);
      form.elements.name.focus();
      return;
    }

    var text = buildMessage();

    if (via === 'copy') {
      copy(text).then(function () {
        status.textContent = 'Ответы скопированы. Вставьте их в сообщение Алексею или Вере.';
      }, function () {
        showAnswersForManualCopy(text);
        status.textContent = 'Не получилось скопировать автоматически. Выделите текст выше и скопируйте его.';
      });
      return;
    }

    var url = via === 'telegram'
      ? 'https://t.me/' + RECIPIENT.telegram + '?text=' + encodeURIComponent(text)
      : 'https://wa.me/' + RECIPIENT.whatsapp + '?text=' + encodeURIComponent(text);
    openMessenger(url);
    status.textContent = 'Открываем мессенджер. Осталось нажать «Отправить» в чате. Если чат не открылся, нажмите «Скопировать ответы».';
  });
})();
