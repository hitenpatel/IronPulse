import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Fingerprint } from "lucide-react-native";
import {
  isBiometricAvailable,
  isBiometricEnabled,
  enableBiometric,
  getBiometricLabel,
} from "@/lib/biometric";

/** Shows a one-time prompt after login to enable biometric unlock. */
export function BiometricEnrollmentPrompt({ onDismiss }: { onDismiss: () => void }) {
  const [bioLabel, setBioLabel] = useState("Biometric");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    async function check() {
      const available = await isBiometricAvailable();
      const alreadyEnabled = await isBiometricEnabled();
      if (available && !alreadyEnabled) {
        const label = await getBiometricLabel();
        setBioLabel(label);
        setVisible(true);
      }
    }
    check();
  }, []);

  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "hsl(217, 33%, 17%)",
        padding: 20,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Fingerprint size={24} color="hsl(213, 31%, 91%)" />
        <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 16, fontWeight: "600", flex: 1 }}>
          Enable {bioLabel} for quick unlock?
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
        <Pressable
          onPress={async () => {
            await enableBiometric();
            setVisible(false);
            onDismiss();
          }}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: "center",
            backgroundColor: "hsl(210, 40%, 98%)",
          }}
        >
          <Text style={{ fontWeight: "600", color: "hsl(222.2, 47.4%, 11.2%)" }}>
            Enable
          </Text>
        </Pressable>
        <Pressable
          onPress={() => { setVisible(false); onDismiss(); }}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: "center",
            backgroundColor: "hsl(216, 34%, 17%)",
            borderWidth: 1,
            borderColor: "hsl(215, 20%, 65%)",
          }}
        >
          <Text style={{ color: "hsl(215, 20%, 65%)" }}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}
