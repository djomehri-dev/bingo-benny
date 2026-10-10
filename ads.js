// Ad adapter. The game only calls Ads.init(), Ads.showRewarded() and
// Ads.maybeInterstitial(), so swapping the placeholder for a real SDK
// (Poki, CrazyGames, AdMob via Capacitor, ...) only touches this file.
window.Ads = (() => {
  'use strict';

  // Frequency caps: too many interstitials kills retention, and retention is revenue.
  const INTERSTITIAL_EVERY_ROUNDS = 2;
  const INTERSTITIAL_MIN_GAP_MS = 90_000;

  let roundsSinceInterstitial = 0;
  let lastInterstitialAt = 0;

  const $ = id => document.getElementById(id);

  // Placeholder ad: a countdown overlay. Resolves true if watched to the end.
  function placeholderAd(label, seconds, skippable) {
    return new Promise(resolve => {
      const overlay = $('ad-overlay');
      const count = $('ad-count');
      const skip = $('ad-skip');
      let left = seconds;

      $('ad-label').textContent = label;
      count.textContent = left;
      skip.classList.toggle('hidden', !skippable);
      overlay.classList.remove('hidden');

      const finish = watched => {
        clearInterval(tick);
        skip.onclick = null;
        overlay.classList.add('hidden');
        resolve(watched);
      };
      const tick = setInterval(() => {
        left -= 1;
        count.textContent = left;
        if (left <= 0) finish(true);
      }, 1000);
      skip.onclick = () => finish(false);
    });
  }

  return {
    init() {
      return Promise.resolve();
    },

    // Rewarded video: player opts in for a bonus. Resolves true only if completed.
    showRewarded() {
      return placeholderAd('Rewarded ad', 5, true);
    },

    // Interstitial between rounds, respecting the caps above.
    async maybeInterstitial() {
      roundsSinceInterstitial += 1;
      if (roundsSinceInterstitial < INTERSTITIAL_EVERY_ROUNDS) return;
      if (Date.now() - lastInterstitialAt < INTERSTITIAL_MIN_GAP_MS) return;
      roundsSinceInterstitial = 0;
      lastInterstitialAt = Date.now();
      await placeholderAd('Ad break', 3, false);
    },
  };
})();
