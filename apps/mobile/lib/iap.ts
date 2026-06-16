// IAP module - lazy loaded. When ready to enable IAP:
// 1. pnpm --filter @mettlelift/mobile add react-native-iap
// 2. Replace lazy require with direct import

const PRODUCTS = {
  athleteMonthly: "com.mettlelift.athlete.monthly",
  athleteYearly: "com.mettlelift.athlete.yearly",
  coachMonthly: "com.mettlelift.coach.monthly",
  coachYearly: "com.mettlelift.coach.yearly",
};

function getIAP(): any {
  try {
    return require("react-native-iap");
  } catch {
    console.warn("react-native-iap not installed — IAP disabled");
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
