import { createNavigationContainerRef } from "@react-navigation/native";

export type RootStackParamList = {
  Home: undefined;
  PostDetail: { id: string };
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(...args: any[]) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(args[0], args[1]);
  }
}
