import { createNavigationContainerRef } from "@react-navigation/native";

export type RootStackParamList = {
  Home: undefined;
  PostDetail: { id: string };
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(...args: Parameters<typeof navigationRef.navigate>) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(...args);
  }
}
