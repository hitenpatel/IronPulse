import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { getProducts, purchaseSubscription, restorePurchases, initializeIAP } from "@/lib/iap";
import type { IAPItemDetails } from "expo-in-app-purchases";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  accent: "hsl(216, 34%, 17%)",
  muted: "hsl(223, 47%, 11%)",
};

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const [products, setProducts] = useState<IAPItemDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        await initializeIAP();
        const items = await getProducts();
        setProducts(items ?? []);
      } catch {
        // IAP not available (e.g. simulator)
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handlePurchase = async (productId: string) => {
    try {
      setPurchasing(productId);
      await purchaseSubscription(productId);
      Alert.alert("Success", "Subscription activated!");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Purchase failed. Please try again.");
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      Alert.alert("Restored", "Your purchases have been restored.");
    } catch {
      Alert.alert("Error", "Could not restore purchases.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: colors.foreground,
            marginBottom: 8,
          }}
        >
          Subscription
        </Text>

        <View
          style={{
            backgroundColor: colors.muted,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.accent,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <Text style={{ color: colors.mutedFg, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
            Current Plan
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700", marginTop: 4, textTransform: "capitalize" }}>
            {user?.tier ?? "free"}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : products.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.muted,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.accent,
              padding: 24,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.mutedFg, textAlign: "center" }}>
              In-app purchases are not available on this device. Subscriptions can be managed on the web.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {products.map((product) => (
              <Pressable
                key={product.productId}
                onPress={() => handlePurchase(product.productId)}
                disabled={purchasing !== null}
              >
                <View
                  style={{
                    backgroundColor: colors.muted,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.accent,
                    padding: 16,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    opacity: purchasing === product.productId ? 0.6 : 1,
                  }}
                >
                  <View>
                    <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 16 }}>
                      {product.title}
                    </Text>
                    <Text style={{ color: colors.mutedFg, fontSize: 13, marginTop: 2 }}>
                      {product.description}
                    </Text>
                  </View>
                  <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 16 }}>
                    {product.price}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <Pressable onPress={handleRestore} style={{ marginTop: 24, alignItems: "center" }}>
          <Text style={{ color: colors.mutedFg, fontSize: 14, textDecorationLine: "underline" }}>
            Restore Purchases
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
