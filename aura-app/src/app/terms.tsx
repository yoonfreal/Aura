import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

const BG = '#E7ECF5';
const CARD = '#FFFFFF';
const TEXT_DARK = '#1E2430';
const TEXT_MUTED = '#8A93A6';
const BORDER = '#E3E7F0';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Terms and Conditions
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.updatedText}>
            Last updated: August 2026
          </Text>

          <Text style={styles.intro}>
            Welcome to Aura. By using this application, you agree to the
            following terms and conditions.
          </Text>

          <TermSection
            title="1. Acceptance of Terms"
            text="By creating an account or using Aura, you agree to follow these Terms and Conditions. If you do not agree with these terms, please stop using the application."
          />

          <TermSection
            title="2. User Accounts"
            text="You are responsible for maintaining the security of your account and providing accurate information. You should not share your password or account access with other people."
          />

          <TermSection
            title="3. Appropriate Use"
            text="You agree to use Aura responsibly. You must not use the application to harass other users, submit harmful content, attempt unauthorized access, or interfere with the operation of the application."
          />

          <TermSection
            title="4. User Data"
            text="Aura may store information required to provide application features, such as your profile information, XP, level, streaks, missions, and activity data. We aim to handle this information responsibly and securely."
          />

          <TermSection
            title="5. Friends and Social Features"
            text="Some features may allow you to interact with other users, add friends, share achievements, or view activity. Users are responsible for how they interact with others through these features."
          />

          <TermSection
            title="6. Rewards and Progress"
            text="XP, levels, badges, streaks, rankings, and other rewards inside Aura are virtual features of the application. They do not represent real-world currency or monetary value."
          />

          <TermSection
            title="7. Changes to the Application"
            text="Aura may add, modify, or remove features as the application continues to develop. These changes may occur without prior notice."
          />

          <TermSection
            title="8. Account Suspension"
            text="Accounts may be restricted or suspended if a user violates these terms, abuses the application, or negatively affects other users or the system."
          />

          <TermSection
            title="9. Limitation of Responsibility"
            text="Aura is provided as a digital platform for engagement and activity tracking. While we aim to provide accurate and reliable features, we cannot guarantee that the application will always operate without interruption or errors."
          />

          <TermSection
            title="10. Changes to These Terms"
            text="These Terms and Conditions may be updated when necessary. Continued use of the application after changes are made means that you accept the updated terms."
          />

          <TermSection
            title="11. Contact"
            text="If you have questions about these Terms and Conditions, please contact the Aura support team through the Help & Support section of the application."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TermSection({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <Text style={styles.sectionText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  headerSpacer: {
    width: 40,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
  },

  updatedText: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 16,
  },

  intro: {
    fontSize: 14,
    color: TEXT_DARK,
    lineHeight: 21,
    marginBottom: 24,
  },

  section: {
    marginBottom: 22,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 7,
  },

  sectionText: {
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 21,
  },
});