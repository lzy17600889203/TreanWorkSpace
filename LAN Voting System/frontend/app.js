class VotingApp {
  constructor() {
    this.votingOptionsEl = document.getElementById('voting-options');
    this.resultsListEl = document.getElementById('results-list');
    this.topicEl = document.getElementById('topic');
    this.totalVotesEl = document.getElementById('total-votes');
    this.lastRanking = [];
    this.lastData = null;
    this.isVoting = false;
    
    this.initEventListeners();
    this.loadVotes();
    this.startPolling();
  }

  initEventListeners() {
    document.querySelectorAll('.scenario-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const scenario = e.target.dataset.scenario;
        this.loadScenario(scenario);
      });
    });

    document.getElementById('test-overflow').addEventListener('click', () => {
      this.testOverflow();
    });

    document.getElementById('test-concurrency').addEventListener('click', () => {
      this.testConcurrency();
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
      this.resetVotes();
    });
  }

  async loadVotes() {
    try {
      const response = await fetch('/api/votes');
      const data = await response.json();
      this.renderVotes(data);
    } catch (error) {
      console.error('Failed to load votes:', error);
    }
  }

  async vote(optionId) {
    if (this.isVoting) return;
    this.isVoting = true;
    
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ optionId })
      });
      const data = await response.json();
      this.renderVotes(data);
    } catch (error) {
      console.error('Failed to vote:', error);
    } finally {
      setTimeout(() => {
        this.isVoting = false;
      }, 300);
    }
  }

  async loadScenario(scenario) {
    try {
      const response = await fetch(`/api/scenario/${scenario}`, {
        method: 'POST'
      });
      const data = await response.json();
      this.renderVotes(data);
    } catch (error) {
      console.error('Failed to load scenario:', error);
    }
  }

  async testOverflow() {
    try {
      const response = await fetch('/api/test/overflow', {
        method: 'POST'
      });
      const data = await response.json();
      this.renderVotes(data);
    } catch (error) {
      console.error('Failed to test overflow:', error);
    }
  }

  async testConcurrency() {
    try {
      const response = await fetch('/api/test/concurrency', {
        method: 'POST'
      });
      const data = await response.json();
      this.renderVotes(data);
    } catch (error) {
      console.error('Failed to test concurrency:', error);
    }
  }

  async resetVotes() {
    try {
      const response = await fetch('/api/reset', {
        method: 'POST'
      });
      const data = await response.json();
      this.renderVotes(data);
    } catch (error) {
      console.error('Failed to reset votes:', error);
    }
  }

  startPolling() {
    setInterval(() => {
      this.loadVotes();
    }, 2000);
  }

  renderVotes(data) {
    if (!this.lastData) {
      this.lastData = JSON.parse(JSON.stringify(data));
    }
    
    const hasChanged = JSON.stringify(data.options) !== JSON.stringify(this.lastData.options) || 
                       data.totalVotes !== this.lastData.totalVotes;
    
    if (!hasChanged) {
      return;
    }
    
    this.lastData = JSON.parse(JSON.stringify(data));
    this.topicEl.textContent = data.topic;
    this.animateNumber(this.totalVotesEl, data.totalVotes);
    
    const optionsWithPercentage = data.options.map(opt => {
      let percentage;
      if (data.totalVotes === 0) {
        percentage = 0;
      } else {
        percentage = (opt.votes / data.totalVotes) * 100;
      }
      return { ...opt, percentage };
    });

    const sortedOptions = [...optionsWithPercentage].sort((a, b) => b.votes - a.votes);
    const maxVotes = sortedOptions[0]?.votes || 0;
    
    this.renderVotingOptions(optionsWithPercentage, maxVotes);
    this.renderResults(sortedOptions);

    this.checkConsistency(data);
  }

  renderVotingOptions(options, maxVotes) {
    this.votingOptionsEl.innerHTML = '';

    options.forEach(option => {
      const isWinner = option.votes === maxVotes && maxVotes > 0;
      
      const optionEl = document.createElement('div');
      optionEl.className = 'vote-option';
      
      optionEl.innerHTML = `
        <button class="vote-btn" data-option-id="${option.id}">
          <span class="option-name">${option.name}</span>
        </button>
        <div class="progress-bar-container">
          <div class="progress-bar ${isWinner ? 'winner' : ''}" style="width: ${option.percentage}%"></div>
        </div>
        <div class="option-stats">
          <span class="vote-count">${option.votes} 票</span>
          <span class="percentage" id="percentage-${option.id}">${option.percentage.toFixed(1)}%</span>
        </div>
      `;

      const voteBtn = optionEl.querySelector('.vote-btn');
      voteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        voteBtn.classList.add('clicked');
        this.vote(option.id);
        setTimeout(() => {
          voteBtn.classList.remove('clicked');
        }, 600);
      });

      this.votingOptionsEl.appendChild(optionEl);
    });
  }

  renderResults(sortedOptions) {
    const currentRanking = sortedOptions.map(opt => opt.id);
    const hasRankingChanged = JSON.stringify(currentRanking) !== JSON.stringify(this.lastRanking);
    
    this.resultsListEl.innerHTML = '';

    sortedOptions.forEach((option, index) => {
      const rankClass = index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : 'other';
      
      const resultItem = document.createElement('div');
      resultItem.className = `result-item ${hasRankingChanged ? 'ranking-change' : ''}`;
      
      resultItem.innerHTML = `
        <div class="rank ${rankClass}">${index + 1}</div>
        <div class="result-name">${option.name}</div>
        <div class="result-votes">${option.votes} 票</div>
        <div class="result-percentage">${option.percentage.toFixed(1)}%</div>
      `;

      this.resultsListEl.appendChild(resultItem);
    });

    this.lastRanking = currentRanking;
  }

  animateNumber(element, targetValue) {
    const currentValue = parseInt(element.textContent) || 0;
    const difference = targetValue - currentValue;
    const duration = 500;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(currentValue + difference * easeOutQuart);
      
      element.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  checkConsistency(data) {
    const calculatedTotal = data.options.reduce((sum, opt) => sum + opt.votes, 0);
    const hasConsistencyIssue = calculatedTotal !== data.totalVotes;
    
    const existingWarning = document.querySelector('.error-warning');
    if (existingWarning) {
      existingWarning.remove();
    }

    if (hasConsistencyIssue) {
      const warning = document.createElement('div');
      warning.className = 'error-warning';
      warning.innerHTML = `
        <strong>⚠️ 数据一致性错误：</strong>
        选项票数总和(${calculatedTotal})与总票数(${data.totalVotes})不一致！
      `;
      this.votingOptionsEl.parentNode.appendChild(warning);
    }

    data.options.forEach(opt => {
      if (!Number.isSafeInteger(opt.votes)) {
        const warning = document.createElement('div');
        warning.className = 'error-warning';
        warning.innerHTML = `
          <strong>⚠️ 数值溢出警告：</strong>
          选项 "${opt.name}" 的票数(${opt.votes})超出安全整数范围！
        `;
        this.votingOptionsEl.parentNode.appendChild(warning);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VotingApp();
});