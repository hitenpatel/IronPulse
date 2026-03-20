import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { getProducts, purchaseSubscription, restorePurchases, initializeIAP } from "@/lib/iap";
import type { IAPItemDetails } from "expo-in-app-purchases";

const colors = {
  background: "#060B14",
  card: "#0F1629",
  accent: "#1A2340",
  primary: "#0077FF",
  border: "#1E2B47",
  borderSubtle: "#152035",
  text: "#F0F4F8",
  textMuted: "#8899B4",
  textFaint: "#4E6180",
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
            fontFamily: "ClashDisplay",
            fontWeight: "600",
            fontSize: 28,
            color: colors.text,
            marginBottom: 20,
          }}
        >
          Subscription
        </Text>

        {/* Current plan card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: colors.textFaint,
              textTransform: "uppercase",
              fontWeight: "500",
              letterSpacing: 1,
            }}
          >
            Current Plan
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: "700",
              marginTop: 4,
              textTransform: "capitalize",
            }}
          >
            {user?.tier ?? "free"}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : products.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 24,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.textMuted, textAlign: "center" }}>
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
                    backgroundColor: colors.card,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 16,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    opacity: purchasing === product.productId ? 0.6 : 1,
                  }}
                >
                  <View>
                    <Text style={{ color: colors.text, fontWeight: "600", fontSize: 16 }}>
                      {product.title}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>
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
          <Text style={{ color: colors.textMuted, fontSize: 14, textDecorationLine: "underline" }}>
            Restore Purchases
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
