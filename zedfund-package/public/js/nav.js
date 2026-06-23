// ---------- Navbar + Footer, rendered into every page ----------

function renderNavbar(activePage) {
  const root = document.getElementById('navbar-root');
  if (!root) return;
  const user = getUser();

  const links = [
    { href: 'discover.html', label: 'Discover', key: 'discover' },
    { href: 'how-it-works.html', label: 'How it Works', key: 'how' },
    { href: 'impact.html', label: 'Impact', key: 'impact' }
  ];

  const linksHtml = links
    .map((l) => `<a href="${l.href}" class="${activePage === l.key ? 'active' : ''}">${l.label}</a>`)
    .join('');

  const rightHtml = user
    ? `
      <a href="dashboard.html" class="icon-btn" title="Notifications">🔔</a>
      <a href="${user.role === 'admin' ? 'admin.html' : 'dashboard.html'}" class="avatar" title="${escapeHtml(user.name)}">${initials(user.name)}</a>
      <button class="btn btn-ghost btn-sm" id="nav-logout-btn">Log out</button>
    `
    : `
      <a href="login.html" class="btn btn-ghost btn-sm">Log in</a>
      <a href="create-campaign.html" class="btn btn-primary btn-sm">Start Fundraising</a>
    `;

  root.innerHTML = `
    <nav class="navbar">
      <div class="navbar-inner">
        <a href="index.html" class="logo"><img src="images/logo.png" alt="ZedFund logo">ZedFund</a>
        <div class="navbar-search">
          <span>🔍</span>
          <input type="text" id="nav-search-input" placeholder="Search campaigns, causes, or regions...">
        </div>
        <div class="nav-links">${linksHtml}</div>
        <div class="navbar-actions">${rightHtml}</div>
      </div>
    </nav>
  `;

  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearAuth();
      window.location.href = 'index.html';
    });
  }

  const searchInput = document.getElementById('nav-search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && searchInput.value.trim()) {
        window.location.href = `discover.html?search=${encodeURIComponent(searchInput.value.trim())}`;
      }
    });
  }
}

function renderFooter() {
  const root = document.getElementById('footer-root');
  if (!root) return;
  root.innerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-col">
            <a href="index.html" class="logo" style="margin-bottom:12px;"><img src="images/logo.png" alt="ZedFund logo">ZedFund</a>
            <p>Empowering the Zambian spirit of community through modern financial technology and radical transparency.</p>
          </div>
          <div class="footer-col">
            <h4>Company</h4>
            <a href="how-it-works.html">How it works</a>
            <a href="impact.html">Impact Report</a>
            <a href="#">Careers</a>
            <a href="#">Blog</a>
          </div>
          <div class="footer-col">
            <h4>Resources</h4>
            <a href="#">Help Center</a>
            <a href="#">Safety Tips</a>
            <a href="#">Fees</a>
            <a href="#">Legal Documents</a>
          </div>
          <div class="footer-col">
            <h4>Newsletter</h4>
            <p>Stay updated with the latest community success stories.</p>
          </div>
        </div>
        <div class="footer-bottom">
          <span>&copy; 2026 ZedFund Zambia. Regulated by SEC Zambia.</span>
          <span><a href="#">Privacy Policy</a> &nbsp;&middot;&nbsp; <a href="#">Terms of Service</a></span>
        </div>
      </div>
    </footer>
  `;
}

// Guard: redirect to login if not authenticated
function requireLoginOrRedirect() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}
