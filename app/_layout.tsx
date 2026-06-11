import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { View } from "react-native";
import "./fonts.css";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BebasNeue: require("../assets/fonts/BebasNeue-Regular.ttf"),
    PlayfairDisplay: require("../assets/fonts/PlayfairDisplay-Bold.ttf"),
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#F2EBD9" }} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}