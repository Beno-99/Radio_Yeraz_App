import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarStyle: {
          position: "absolute",
          height: 80,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: "#1b2746",
          borderTopWidth: 0,
          elevation: 0,
        },

        tabBarActiveTintColor: "#ff4d6d",
        tabBarInactiveTintColor: "#9ca3af",
      }}
    >
      <Tabs.Screen
        name="stream/index"
        options={{
          title: "Stream",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="posts/index"
        options={{
          title: "Posts",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="about/index"
        options={{
          title: "About Us",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="information-circle" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="contact/index"
        options={{
          title: "Contact Us",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
