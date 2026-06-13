import { Analytics } from "@vercel/analytics/react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import "./fonts.css";

export default function RootLayout() {
  // Load fonts but DON'T block rendering on them.
  // Web fonts load via fonts.css; native falls back gracefully until ready.
  useFonts({
    BebasNeue: require("../assets/fonts/BebasNeue-Regular.ttf"),
    PlayfairDisplay: require("../assets/fonts/PlayfairDisplay-Bold.ttf"),
  });

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <Analytics />
    </>
  );
}