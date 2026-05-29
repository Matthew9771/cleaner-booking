const urlParams = new URLSearchParams(window.location.search);
const pageConfig = {
  date: urlParams.get('date') || '',
  address: urlParams.get('address') || '62 Greystead Road, Forest Hill, SE23 3SD',
  duration: urlParams.get('duration') || '3 hours',
  payment: urlParams.get('payment') || '£60',
  currentCode: urlParams.get('currentCode') || '',
  newCode: urlParams.get('newCode') || '',
  cleaner: urlParams.get('cleaner') || 'Primary'
};

const pageType = document.body.dataset.page;
const webhookUrl = document.body.dataset.webhook || '';
const confirmBaseUrl = document.body.dataset.baseUrl || '';
const agathaNumber = document.body.dataset.agatha || '';
const primaryNumber = document.body.dataset.primary || '';
const backupNumber = document.body.dataset.backup || '';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function saveWebhook(params) {
  if (!webhookUrl) return;
  const payload = new URLSearchParams(params).toString();
  fetch(`${webhookUrl}?${payload}`, { mode: 'no-cors', keepalive: true }).catch(() => {});
}

function buildQuery(overrides = {}) {
  const merged = { ...pageConfig, ...overrides };
  return new URLSearchParams(merged).toString();
}

function buildConfirmLink(cleanerType) {
  const query = buildQuery({ currentCode: 'CURRENT_CODE', newCode: 'NEW_CODE', cleaner: cleanerType });
  return `${confirmBaseUrl}?${query}`;
}

function addInputFeedback(input) {
  if (!input) return;
  const syncState = () => {
    input.classList.toggle('has-value', Boolean(input.value.trim()));
    if (input.value.trim()) input.classList.remove('error');
  };

  input.addEventListener('input', syncState);
  syncState();
}

function buildMessage(phone, cleanerType) {
  const dateLabel = formatDate(pageConfig.date) || 'TBC';
  const confirmLink = buildConfirmLink(cleanerType);
  return `Hi 👋 Agatha Living here — we have a cleaning job available, can you take it?

🏠 Property: ${pageConfig.address}
📅 Date: ${dateLabel}
⏰ Guest checks out: 11:00am — you can arrive from this time
⏰ Guest checks in: 3:00pm — property must be ready by this time
⏱ Duration: ${pageConfig.duration}
💷 Payment: ${pageConfig.payment}

Please tap the link below to confirm or decline the job:
${confirmLink}

Thank you! 🙏 — Agatha Living`;
}

function sendWhatsApp(phone, text) {
  if (!phone) return;
  const encoded = encodeURIComponent(text);
  window.location.href = `https://wa.me/${phone}?text=${encoded}`;
}

function showSuccess(message) {
  document.getElementById('mainCard')?.style.setProperty('display', 'none');
  const success = document.getElementById('successContent');
  if (!success) return;
  success.innerHTML = message;
  document.getElementById('successCard')?.style.setProperty('display', 'block');
}

function initBookingPage() {
  setText('detailAddress', pageConfig.address);
  setText('detailDate', formatDate(pageConfig.date));
  setText('detailDuration', pageConfig.duration);
  setText('detailPayment', pageConfig.payment);

  const currentInput = document.getElementById('currentCode');
  const newInput = document.getElementById('newCode');
  addInputFeedback(currentInput);
  addInputFeedback(newInput);

  const buttonContainer = document.getElementById('actionButtons');
  if (!buttonContainer) return;

  buttonContainer.innerHTML = `
    <div class="action-grid">
      <button class="btn btn-primary" type="button" data-cleaner="Primary">📲 Send to Primary</button>
      <button class="btn btn-secondary" type="button" data-cleaner="Backup">📲 Send to Backup</button>
    </div>
  `;

  buttonContainer.querySelectorAll('button[data-cleaner]').forEach(button => {
    button.addEventListener('click', () => {
      const currentCode = currentInput?.value.trim() || '';
      const newCode = newInput?.value.trim() || '';
      const cleanerType = button.dataset.cleaner || 'Primary';
      let valid = true;

      if (!currentCode) {
        currentInput?.classList.add('error');
        valid = false;
      } else {
        currentInput?.classList.remove('error');
      }

      if (!newCode) {
        newInput?.classList.add('error');
        valid = false;
      } else {
        newInput?.classList.remove('error');
      }

      if (!valid) return;

      saveWebhook({
        action: 'save_codes',
        response: 'pending',
        date: pageConfig.date,
        address: pageConfig.address,
        duration: pageConfig.duration,
        payment: pageConfig.payment,
        currentCode,
        newCode,
        cleaner: cleanerType
      });

      const confirmLink = `${confirmBaseUrl}?${buildQuery({ currentCode, newCode, cleaner: cleanerType })}`;
      const dateLabel = formatDate(pageConfig.date) || 'TBC';
      const whatsappMessage = `Hi 👋 Agatha Living here — we have a cleaning job available, can you take it?\n\n🏠 Property: ${pageConfig.address}\n📅 Date: ${dateLabel}\n⏰ Guest checks out: 11:00am — you can arrive from this time\n⏰ Guest checks in: 3:00pm — property must be ready by this time\n⏱ Duration: ${pageConfig.duration}\n💷 Payment: ${pageConfig.payment}\n\n🔒 Guest lockbox — action required:\nCurrent code: ${currentCode}\nPlease change it to: ${newCode}\n⚠️ Must be updated before you leave.\n\n📸 Photo evidence required:\nPlease send photos of every room before and after the clean.\n\nPlease tap the link below to confirm or decline the job:\n${confirmLink}\n\nThank you! 🙏 — Agatha Living`;

      sendWhatsApp(cleanerType === 'Primary' ? primaryNumber : backupNumber, whatsappMessage);

      showSuccess(`
        <span class="success-icon">📲</span>
        <h2>WhatsApp Opened!</h2>
        <p>Send the message to your ${cleanerType.toLowerCase()} cleaner. They&apos;ll receive a link to confirm or decline the job.</p>
      `);
    });
  });
}

