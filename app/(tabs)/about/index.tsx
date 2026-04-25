import PageHeader from "@/components/PageHeader";
import { FontAwesome, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function AboutScreen() {
  const year = new Date().getFullYear();

  const openLink = async (url: string, fallbackUrl?: string) => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      if (fallbackUrl) {
        try {
          await Linking.openURL(fallbackUrl);
        } catch (fallbackErr) {
          console.error("Couldn't load page", fallbackErr);
        }
      } else {
        console.error("Couldn't load page", err);
      }
    }
  };

  const openEmail = async (email: string) => {
    try {
      await Linking.openURL(`mailto:${email}`);
    } catch (err) {
      console.error("Couldn't open email app", err);
    }
  };

  return (
    <View style={styles.container}>
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerSection}>
          {/* <View style={styles.iconWrapper}>
            <Text style={{ fontSize: 24 }}>📻</Text>
          </View> */}
          <Text style={styles.title}>About Us</Text>
          <Text style={styles.subtitle}>
            Your gateway to Armenian music, culture, and voice — anytime,
            anywhere.
          </Text>
        </View>

        <View style={styles.socialContainer}>
          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: "#E1306C" }]}
            onPress={() => openLink("https://instagram.com/radioyeraz")}
          >
            <FontAwesome name="instagram" size={22} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: "#0088cc" }]}
            onPress={() =>
              openLink(
                "tg://resolve?domain=yerazradio",
                "https://t.me/yerazradio",
              )
            }
          >
            <FontAwesome5 name="telegram-plane" size={22} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: "#25D366" }]}
            onPress={() => openLink("https://wa.me/+963989711422")}
          >
            <FontAwesome name="whatsapp" size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: "#1877F2" }]}
            onPress={() =>
              openLink(
                "fb://facewebmodal/f?href=https://www.facebook.com/share/1DwjDHv9nb/",
                "https://www.facebook.com/share/1DwjDHv9nb/",
              )
            }
          >
            <FontAwesome name="facebook" size={22} color="white" />
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={["#1e3c72", "#2a5298"]}
          style={styles.featuredCard}
        >
          <Text style={styles.cardTitle}>Who We Are</Text>
          <Text style={styles.cardTextWhite}>
            We are an Armenian radio station dedicated to bringing you the best
            of Armenian music, news, and culture. From timeless classics to
            modern hits, our mission is to connect Armenians around the world
            and keep our culture alive through sound.
          </Text>
        </LinearGradient>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Contact & Info</Text>

          <View style={styles.infoRow}>
            <Ionicons
              name="location-sharp"
              size={18}
              color="#e94560"
              style={styles.rowIcon}
            />
            <Text style={styles.infoText}>Aleppo, Syria</Text>
          </View>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEmail("radioyerazsupport@gmail.com")}
          >
            <Ionicons
              name="mail"
              size={18}
              color="#e94560"
              style={styles.rowIcon}
            />
            <Text style={styles.infoText}>radioyerazsupport@gmail.com</Text>
          </TouchableOpacity>

          <View style={styles.infoRow}>
            <Ionicons
              name="code-slash"
              size={18}
              color="#e94560"
              style={styles.rowIcon}
            />
            <Text style={styles.infoText}>Developer: Benon Merdkhanian</Text>
          </View>

          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEmail("bmerdkhanian@email.com")}
          >
            <Ionicons
              name="at-circle"
              size={18}
              color="#e94560"
              style={styles.rowIcon}
            />
            <Text style={styles.infoText}>bmerdkhanian@email.com</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Developed by Benon Merdkhanian</Text>
          <Text style={styles.footerBrand}>
            © {year} Radio Yeraz. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0e1a" },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 92,
    paddingBottom: 60,
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
    marginBottom: 20,
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 25,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  featuredCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  cardTextWhite: {
    color: "#f8fafc",
    fontSize: 14,
    lineHeight: 22,
  },
  infoSection: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 15,
  },
  infoTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  rowIcon: {
    marginRight: 12,
    width: 20,
  },
  infoText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  footerContainer: {
    marginTop: -5,
    paddingBottom: 20,
    alignItems: "center",
  },
  footerText: {
    color: "#64748b",
    fontSize: 13,
    marginBottom: 4,
  },
  footerBrand: {
    color: "#475569",
    fontSize: 12,
    textAlign: "center",
  },
});
