// IAP module - lazy loaded since expo-in-app-purchases requires
// App Store/Play Store configuration before it can be installed.
// When ready to enable IAP:
// 1. pnpm --filter @ironpulse/mobile add expo-in-app-purchases
// 2. Replace lazy require with direct import

const PRODUCTS = {
  athleteMonthly: "com.ironpulse.athlete.monthly",
  athleteYearly: "com.ironpulse.athlete.yearly",
  coachMonthly: "com.ironpulse.coach.monthly",
  coachYearly: "com.ironpulse.coach.yearly",
};

function getIAP(): any {
  try {
    return require("expo-in-app-purchases");
  } catch {
    console.warn("expo-in-app-purchases not installed — IAP disabled");
    return null;
  }
}

export async function initializeIAP() {
  const iap = getIAP();
  if (!iap) return;
  await iap.connectAsync();
}

export async function getProducts() {
  const iap = getIAP();
  if (!iap) return [];
  const { results } = await iap.getProductsAsync(Object.values(PRODUCTS));
  return results;
}

export async function purchaseSubscription(productId: string) {
  const iap = getIAP();
  if (!iap) return;
  await iap.purchaseItemAsync(productId);
}

export async function restorePurchases() {
  const iap = getIAP();
  if (!iap) return;
  // Listen for purchase updates via iap.setPurchaseListener
}

export { PRODUCTS };