function initOfferPage() {
  setText('detailAddress', pageConfig.address);
  setText('detailDate', formatDate(pageConfig.date));
  setText('detailDuration', pageConfig.duration);
  setText('detailPayment', pageConfig.payment);
  setText('detailCurrentCode', pageConfig.currentCode || '—');
  setText('detailNewCode', pageConfig.newCode || '—');

  document.querySelectorAll('button[data-answer]').forEach(button => {
    button.addEventListener('click', () => handleOfferResponse(button.dataset.answer));
  });
}

function initConfirmPage() {
  setText('detailAddress', pageConfig.address);
  setText('detailDate', formatDate(pageConfig.date));
  setText('detailDuration', pageConfig.duration);
  setText('detailPayment', pageConfig.payment);
  setText('detailCurrentCode', pageConfig.currentCode || '—');
  setText('detailNewCode', pageConfig.newCode || '—');

  document.querySelectorAll('button[data-answer]').forEach(button => {
    button.addEventListener('click', () => handleConfirmResponse(button.dataset.answer));
  });
}

function handleOfferResponse(answer) {
  document.querySelectorAll('button[data-answer]').forEach(button => (button.disabled = true));
  saveWebhook({
    response: answer,
    date: pageConfig.date,
    address: pageConfig.address,
    duration: pageConfig.duration,
    payment: pageConfig.payment,
    currentCode: pageConfig.currentCode,
    newCode: pageConfig.newCode,
    cleaner: pageConfig.cleaner
  });

  document.getElementById('mainContent').style.display = 'none';
  const result = document.getElementById('resultContent');
  if (!result) return;
  result.classList.add('show');

  if (answer === 'yes') {
    const dateLabel = formatDate(pageConfig.date) || 'TBC';
    const message = encodeURIComponent(`Hi Agatha Living 👋\n\nI'd like to confirm I'm taking the cleaning job!\n\n🏠 Property: ${pageConfig.address}\n📅 Date: ${dateLabel}\n⏰ Arriving from: 11:00am\n\nSee you then! 🙌`);
    result.innerHTML = `
      <span class="result-icon">🙌</span>
      <h2>Amazing, thank you!</h2>
      <p>You&apos;re confirmed for the cleaning job at <strong>${pageConfig.address}</strong>.<br><br>
      Arrive from <strong>11:00am</strong> and have the property ready by <strong>3:00pm</strong>.<br><br>
      Remember to update the guest lockbox to <strong>${pageConfig.newCode || 'the new code'}</strong> before you leave.<br><br>
      Please tap below to send your confirmation:</p>
      <a class="wa-btn" href="https://wa.me/${agathaNumber}?text=${message}">📲 Send Confirmation to Agatha Living</a>
    `;
  } else {
    result.innerHTML = `
      <span class="result-icon">😔</span>
      <h2>No problem, thanks for letting us know!</h2>
      <p>We&apos;re sorry you can&apos;t make it. We&apos;ll arrange cover as soon as possible.<br><br>
      Speak soon — and thank you for the update.</p>
    `;
  }
}

function handleConfirmResponse(answer) {
  document.querySelectorAll('button[data-answer]').forEach(button => (button.disabled = true));
  saveWebhook({
    response: answer,
    date: pageConfig.date,
    address: pageConfig.address,
    duration: pageConfig.duration,
    payment: pageConfig.payment,
    currentCode: pageConfig.currentCode,
    newCode: pageConfig.newCode
  });

  document.getElementById('mainContent').style.display = 'none';
  const result = document.getElementById('resultContent');
  if (!result) return;
  result.classList.add('show');

  if (answer === 'yes') {
    const confirmMsg = encodeURIComponent(`Hi Matthew 👋 Confirmed for today's clean!\n\n🏠 Property: ${pageConfig.address}\n⏰ Arriving from: 11:00am\n✅ See you soon! 🙌`);
    result.innerHTML = `
      <span class="result-icon">🙌</span>
      <h2>Thank you for confirming!</h2>
      <p>You&apos;re all set for today&apos;s clean at <strong>${pageConfig.address}</strong>.<br><br>
      Arrive from <strong>11:00am</strong> and have the property ready by <strong>3:00pm</strong>.<br><br>
      Please tap below to send your confirmation:</p>
      <a class="wa-btn" href="https://wa.me/${agathaNumber}?text=${confirmMsg}">📲 Send Confirmation to Agatha Living</a>
    `;
  } else {
    result.innerHTML = `
      <span class="result-icon">😔</span>
      <h2>No problem, thanks for letting us know</h2>
      <p>We&apos;re sorry you can&apos;t make it today. We&apos;ll arrange cover as soon as possible.<br><br>
      Speak soon — thank you again.</p>
    `;
  }
}

function runPage() {
  if (pageType === 'booking') initBookingPage();
  if (pageType === 'offer') initOfferPage();
  if (pageType === 'confirm') initConfirmPage();
}

runPage();
