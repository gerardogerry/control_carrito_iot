import { ConnectionState } from '../models/ConnectionState.js';

export class ConnectivityPanel {
  constructor() {
    this.wssEl = document.getElementById('indicator-wss');
    this.awsEl = document.getElementById('indicator-aws');
    this.rdsEl = document.getElementById('indicator-rds');
    this.feedbackEl = document.getElementById('action-feedback');
  }

  init() {
    this.setFeedback('Sistema listo');
  }

  updateWssStatus(status) {
    if (!this.wssEl) return;
    const badge = this.wssEl.querySelector('.status-text');
    if (!badge) return;

    badge.textContent = status;
    if (status === ConnectionState.STATES.ONLINE) {
      badge.className = 'status-text badge bg-success';
    } else if (status === ConnectionState.STATES.CONNECTING) {
      badge.className = 'status-text badge bg-warning text-dark';
    } else {
      badge.className = 'status-text badge bg-danger';
    }
  }

  updateAwsStatus(status) {
    if (!this.awsEl) return;
    const badge = this.awsEl.querySelector('.status-text');
    if (!badge) return;

    badge.textContent = status;
    if (status === ConnectionState.STATES.AVAILABLE) {
      badge.className = 'status-text badge bg-success';
    } else if (status === ConnectionState.STATES.CHECKING) {
      badge.className = 'status-text badge bg-warning text-dark';
    } else {
      badge.className = 'status-text badge bg-danger';
    }
  }

  updateRdsStatus(status) {
    if (!this.rdsEl) return;
    const badge = this.rdsEl.querySelector('.status-text');
    if (!badge) return;

    badge.textContent = status;
    if (status === ConnectionState.STATES.AVAILABLE) {
      badge.className = 'status-text badge bg-success';
    } else if (status === ConnectionState.STATES.UNAVAILABLE) {
      badge.className = 'status-text badge bg-danger';
    } else {
      badge.className = 'status-text badge bg-secondary';
    }
  }

  setFeedback(message) {
    if (this.feedbackEl) {
      this.feedbackEl.textContent = message;
    }
  }
}