import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  interpolate,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");
const SCANNER_SIZE = 160;

type ScanResult = "TRUTH" | "LIE" | null;

export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult>(null);
  const [forcedResult, setForcedResult] = useState<ScanResult>(null);

  const scanPosition = useSharedValue(0);
  const scale = useSharedValue(1);
  const resultOpacity = useSharedValue(0);
  const resultScale = useSharedValue(0.5);

  const startScanningAnimation = () => {
    scanPosition.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
      true,
    );
  };

  const stopAnimations = () => {
    cancelAnimation(scanPosition);
    cancelAnimation(scale);
    scanPosition.value = withTiming(0);
    scale.value = withSpring(1);
  };

  useEffect(() => {
    let scanTimeout: NodeJS.Timeout;
    let hapticInterval: NodeJS.Timeout;

    if (isScanning) {
      setResult(null);
      resultOpacity.value = 0;
      resultScale.value = 0.5;

      startScanningAnimation();

      // Haptics loop for pulsating effect
      hapticInterval = setInterval(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 300);

      // Require exactly 3 seconds to complete the scan
      scanTimeout = setTimeout(() => {
        handleScanComplete();
      }, 3000);
    } else {
      stopAnimations();
    }

    return () => {
      clearTimeout(scanTimeout);
      clearInterval(hapticInterval);
    };
  }, [isScanning]);

  const handleScanComplete = () => {
    setIsScanning(false);

    // Determine result
    let finalResult: ScanResult;
    if (forcedResult) {
      finalResult = forcedResult;
      setForcedResult(null); // Reset after use
    } else {
      finalResult = Math.random() > 0.5 ? "TRUTH" : "LIE";
    }

    if (finalResult === "TRUTH") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setResult(finalResult);

    // Animate result in
    resultOpacity.value = withTiming(1, { duration: 600 });
    resultScale.value = withSpring(1, { damping: 10, stiffness: 80 });
  };

  const handlePressIn = () => {
    setIsScanning(true);
  };

  const handlePressOut = () => {
    // If they lift their finger early, stop and throw an error haptic
    if (isScanning) {
      setIsScanning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  // Animated styles
  const scannerContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const laserStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scanPosition.value,
          [0, 1],
          [-10, SCANNER_SIZE + 10],
        ),
      },
    ],
    opacity: isScanning ? 1 : 0,
  }));

  const resultContainerStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
    transform: [{ scale: resultScale.value }],
  }));

  return (
    <LinearGradient
      colors={["#0F2027", "#203A43", "#2C5364"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Hidden touch targets for prank mechanic (corners) */}
        <Pressable
          style={[styles.hiddenTarget, { left: 0, top: 0 }]}
          onPress={() => setForcedResult("TRUTH")}
        />
        <Pressable
          style={[styles.hiddenTarget, { right: 0, top: 0 }]}
          onPress={() => setForcedResult("LIE")}
        />

        <View style={styles.header}>
          <Text style={styles.title}>LIE DETECTOR</Text>
          <Text style={styles.subtitle}>Hold thumb down to scan</Text>
        </View>

        <View style={styles.mainContent}>
          <Animated.View
            style={[styles.scannerContainer, scannerContainerStyle]}
          >
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={styles.fingerprintButton}
            >
              <Ionicons
                name="finger-print"
                size={SCANNER_SIZE}
                color={isScanning ? "#00e5ff" : "#8892b0"}
              />
              <Animated.View style={[styles.laser, laserStyle]} />
            </Pressable>
          </Animated.View>

          <View style={styles.resultPlaceholder}>
            <Animated.View
              style={[styles.resultContainer, resultContainerStyle]}
            >
              {result && (
                <>
                  <Ionicons
                    name={
                      result === "TRUTH" ? "checkmark-circle" : "close-circle"
                    }
                    size={100}
                    color={result === "TRUTH" ? "#00e676" : "#ff1744"}
                  />
                  <Text
                    style={[
                      styles.resultText,
                      { color: result === "TRUTH" ? "#00e676" : "#ff1744" },
                    ]}
                  >
                    {result}
                  </Text>
                </>
              )}
            </Animated.View>
          </View>
        </View>

        {/* Very subtle debug dot to indicate a forced result is loaded */}
        <View
          style={[
            styles.debugIndicator,
            {
              backgroundColor:
                forcedResult === "TRUTH"
                  ? "#00e676"
                  : forcedResult === "LIE"
                    ? "#ff1744"
                    : "transparent",
            },
          ]}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    marginTop: 40,
    alignItems: "center",
    paddingTop: 40,
  },
  title: {
    fontSize: 40,
    fontWeight: "900",
    color: "#3b82f6",
    letterSpacing: 3,
    textShadowColor: "rgba(0, 229, 255, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#8892b0",
    marginTop: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scannerContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  fingerprintButton: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  laser: {
    position: "absolute",
    width: SCANNER_SIZE + 20,
    height: 4,
    backgroundColor: "#00e5ff",
    borderRadius: 2,
    shadowColor: "#00e5ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  },
  resultPlaceholder: {
    height: 180,
    marginTop: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  resultContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  resultText: {
    fontSize: 52,
    fontWeight: "900",
    letterSpacing: 8,
    marginTop: 15,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  hiddenTarget: {
    position: "absolute",
    width: 120,
    height: 120,
    zIndex: 100,
  },
  debugIndicator: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
});
