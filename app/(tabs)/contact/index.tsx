import PageHeader from "@/components/PageHeader";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const CONTACT_EMAIL = "radioyerazsupport@gmail.com";

export default function ContactScreen() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const buttonScale = useRef(new Animated.Value(1)).current;

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSend = async () => {
    if (!name.trim() || !message.trim()) {
      Alert.alert("Missing Fields", "Please fill in your name and message.");
      return;
    }

    animateButton();
    setSending(true);

    const cleanName = name.trim();
    const cleanLocation = location.trim();
    const cleanMessage = message.trim();

    const subject = `Contact from ${cleanName}`;
    const body = `Name: ${cleanName}${
      cleanLocation ? `\nLocation: ${cleanLocation}` : ""
    }\n\nMessage:\n${cleanMessage}`;

    const url = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    try {
      await Linking.openURL(url);
      setName("");
      setLocation("");
      setMessage("");
    } catch {
      Alert.alert(
        "Unable to Open Email",
        "No email app was found, or your device could not open the email composer.",
      );
    } finally {
      setSending(false);
    }
  };

  const handleOpenEmail = async () => {
    try {
      await Linking.openURL(`mailto:${CONTACT_EMAIL}`);
    } catch {
      Alert.alert(
        "Unable to Open Email",
        "No email app was found on this device.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={["#0a0e1a", "#0f172a", "#0a0e1a"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <View style={styles.headerContainer}>
        <PageHeader />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerSection}>
          <View style={styles.iconWrapper}>
            <Ionicons name="mail" size={28} color="#e94560" />
          </View>
          <Text style={styles.title}>Contact Us</Text>
          <Text style={styles.subtitle}>We'd love to hear from you</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Full Name *</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === "name" && styles.inputWrapperFocused,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={focusedField === "name" ? "#e94560" : "#4b5563"}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Enter your name"
                placeholderTextColor="#4b5563"
                style={styles.inputText}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Location</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === "location" && styles.inputWrapperFocused,
              ]}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color={focusedField === "location" ? "#e94560" : "#4b5563"}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Your city or country"
                placeholderTextColor="#4b5563"
                style={styles.inputText}
                value={location}
                onChangeText={setLocation}
                onFocus={() => setFocusedField("location")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Message *</Text>
            <View
              style={[
                styles.inputWrapper,
                styles.textAreaWrapper,
                focusedField === "message" && styles.inputWrapperFocused,
              ]}
            >
              <Ionicons
                name="chatbubble-outline"
                size={18}
                color={focusedField === "message" ? "#e94560" : "#4b5563"}
                style={[
                  styles.inputIcon,
                  { alignSelf: "flex-start", marginTop: 14 },
                ]}
              />
              <TextInput
                placeholder="Write your message here..."
                placeholderTextColor="#4b5563"
                style={[styles.inputText, styles.textArea]}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                onFocus={() => setFocusedField("message")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.button, sending && styles.buttonDisabled]}
              onPress={handleSend}
              disabled={sending}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#e94560", "#c0392b"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Ionicons
                  name={sending ? "hourglass-outline" : "send"}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.buttonText}>
                  {sending ? "Opening..." : "Send Message Via Gmail"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Get in Touch</Text>

          <TouchableOpacity style={styles.infoRow} onPress={handleOpenEmail}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="mail" size={16} color="#e94560" />
            </View>
            <Text style={styles.infoText}>{CONTACT_EMAIL}</Text>
          </TouchableOpacity>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="location" size={16} color="#e94560" />
            </View>
            <Text style={styles.infoText}>Syria</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="radio" size={16} color="#e94560" />
            </View>
            <Text style={styles.infoText}>
              Radio Yeraz • Armenian Music 24/7
            </Text>
          </View>
        </View>

        <Text style={styles.footerBrand}>
          © {new Date().getFullYear()} Radio Yeraz. All rights reserved.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 115,
    paddingBottom: 40,
  },
  decorCircle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(233,69,96,0.06)",
    top: -80,
    right: -80,
  },
  decorCircle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(233,69,96,0.04)",
    bottom: 100,
    left: -60,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(233,69,96,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(233,69,96,0.2)",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    marginBottom: 24,
  },
  fieldWrapper: { marginBottom: 16 },
  label: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  inputWrapperFocused: {
    borderColor: "rgba(233,69,96,0.5)",
    backgroundColor: "rgba(233,69,96,0.04)",
  },
  inputIcon: { marginLeft: 14, marginRight: 4 },
  inputText: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    paddingVertical: 14,
    paddingRight: 14,
  },
  textAreaWrapper: { alignItems: "flex-start" },
  textArea: { height: 120, paddingTop: 14 },
  button: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  infoSection: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 24,
  },
  infoTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  infoIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(233,69,96,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    color: "#94a3b8",
    fontSize: 14,
    flex: 1,
  },
  footerBrand: {
    color: "#475569",
    fontSize: 12,
    textAlign: "center",
  },
});
