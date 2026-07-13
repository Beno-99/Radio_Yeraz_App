import MarbleBackground from "@/components/MarbleBackground";
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
  useWindowDimensions,
  View,
} from "react-native";

const CONTACT_EMAIL = "radioyerazsupport@gmail.com";

const buildContactMailtoUrl = ({
  name,
  location,
  message,
}: {
  name: string;
  location: string;
  message: string;
}) => {
  const bodyLines = [
    `Name: ${name}`,
    location ? `Location: ${location}` : "",
    "",
    "Message:",
    message,
  ];

  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    `Contact from ${name}`,
  )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
};

export default function ContactScreen() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
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

    const url = buildContactMailtoUrl({
      name: cleanName,
      location: cleanLocation,
      message: cleanMessage,
    });

    try {
      await Linking.openURL(url);
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
      <MarbleBackground style={StyleSheet.absoluteFill} />

      <View style={styles.headerContainer}>
        <PageHeader />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          isLandscape && styles.scrollLandscape,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.headerSection,
            isLandscape && styles.headerSectionLandscape,
          ]}
        >
          <View
            style={[
              styles.iconWrapper,
              isLandscape && styles.iconWrapperLandscape,
            ]}
          >
            <Ionicons
              name="mail"
              size={isLandscape ? 22 : 28}
              color="#e94560"
            />
          </View>
          <Text style={[styles.title, isLandscape && styles.titleLandscape]}>
            Contact Us
          </Text>
          <Text
            style={[styles.subtitle, isLandscape && styles.subtitleLandscape]}
          >
            We would love to hear from you
          </Text>
        </View>

        <View
          style={[styles.formGrid, isLandscape && styles.formGridLandscape]}
        >
          <View style={[styles.card, isLandscape && styles.cardLandscape]}>
            <View
              style={[
                styles.fieldWrapper,
                isLandscape && styles.fieldWrapperLandscape,
              ]}
            >
              <Text
                style={[styles.label, isLandscape && styles.labelLandscape]}
              >
                Full Name *
              </Text>
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
                  style={[
                    styles.inputText,
                    isLandscape && styles.inputTextLandscape,
                  ]}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View
              style={[
                styles.fieldWrapper,
                isLandscape && styles.fieldWrapperLandscape,
              ]}
            >
              <Text
                style={[styles.label, isLandscape && styles.labelLandscape]}
              >
                Location
              </Text>
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
                  style={[
                    styles.inputText,
                    isLandscape && styles.inputTextLandscape,
                  ]}
                  value={location}
                  onChangeText={setLocation}
                  onFocus={() => setFocusedField("location")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View
              style={[
                styles.fieldWrapper,
                isLandscape && styles.fieldWrapperLandscape,
              ]}
            >
              <Text
                style={[styles.label, isLandscape && styles.labelLandscape]}
              >
                Message *
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  styles.textAreaWrapper,
                  focusedField === "message" && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={isLandscape ? 20 : 18}
                  color={focusedField === "message" ? "#e94560" : "#94a3b8"}
                  style={[
                    styles.inputIcon,
                    styles.messageInputIcon,
                    isLandscape && styles.messageInputIconLandscape,
                  ]}
                />
                <TextInput
                  placeholder="Write your message here..."
                  placeholderTextColor="#4b5563"
                  style={[
                    styles.inputText,
                    styles.textArea,
                    isLandscape && styles.inputTextLandscape,
                    isLandscape && styles.textAreaLandscape,
                  ]}
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
                  style={[
                    styles.buttonGradient,
                    isLandscape && styles.buttonGradientLandscape,
                  ]}
                >
                  <Ionicons
                    name={sending ? "hourglass-outline" : "send"}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.buttonText}>
                    {sending ? "Opening..." : "Open Email App"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View
            style={[
              styles.infoSection,
              isLandscape && styles.infoSectionLandscape,
            ]}
          >
            <Text
              style={[
                styles.infoTitle,
                isLandscape && styles.infoTitleLandscape,
              ]}
            >
              Get in Touch
            </Text>

            <TouchableOpacity
              style={[styles.infoRow, isLandscape && styles.infoRowLandscape]}
              onPress={handleOpenEmail}
            >
              <View
                style={[
                  styles.infoIconWrapper,
                  isLandscape && styles.infoIconWrapperLandscape,
                ]}
              >
                <Ionicons name="mail" size={16} color="#e94560" />
              </View>
              <Text
                style={[
                  styles.infoText,
                  isLandscape && styles.infoTextLandscape,
                ]}
              >
                {CONTACT_EMAIL}
              </Text>
            </TouchableOpacity>

            <View
              style={[styles.infoRow, isLandscape && styles.infoRowLandscape]}
            >
              <View
                style={[
                  styles.infoIconWrapper,
                  isLandscape && styles.infoIconWrapperLandscape,
                ]}
              >
                <Ionicons name="location" size={16} color="#e94560" />
              </View>
              <Text
                style={[
                  styles.infoText,
                  isLandscape && styles.infoTextLandscape,
                ]}
              >
                Syria
              </Text>
            </View>

            <View
              style={[styles.infoRow, isLandscape && styles.infoRowLandscape]}
            >
              <View
                style={[
                  styles.infoIconWrapper,
                  isLandscape && styles.infoIconWrapperLandscape,
                ]}
              >
                <Ionicons name="radio" size={16} color="#e94560" />
              </View>
              <Text
                style={[
                  styles.infoText,
                  isLandscape && styles.infoTextLandscape,
                ]}
              >
                Radio Yeraz - Armenian Music 24/7
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerBrand}>
          (c) {new Date().getFullYear()} Radio Yeraz. All rights reserved.
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
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
  },
  scrollLandscape: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 76,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  headerSectionLandscape: {
    marginBottom: 8,
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
  iconWrapperLandscape: {
    display: "none",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  titleLandscape: {
    fontSize: 20,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    letterSpacing: 0.3,
  },
  subtitleLandscape: {
    fontSize: 12,
  },
  formGrid: {
    width: "100%",
  },
  formGridLandscape: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    marginBottom: 24,
  },
  cardLandscape: {
    flex: 1.12,
    borderRadius: 18,
    padding: 12,
    marginBottom: 0,
  },
  fieldWrapper: { marginBottom: 16 },
  fieldWrapperLandscape: { marginBottom: 8 },
  label: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  labelLandscape: {
    fontSize: 10,
    marginBottom: 6,
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
  messageInputIcon: {
    alignSelf: "flex-start",
    marginTop: 14,
  },
  messageInputIconLandscape: {
    marginTop: 9,
  },
  inputText: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    paddingVertical: 14,
    paddingRight: 14,
  },
  inputTextLandscape: {
    fontSize: 13,
    paddingVertical: 8,
  },
  textAreaWrapper: { alignItems: "flex-start" },
  textArea: { height: 120, paddingTop: 14 },
  textAreaLandscape: { height: 64, paddingTop: 8 },
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
  buttonGradientLandscape: {
    paddingVertical: 10,
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
  infoSectionLandscape: {
    flex: 0.88,
    borderRadius: 18,
    padding: 14,
    marginBottom: 0,
  },
  infoTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  infoTitleLandscape: {
    fontSize: 14,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  infoRowLandscape: {
    marginBottom: 10,
    gap: 10,
  },
  infoIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(233,69,96,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoIconWrapperLandscape: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  infoText: {
    color: "#94a3b8",
    fontSize: 14,
    flex: 1,
  },
  infoTextLandscape: {
    fontSize: 12,
  },
  footerBrand: {
    color: "#475569",
    fontSize: 12,
    textAlign: "center",
  },
});
