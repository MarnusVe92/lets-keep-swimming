/**
 * Let's Keep Swimming - Charts
 *
 * This module handles Chart.js visualizations for the dashboard.
 * Creates beautiful, responsive charts for training data.
 */

let volumeChart = null;
let progressChart = null;

/**
 * Initialize or update the volume bar chart
 * Shows distance swum over the last 14 days
 */
function updateVolumeChart(sessions) {
  const ctx = document.getElementById('volumeChart');
  if (!ctx) return;

  // Get last 14 days
  const today = new Date();
  const last14Days = [];
  const labels = [];
  const data = [];

  // Create array of last 14 days
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    last14Days.push(dateStr);

    // Format label (e.g., "Mon 28")
    const label = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    labels.push(label);
  }

  // Calculate distance for each day
  last14Days.forEach(dateStr => {
    const daySessions = sessions.filter(s => s.date === dateStr);
    const dayDistance = daySessions.reduce((sum, s) => sum + s.distance_m, 0);
    data.push(dayDistance);
  });

  // Destroy existing chart if it exists
  if (volumeChart) {
    volumeChart.destroy();
  }

  // Create new chart
  volumeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Distance (m)',
        data: data,
        backgroundColor: 'rgba(74, 144, 226, 0.7)',
        borderColor: 'rgba(74, 144, 226, 1)',
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.parsed.y}m`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value + 'm';
            }
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

/**
 * Initialize or update the progress doughnut chart
 * Shows training progress toward event date
 */
function updateProgressChart(profile, sessions) {
  const ctx = document.getElementById('progressChart');
  if (!ctx) return;

  // Calculate days until event
  const today = new Date();
  const eventDate = new Date(profile.eventDate);
  const totalDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

  // Calculate training days in last 14 days
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const recentTrainingDays = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= fourteenDaysAgo && sessionDate <= today;
  }).length;

  // Calculate percentage (out of 14 possible days)
  const trainingPercentage = Math.min(100, Math.round((recentTrainingDays / 14) * 100));

  // Destroy existing chart
  if (progressChart) {
    progressChart.destroy();
  }

  // Create doughnut chart
  progressChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Training Days', 'Rest Days'],
      datasets: [{
        data: [recentTrainingDays, 14 - recentTrainingDays],
        backgroundColor: [
          'rgba(66, 217, 200, 0.8)',
          'rgba(200, 200, 200, 0.3)'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.5,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              return `${label}: ${value} days`;
            }
          }
        }
      }
    },
    plugins: [{
      // Custom plugin to show percentage in center
      id: 'centerText',
      beforeDraw: function(chart) {
        const width = chart.width;
        const height = chart.height;
        const ctx = chart.ctx;

        ctx.restore();
        ctx.font = 'bold 28px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#2C3E50';

        const text = `${trainingPercentage}%`;
        const textX = Math.round((width - ctx.measureText(text).width) / 2);
        const textY = height / 2;

        ctx.fillText(text, textX, textY);

        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#7F8C8D';
        const subtext = 'Active';
        const subtextX = Math.round((width - ctx.measureText(subtext).width) / 2);
        ctx.fillText(subtext, subtextX, textY + 20);

        ctx.save();
      }
    }]
  });
}

/**
 * Initialize all charts
 * Called when dashboard is loaded or data changes
 */
function initCharts(profile, sessions) {
  if (!profile) {
    console.log('No profile yet, skipping charts');
    return;
  }

  updateVolumeChart(sessions);
  updateProgressChart(profile, sessions);
}

// Export functions
window.Charts = {
  initCharts,
  updateVolumeChart,
  updateProgressChart
};
