document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const rawUserId = urlParams.get('user_id');
  const userIdParam = rawUserId ? rawUserId.trim() : null;
  const userId = userIdParam || 'Nameless';
  const storageKey = `diary_${userId}`;

  const userTitle = document.getElementById('user-title');
  const backLink = document.getElementById('back-link');
  const totalEntriesEl = document.getElementById('total-entries');
  const daysActiveEl = document.getElementById('days-active');
  const avgEntriesEl = document.getElementById('avg-entries');

  // Update back link with user_id
  backLink.href = `index.html${window.location.search}`;

  const baseTitle = userIdParam ? `${userIdParam}'s Stats` : 'My Stats';
  userTitle.textContent = baseTitle;

  // Load entries
  let diaryData = { entries: [] };
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    try {
      diaryData = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse storage', e);
    }
  }

  const entries = diaryData.entries || [];
  if (entries.length === 0) {
    // Show empty state if needed
    totalEntriesEl.textContent = '0';
    daysActiveEl.textContent = '0';
    avgEntriesEl.textContent = '0';
    return;
  }

  // Sort entries by timestamp
  entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Group by day and calculate cumulative total
  const dayCounts = {};
  entries.forEach(entry => {
    const date = new Date(entry.timestamp);
    const dayStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    dayCounts[dayStr] = (dayCounts[dayStr] || 0) + 1;
  });

  const sortedDays = Object.keys(dayCounts).sort();

  // Fill in gaps between first entry and today
  const firstDay = new Date(sortedDays[0]);
  const lastDay = new Date(); // include today
  const labels = [];
  const counts = [];
  let cumulative = 0;

  let tempDate = new Date(firstDay);
  // Ensure we reset time part to compare correctly
  tempDate.setHours(0, 0, 0, 0);
  const end = new Date(lastDay);
  end.setHours(0, 0, 0, 0);

  while (tempDate <= end) {
    const dayStr = tempDate.toISOString().split('T')[0];
    cumulative += (dayCounts[dayStr] || 0);

    // Format label for display
    const displayLabel = tempDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });

    labels.push(displayLabel);
    counts.push(cumulative);

    tempDate.setDate(tempDate.getDate() + 1);
  }

  // Update mini cards
  totalEntriesEl.textContent = entries.length;
  daysActiveEl.textContent = sortedDays.length;
  avgEntriesEl.textContent = (entries.length / sortedDays.length).toFixed(1);

  const ctx = document.getElementById('statsChart').getContext('2d');

  // Create gradient for the line
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(14, 165, 233, 0.2)');
  gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Cumulative Entries',
        data: counts,
        borderColor: '#0ea5e9',
        borderWidth: 4,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#0ea5e9',
        pointBorderWidth: 2,
        pointRadius: (context) => {
          // Only show points for actual entry days or if it's the last day
          const index = context.dataIndex;
          // We need to check if the label at this index corresponds to a day with entries
          // Actually, let's just show points every few days if there are many, or all if few.
          return labels.length > 30 ? 0 : 4;
        },
        pointHoverRadius: 6,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4 // Smooth curve
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { family: 'Outfit', size: 14 },
          bodyFont: { family: 'Inter', size: 13 },
          padding: 12,
          cornerRadius: 8,
          displayColors: false
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: { family: 'Inter', size: 11 },
            color: '#64748b',
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 10
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(226, 232, 240, 0.6)',
            borderDash: [5, 5]
          },
          ticks: {
            stepSize: 1,
            font: { family: 'Inter', size: 11 },
            color: '#64748b',
            padding: 10
          }
        }
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.location.href = `index.html${window.location.search}`;
    }
  });
});
