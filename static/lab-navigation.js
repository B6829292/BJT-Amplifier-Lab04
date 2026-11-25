(() => {
  const links = [...document.querySelectorAll('.lab-sidebar .nav-link')];
  const defaultLink = links.find(link => link.hasAttribute('data-default-nav'));
  const results = [...document.querySelectorAll('.result-nav a')];
  const picker = document.querySelector('[data-active-bias]');

  function syncWorkspaceNavigation() {
    const section = links.find(link => link.getAttribute('href') === location.hash);
    links.forEach(link => {
      const current = link === (section || defaultLink);
      link.classList.toggle('active', current);
      if (current) link.setAttribute('aria-current', section ? 'location' : 'page');
      else link.removeAttribute('aria-current');
    });
    const result = results.find(link => link.getAttribute('href') === location.hash) || results[0];
    results.forEach(link => {
      link.classList.toggle('selected', link === result);
      if (link === result) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  picker.addEventListener('change', () => {
    const option = picker.selectedOptions[0];
    const destination = option?.dataset.navigate;
    if (destination) {
      picker.value = picker.dataset.activeBias;
      location.assign(destination);
    } else if (option) {
      picker.dispatchEvent(new CustomEvent('analytical-bias-change', {detail: option.value}));
      syncWorkspaceNavigation();
    }
  });
  window.addEventListener('popstate', syncWorkspaceNavigation);
  window.addEventListener('hashchange', syncWorkspaceNavigation);
  window.addEventListener('pageshow', () => {
    picker.value = picker.dataset.activeBias;
    syncWorkspaceNavigation();
  });
  syncWorkspaceNavigation();
})();
