import messaging from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";

export async function requestUserPermission() {
  if (Platform.OS === "android" && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  const authStatus = await messaging().requestPermission();
  return authStatus === messaging.AuthorizationStatus.AUTHORIZED;
}

// const App = () => {
//   useEffect(() => {
//     const setupFCM = async () => {
//       const hasPermission = await requestUserPermission();
//       if (hasPermission) {
//         const token = await messaging().getToken();
//         console.log('FCM Token:', token);
//         // Send this token to your backend server
//       }
//     };
//     setupFCM();
//   }, []);

//   return (
//     // Your App UI
//   );
// };
