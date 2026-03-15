import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "hsl(224, 71%, 4%)" }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "hsl(213, 31%, 91%)",
            marginBottom: 24,
          }}
        >
          Profile
        </Text>

        <Card style={{ gap: 16, marginBottom: 24 }}>
          <View>
            <Text
              style={{
                fontSize: 10,
                color: "hsl(215, 20%, 65%)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Name
            </Text>
            <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 18 }}>
              {user?.name}
            </Text>
          </View>
          <View>
            <Text
              style={{
                fontSize: 10,
                color: "hsl(215, 20%, 65%)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Email
            </Text>
            <Text style={{ color: "hsl(213, 31%, 91%)" }}>{user?.email}</Text>
          </View>
          <View>
            <Text
              style={{
                fontSize: 10,
                color: "hsl(215, 20%, 65%)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Units
            </Text>
            <Text
              style={{
                color: "hsl(213, 31%, 91%)",
                textTransform: "capitalize",
              }}
            >
              {user?.unitSystem}
            </Text>
          </View>
        </Card>

        <Button variant="outline" onPress={signOut}>
          Sign Out
        </Button>
      </View>
    </SafeAreaView>
  );
}
