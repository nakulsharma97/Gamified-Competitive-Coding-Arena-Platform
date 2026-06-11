export function navigateTo(pathname: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.location.pathname === pathname) {
    return;
  }

  window.history.pushState({}, '', pathname);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
