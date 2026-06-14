import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAudio } from "@/context/AudioContext";
import { Mail, Lock, User, Eye, EyeOff, Disc, AlertTriangle } from "lucide-react-native";

const { height } = Dimensions.get("window");

export default function AuthScreen() {
  const { login, register, setGuestMode } = useAudio();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Errors & Validations
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Focus States (for styling borders dynamically)
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val.trim());
  };

  const handleAuth = async () => {
    setErrorMsg(null);
    
    // Validations
    if (!email.trim() || !password) {
      setErrorMsg("Please fill in all fields");
      return;
    }
    
    if (!validateEmail(email)) {
      setErrorMsg("Please enter a valid email address");
      return;
    }
    
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        if (!username.trim()) {
          setErrorMsg("Username is required");
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg("Passwords do not match");
          setLoading(false);
          return;
        }
        
        const success = await register(username.trim(), email.trim().toLowerCase(), password);
        if (!success) {
          setErrorMsg("Email is already registered. Try logging in!");
        }
      } else {
        const success = await login(email.trim().toLowerCase(), password);
        if (!success) {
          setErrorMsg("Invalid email or password");
        }
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setErrorMsg(null);
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Decorative Background Glows */}
          <View style={styles.radialGlowGreen} />
          <View style={styles.radialGlowPurple} />

          {/* Logo Brand Header */}
          <View style={styles.brandContainer}>
            <LinearGradient
              colors={["#1db954", "#a855f7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoCircle}
            >
              <Disc color="#ffffff" size={32} />
            </LinearGradient>
            <Text style={styles.brandTitle}>AuraStream</Text>
            <Text style={styles.brandSubtitle}>Your Sound. Your Energy. Scaped.</Text>
          </View>

          {/* Core Auth Panel Card (Glassmorphic look) */}
          <View style={styles.authCard}>
            <Text style={styles.cardHeader}>
              {isSignUp ? "Create Account" : "Welcome Back"}
            </Text>
            
            {/* Error Message Tag */}
            {errorMsg && (
              <View style={styles.errorContainer}>
                <AlertTriangle color="#ef4444" size={16} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Form Fields */}
            {isSignUp && (
              <View style={styles.inputWrapper}>
                <User 
                  color={focusedField === "username" ? "#1db954" : "#8e8e93"} 
                  size={18} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={[
                    styles.input,
                    focusedField === "username" && styles.inputFocused
                  ]}
                  placeholder="Username"
                  placeholderTextColor="#777"
                  value={username}
                  onChangeText={setUsername}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Mail 
                color={focusedField === "email" ? "#1db954" : "#8e8e93"} 
                size={18} 
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  focusedField === "email" && styles.inputFocused
                ]}
                placeholder="Email Address"
                placeholderTextColor="#777"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock 
                color={focusedField === "password" ? "#1db954" : "#8e8e93"} 
                size={18} 
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  focusedField === "password" && styles.inputFocused
                ]}
                placeholder="Password"
                placeholderTextColor="#777"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                {showPassword ? (
                  <EyeOff color="#8e8e93" size={18} />
                ) : (
                  <Eye color="#8e8e93" size={18} />
                )}
              </TouchableOpacity>
            </View>

            {isSignUp && (
              <View style={styles.inputWrapper}>
                <Lock 
                  color={focusedField === "confirmPassword" ? "#1db954" : "#8e8e93"} 
                  size={18} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    focusedField === "confirmPassword" && styles.inputFocused
                  ]}
                  placeholder="Confirm Password"
                  placeholderTextColor="#777"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  onFocus={() => setFocusedField("confirmPassword")}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                >
                  {showConfirmPassword ? (
                    <EyeOff color="#8e8e93" size={18} />
                  ) : (
                    <Eye color="#8e8e93" size={18} />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Action Submit Button */}
            <TouchableOpacity 
              onPress={handleAuth} 
              style={styles.actionBtn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <Text style={styles.actionBtnText}>
                  {isSignUp ? "CREATE ACCOUNT" : "LOG IN"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Switch authentication modes */}
            <TouchableOpacity onPress={switchMode} style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isSignUp 
                  ? "Already have an account? " 
                  : "Don't have an account? "}
                <Text style={styles.switchHighlight}>
                  {isSignUp ? "Log In" : "Sign Up"}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Continue as Guest Bypass */}
          <TouchableOpacity 
            onPress={() => setGuestMode(true)} 
            style={styles.guestBtn}
          >
            <Text style={styles.guestText}>Continue as Guest</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    paddingBottom: 40,
  },
  radialGlowGreen: {
    position: "absolute",
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(29, 185, 84, 0.08)",
    zIndex: -1,
  },
  radialGlowPurple: {
    position: "absolute",
    bottom: 0,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(168, 85, 247, 0.08)",
    zIndex: -1,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: height * 0.02,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#1db954",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  brandTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: "#8e8e93",
    fontSize: 13,
    marginTop: 6,
    fontWeight: "500",
  },
  authCard: {
    backgroundColor: "rgba(25, 25, 25, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: 24,
    width: "100%",
  },
  cardHeader: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    marginBottom: 14,
    height: 52,
    paddingHorizontal: 16,
    position: "relative",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
    height: "100%",
  },
  inputFocused: {
    borderColor: "#1db954",
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeBtn: {
    position: "absolute",
    right: 16,
    height: "100%",
    justifyContent: "center",
  },
  actionBtn: {
    backgroundColor: "#1db954",
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#1db954",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  switchContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  switchText: {
    color: "#8e8e93",
    fontSize: 13,
  },
  switchHighlight: {
    color: "#1db954",
    fontWeight: "700",
  },
  guestBtn: {
    marginTop: 24,
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  guestText: {
    color: "#b3b3b3",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
