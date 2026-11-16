export class NavigationTabs {
  constructor(onViewChangeCallback = null) {
    this.onViewChange = onViewChangeCallback;
    this.tabs = {
      control: document.getElementById('tab-control'),
      monitoring: document.getElementById('tab-monitoring'),
      admin: document.getElementById('tab-admin')
    };
    this.views = {
      control: document.getElementById('view-control'),
      monitoring: document.getElementById('view-monitoring'),
      admin: document.getElementById('view-admin')
    };
    this.activeView = 'control';
  }

  init() {
    Object.entries(this.tabs).forEach(([key, btn]) => {
      if (!btn) return;
      btn.addEventListener('click', () => this.switchTo(key));
    });
    this.switchTo('control', false);
  }

  setAdminTabVisible(visible) {
    if (this.tabs.admin) {
      this.tabs.admin.hidden = !visible;
    }
    const nav = document.querySelector('.hud-nav');
    if (nav) {
      nav.style.gridTemplateColumns = visible ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)';
    }
    if (!visible && this.activeView === 'admin') {
      this.switchTo('control', false);
    }
  }

  switchTo(viewName, focusTab = false) {
    const target = this.views[viewName] ? viewName : 'control';
    this.activeView = target;

    Object.entries(this.tabs).forEach(([key, btn]) => {
      if (!btn) return;
      const active = key === target;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    Object.entries(this.views).forEach(([key, view]) => {
      if (!view) return;
      view.hidden = key !== target;
    });

    // Permitir scroll vertical tanto en MONITOREO como en ADMINISTRACIÓN
    const allowScroll = target === 'monitoring' || target === 'admin';
    document.body.classList.toggle('is-monitoring', allowScroll);

    if (focusTab && this.tabs[target]) {
      this.tabs[target].focus();
    }
    if (typeof this.onViewChange === 'function') {
      this.onViewChange(target);
    }
  }
}