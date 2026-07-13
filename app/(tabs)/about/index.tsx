import MarbleBackground from "@/components/MarbleBackground";
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
  useWindowDimensions,
  View,
} from "react-native";

const YOUTUBE_CHANNEL_URL =
  process.env.EXPO_PUBLIC_YOUTUBE_CHANNEL_URL ||
  "https://youtube.com/@radioyeraz?si=Rf5O_3GbZDeNALgq";

export default function AboutScreen() {
  const year = new Date().getFullYear();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const socialIconSize = isLandscape ? 19 : 22;

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
      <MarbleBackground style={StyleSheet.absoluteFill} />

      <View style={styles.headerContainer}>
        <PageHeader />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          isLandscape && styles.contentLandscape,
        ]}
      >
        <View
          style={[
            styles.headerSection,
            isLandscape && styles.headerSectionLandscape,
          ]}
        >
          {/* <View style={styles.iconWrapper}>
            <Text style={{ fontSize: 24 }}>📻</Text>
          </View> */}
          <Text style={[styles.title, isLandscape && styles.titleLandscape]}>
            About Us
          </Text>
          <Text
            style={[styles.subtitle, isLandscape && styles.subtitleLandscape]}
          >
            Your gateway to Armenian music, culture, and voice — anytime,
            anywhere.
          </Text>
        </View>

        <View
          style={[
            styles.socialContainer,
            isLandscape && styles.socialContainerLandscape,
          ]}
        >
          <TouchableOpacity
            style={[
              styles.socialButton,
              isLandscape && styles.socialButtonLandscape,
              { backgroundColor: "#E1306C" },
            ]}
            onPress={() => openLink("https://instagram.com/radioyeraz")}
          >
            <FontAwesome name="instagram" size={socialIconSize} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.socialButton,
              isLandscape && styles.socialButtonLandscape,
              { backgroundColor: "#0088cc" },
            ]}
            onPress={() =>
              openLink(
                "tg://resolve?domain=yerazradio",
                "https://t.me/yerazradio",
              )
            }
          >
            <FontAwesome5
              name="telegram-plane"
              size={socialIconSize}
              color="white"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.socialButton,
              isLandscape && styles.socialButtonLandscape,
              { backgroundColor: "#25D366" },
            ]}
            onPress={() => openLink("https://wa.me/+963989711422")}
          >
            <FontAwesome name="whatsapp" size={socialIconSize} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.socialButton,
              isLandscape && styles.socialButtonLandscape,
              { backgroundColor: "#1877F2" },
            ]}
            onPress={() =>
              openLink(
                "fb://facewebmodal/f?href=https://www.facebook.com/share/1DwjDHv9nb/",
                "https://www.facebook.com/share/1DwjDHv9nb/",
              )
            }
          >
            <FontAwesome name="facebook" size={socialIconSize} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.socialButton,
              isLandscape && styles.socialButtonLandscape,
              { backgroundColor: "#FF0033" },
            ]}
            onPress={() => openLink(YOUTUBE_CHANNEL_URL)}
          >
            <Ionicons
              name="logo-youtube"
              size={isLandscape ? 21 : 24}
              color="white"
            />
          </TouchableOpacity>
        </View>

        <View
          style={[styles.infoGrid, isLandscape && styles.infoGridLandscape]}
        >
          <LinearGradient
            colors={["#1e3c72", "#2a5298"]}
            style={[
              styles.featuredCard,
              isLandscape && styles.featuredCardLandscape,
            ]}
          >
            <Text
              style={[
                styles.cardTitle,
                isLandscape && styles.cardTitleLandscape,
              ]}
            >
              Who We Are{" "}
            </Text>
            <Text
              style={[
                styles.cardTextWhite,
                isLandscape && styles.cardTextWhiteLandscape,
              ]}
            >
              Radio Yeraz is a volunteer-led Armenian media team in Syria. We
              stream live programs, community news, podcasts, and cultural
              events so our listeners can stay close to Armenian music, stories,
              and daily life wherever they are.
            </Text>
          </LinearGradient>

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
              Contact & Info
            </Text>

            <View
              style={[styles.infoRow, isLandscape && styles.infoRowLandscape]}
            >
              <Ionicons
                name="location-sharp"
                size={18}
                color="#e94560"
                style={styles.rowIcon}
              />
              <Text
                style={[
                  styles.infoText,
                  isLandscape && styles.infoTextLandscape,
                ]}
              >
                Aleppo, Syria
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.infoRow, isLandscape && styles.infoRowLandscape]}
              onPress={() => openEmail("radioyerazsupport@gmail.com")}
            >
              <Ionicons
                name="mail"
                size={18}
                color="#e94560"
                style={styles.rowIcon}
              />
              <Text
                style={[
                  styles.infoText,
                  isLandscape && styles.infoTextLandscape,
                ]}
              >
                radioyerazsupport@gmail.com
              </Text>
            </TouchableOpacity>

            <View
              style={[styles.infoRow, isLandscape && styles.infoRowLandscape]}
            >
              <Ionicons
                name="code-slash"
                size={18}
                color="#e94560"
                style={styles.rowIcon}
              />
              <Text
                style={[
                  styles.infoText,
                  isLandscape && styles.infoTextLandscape,
                ]}
              >
                Developer: Benon Merdkhanian
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.infoRow, isLandscape && styles.infoRowLandscape]}
              onPress={() => openEmail("bmerdkhanian@email.com")}
            >
              <Ionicons
                name="at-circle"
                size={18}
                color="#e94560"
                style={styles.rowIcon}
              />
              <Text
                style={[
                  styles.infoText,
                  isLandscape && styles.infoTextLandscape,
                ]}
              >
                bmerdkhanian@email.com
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.footerContainer,
            isLandscape && styles.footerContainerLandscape,
          ]}
        >
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
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
  },
  contentLandscape: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 76,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerSectionLandscape: {
    marginBottom: 6,
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
  titleLandscape: {
    fontSize: 20,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },
  subtitleLandscape: {
    fontSize: 12,
    lineHeight: 16,
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  socialContainerLandscape: {
    gap: 10,
    marginBottom: 10,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  socialButtonLandscape: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  infoGrid: {
    width: "100%",
  },
  infoGridLandscape: {
    flexDirection: "row",
    gap: 16,
    alignItems: "stretch",
  },
  featuredCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  featuredCardLandscape: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 0,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  cardTitleLandscape: {
    fontSize: 15,
    marginBottom: 6,
  },
  cardTextWhite: {
    color: "#f8fafc",
    fontSize: 14,
    lineHeight: 22,
  },
  cardTextWhiteLandscape: {
    fontSize: 12,
    lineHeight: 17,
  },
  infoSection: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 15,
  },
  infoSectionLandscape: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 0,
  },
  infoTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 15,
  },
  infoTitleLandscape: {
    fontSize: 14,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoRowLandscape: {
    marginBottom: 8,
  },
  rowIcon: {
    marginRight: 12,
    width: 20,
  },
  infoText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  infoTextLandscape: {
    fontSize: 12,
  },
  footerContainer: {
    marginTop: 10,
    paddingBottom: 20,
    alignItems: "center",
  },
  footerContainerLandscape: {
    marginTop: 18,
    paddingBottom: 72,
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
