import { useState } from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { Home, BarChart3, Dumbbell, User, Plus } from "lucide-react-native";
import { NewSessionSheet } from "@/components/layout/new-session-sheet";
import { TemplatePicker } from "@/components/workout/template-picker";

export default function TabLayout() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "hsl(224, 71%, 4%)",
            borderTopColor: "hsl(216, 34%, 17%)",
          },
          tabBarActiveTintColor: "hsl(210, 40%, 98%)",
          tabBarInactiveTintColor: "hsl(215, 20%, 65%)",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: "Stats",
            tabBarIcon: ({ color, size }) => (
              <BarChart3 size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="fab"
          options={{
            title: "",
            tabBarIcon: () => (
              <View
                style={{
                  backgroundColor: "hsl(210, 40%, 98%)",
                  borderRadius: 24,
                  width: 48,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: -16,
                }}
              >
                <Plus size={24} color="hsl(222.2, 47.4%, 11.2%)" />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setSheetOpen(true);
            },
          }}
        />
        <Tabs.Screen
          name="exercises"
          options={{
            title: "Exercises",
            tabBarIcon: ({ color, size }) => (
              <Dumbbell size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
      </Tabs>
      <NewSessionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onStartWorkout={() => setTemplatePickerOpen(true)}
      />
      <TemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
      />
    </>
  );
}
