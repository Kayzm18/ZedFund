// ---------- Shared Mobile Money donation modal ----------
// Usage: openDonationModal({ id, title, goal, raised }, (newRaised, amount) => { ... })

const MOMO_PROVIDERS = {
  mtn: { name: 'MTN Mobile Money', short: 'MTN', class: 'momo-mtn', initial: 'M' },
  airtel: { name: 'Airtel Money', short: 'Airtel', class: 'momo-airtel', initial: 'A' },
  zamtel: { name: 'Zamtel Kwacha', short: 'Zamtel', class: 'momo-zamtel', initial: 'Z' }
};

function openDonationModal(campaign, onSuccess) {
  let state = { amount: 100, provider: 'mtn', phone: '', name: getUser() ? getUser().name : '', anonymous: false };

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  document.body.appendChild(overlay);

  function close() { overlay.remove(); }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  function renderAmountStep() {
    overlay.innerHTML = `
      <div class="modal card">
        <div class="modal-header">
          <span class="headline-md">Donate to this cause</span>
          <button class="modal-close" id="zf-close">&times;</button>
        </div>
        <p class="body-md text-muted" style="margin-bottom:16px;">${escapeHtml(campaign.title)}</p>

        <div class="field">
          <label>Amount (ZMW)</label>
          <input type="number" id="zf-amount" min="5" value="${state.amount}" placeholder="Enter amount">
        </div>
        <div class="amount-quick-select">
          ${[50, 100, 250, 500].map((a) => `<button class="amount-quick-btn ${state.amount === a ? 'selected' : ''}" data-amt="${a}">K${a}</button>`).join('')}
        </div>

        <div class="field">
          <label>Your name (optional)</label>
          <input type="text" id="zf-name" value="${escapeHtml(state.name)}" placeholder="e.g. Mwansa K.">
        </div>
        <div class="checkbox-row">
          <input type="checkbox" id="zf-anon" ${state.anonymous ? 'checked' : ''}>
          <label for="zf-anon" style="margin:0;">Donate anonymously</label>
        </div>

        <button class="btn btn-action btn-block" id="zf-next" style="margin-top:8px;">Continue</button>
      </div>
    `;
    overlay.querySelector('#zf-close').onclick = close;
    overlay.querySelectorAll('.amount-quick-btn').forEach((btn) => {
      btn.onclick = () => { state.amount = Number(btn.dataset.amt); renderAmountStep(); };
    });
    overlay.querySelector('#zf-next').onclick = () => {
      const amtInput = overlay.querySelector('#zf-amount');
      const amt = Number(amtInput.value);
      if (!amt || amt < 5) { amtInput.focus(); return; }
      state.amount = amt;
      state.name = overlay.querySelector('#zf-name').value.trim() || 'A generous donor';
      state.anonymous = overlay.querySelector('#zf-anon').checked;
      renderPaymentStep();
    };
  }

  function renderPaymentStep() {
    overlay.innerHTML = `
      <div class="modal card">
        <div class="modal-header">
          <span class="headline-md">Choose payment method</span>
          <button class="modal-close" id="zf-close">&times;</button>
        </div>
        <p class="body-md text-muted" style="margin-bottom:16px;">Donating <strong>${money(state.amount)}</strong> via Mobile Money</p>

        <div class="momo-chip-group" style="margin-bottom:18px;">
          ${Object.entries(MOMO_PROVIDERS).map(([key, p]) => `
            <button class="momo-chip ${p.class} ${state.provider === key ? 'selected' : ''}" data-provider="${key}">
              <span class="momo-chip-icon">${p.initial}</span>
              <span class="momo-chip-check">&check;</span>
              ${p.short}
            </button>
          `).join('')}
        </div>

        <div class="field">
          <label>Mobile number</label>
          <input type="tel" id="zf-phone" placeholder="0977 123 456" value="${escapeHtml(state.phone)}">
          <span class="field-hint">We'll send a payment request straight to this number.</span>
        </div>
        <div id="zf-error"></div>

        <div class="flex gap-sm" style="margin-top:8px;">
          <button class="btn btn-ghost btn-block" id="zf-back">Back</button>
          <button class="btn btn-action btn-block" id="zf-pay">Send Request</button>
        </div>
      </div>
    `;
    overlay.querySelector('#zf-close').onclick = close;
    overlay.querySelector('#zf-back').onclick = renderAmountStep;
    overlay.querySelectorAll('.momo-chip').forEach((chip) => {
      chip.onclick = () => { state.provider = chip.dataset.provider; renderPaymentStep(); };
    });
    overlay.querySelector('#zf-pay').onclick = async () => {
      const phoneInput = overlay.querySelector('#zf-phone');
      const errorBox = overlay.querySelector('#zf-error');
      const phone = phoneInput.value.replace(/\s+/g, '');
      if (!/^0[79]\d{8}$/.test(phone)) {
        errorBox.innerHTML = `<div class="alert alert-error">Enter a valid Zambian number, e.g. 0977123456.</div>`;
        return;
      }
      state.phone = phone;
      const payBtn = overlay.querySelector('#zf-pay');
      payBtn.disabled = true;
      payBtn.innerHTML = `<span class="spinner"></span>`;
      try {
        const res = await api('/donations/initiate', {
          method: 'POST',
          body: {
            campaignId: campaign.id,
            amount: state.amount,
            provider: state.provider,
            phone: state.phone,
            donorName: state.name,
            anonymous: state.anonymous
          }
        });
        renderPendingStep(res.donationId, res.message);
      } catch (err) {
        errorBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
        payBtn.disabled = false;
        payBtn.innerHTML = 'Send Request';
      }
    };
  }

  function renderPendingStep(donationId, message) {
    overlay.innerHTML = `
      <div class="modal card" style="text-align:center;">
        <div class="payment-status-icon pending"><span class="spinner"></span></div>
        <p class="headline-md" style="margin-bottom:8px;">Check your phone</p>
        <p class="body-md text-muted">${escapeHtml(message)}</p>
        <p class="label-sm text-muted" style="margin-top:18px;">Waiting for approval&hellip;</p>
      </div>
    `;
    // Simulate the wait for the user to approve a USSD/STK push on their phone
    setTimeout(async () => {
      try {
        const res = await api(`/donations/${donationId}/confirm`, { method: 'POST' });
        if (res.donation.status === 'success') {
          renderSuccessStep(res.donation);
        } else {
          renderFailedStep();
        }
      } catch (err) {
        renderFailedStep();
      }
    }, 2200);
  }

  function renderSuccessStep(donation) {
    overlay.innerHTML = `
      <div class="modal card" style="text-align:center;">
        <div class="payment-status-icon success">&#10003;</div>
        <p class="headline-md" style="margin-bottom:8px;">Thank you!</p>
        <p class="body-md text-muted">Your donation of <strong>${money(donation.amount)}</strong> via ${MOMO_PROVIDERS[donation.provider].name} was successful.</p>
        <button class="btn btn-primary btn-block" id="zf-done" style="margin-top:20px;">Done</button>
      </div>
    `;
    overlay.querySelector('#zf-done').onclick = () => {
      close();
      if (onSuccess) onSuccess(donation.amount, donation);
    };
  }

  function renderFailedStep() {
    overlay.innerHTML = `
      <div class="modal card" style="text-align:center;">
        <div class="payment-status-icon failed">&#10005;</div>
        <p class="headline-md" style="margin-bottom:8px;">Payment declined</p>
        <p class="body-md text-muted">The request wasn't approved in time, or your PIN entry failed. No money was deducted.</p>
        <div class="flex gap-sm" style="margin-top:20px;">
          <button class="btn btn-ghost btn-block" id="zf-cancel">Cancel</button>
          <button class="btn btn-action btn-block" id="zf-retry">Try Again</button>
        </div>
      </div>
    `;
    overlay.querySelector('#zf-cancel').onclick = close;
    overlay.querySelector('#zf-retry').onclick = renderPaymentStep;
  }

  renderAmountStep();
}
