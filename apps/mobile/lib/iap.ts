import * as InAppPurchases from "expo-in-app-purchases";

const PRODUCTS = {
  athleteMonthly: "com.ironpulse.athlete.monthly",
  athleteYearly: "com.ironpulse.athlete.yearly",
  coachMonthly: "com.ironpulse.coach.monthly",
  coachYearly: "com.ironpulse.coach.yearly",
};

export async function initializeIAP() {
  await InAppPurchases.connectAsync();
}

export async function getProducts() {
  const { results } = await InAppPurchases.getProductsAsync(
    Object.values(PRODUCTS),
  );
  return results;
}

export async function purchaseSubscription(productId: string) {
  await InAppPurchases.purchaseItemAsync(productId);
}

export async function restorePurchases() {
  // Listen for purchase updates via InAppPurchases.setPurchaseListener
}

export { PRODUCTS };
