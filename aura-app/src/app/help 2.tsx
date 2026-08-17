import { useState } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Mail,
  MessageCircle,
  Bug,
} from 'lucide-react-native';

const BG = '#E7ECF5';
const CARD = '#FFFFFF';
const BORDER = '#E3E7F0';
const TEXT_DARK = '#1E2430';
const TEXT_MUTED = '#8A93A6';
const ICON_BG = '#FBDCC8';
const ORANGE = '#F5822A';
const NAVY = '#1B2A41';

type FAQ = {
  question: string;
  answer: string;
};

const FAQS: FAQ[] = [
  {
    question: 'How do I edit my profile?',
    answer:
      'Go to your Profile page and select Edit Profile. You can update your profile information and save your changes.',
  },
  {
    question: 'How does XP work?',
    answer:
      'You can earn XP by completing activities and missions in Aura. Earning XP helps increase your level and unlock achievements.',
  },
  {
    question: 'How do streaks work?',
    answer:
      'Your streak increases when you stay active and complete eligible activities on consecutive days.',
  },
  {
    question: 'How do I earn badges?',
    answer:
      'Badges are earned by reaching specific achievements such as maintaining streaks, completing goals, or reaching activity milestones.',
  },
  {
    question: 'Why is my XP or streak not updating?',
    answer:
      'Try refreshing or reopening the application. If the issue continues, contact support and provide details about the activity that was not recorded.',
  },
  {
    question: 'How can I add friends?',
    answer:
      'Friend features allow you to connect with other Aura users. You can search for users and send friend requests when the feature is available.',
  },
];

export default function HelpScreen() {
  const router = useRouter();

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const contactSupport = async () => {
    const email = 'support@aura-app.com';

    const subject = encodeURIComponent('Aura Support Request');

    const url = `mailto:${email}?subject=${subject}`;

    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        'Unable to open email',
        'Please contact support at support@aura-app.com.'
      );
    }
  };

  const reportProblem = async () => {
    const email = 'support@aura-app.com';

    const subject = encodeURIComponent('Aura Problem Report');

    const body = encodeURIComponent(
      'Please describe the problem you experienced:\n\n'
    );

    const url = `mailto:${email}?subject=${subject}&body=${body}`;

    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        'Unable to open email',
        'Please contact support at support@aura-app.com.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <ArrowLeft
            size={24}
            color={TEXT_DARK}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Help & Support
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome */}
        <View style={styles.welcomeCard}>
          <View style={styles.bigIcon}>
            <MessageCircle
              size={28}
              color={ORANGE}
            />
          </View>

          <Text style={styles.welcomeTitle}>
            How can we help?
          </Text>

          <Text style={styles.welcomeText}>
            Find answers to common questions or contact the Aura support team.
          </Text>
        </View>

        {/* FAQ */}
        <Text style={styles.sectionLabel}>
          FREQUENTLY ASKED QUESTIONS
        </Text>

        <View style={styles.faqContainer}>
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <TouchableOpacity
                key={index}
                style={styles.faqCard}
                activeOpacity={0.8}
                onPress={() => toggleFAQ(index)}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>
                    {faq.question}
                  </Text>

                  {isOpen ? (
                    <ChevronUp
                      size={18}
                      color={TEXT_MUTED}
                    />
                  ) : (
                    <ChevronDown
                      size={18}
                      color={TEXT_MUTED}
                    />
                  )}
                </View>

                {isOpen && (
                  <Text style={styles.faqAnswer}>
                    {faq.answer}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Support */}
        <Text style={styles.sectionLabel}>
          CONTACT SUPPORT
        </Text>

        <TouchableOpacity
          style={styles.supportRow}
          activeOpacity={0.7}
          onPress={contactSupport}
        >
          <View style={styles.supportLeft}>
            <View style={styles.iconCircle}>
              <Mail
                size={18}
                color={ORANGE}
              />
            </View>

            <View>
              <Text style={styles.supportTitle}>
                Email Support
              </Text>

              <Text style={styles.supportSubtitle}>
                Get help from our support team
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.supportRow}
          activeOpacity={0.7}
          onPress={reportProblem}
        >
          <View style={styles.supportLeft}>
            <View style={styles.iconCircle}>
              <Bug
                size={18}
                color={ORANGE}
              />
            </View>

            <View>
              <Text style={styles.supportTitle}>
                Report a Problem
              </Text>

              <Text style={styles.supportSubtitle}>
                Tell us about an issue
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.version}>
          Aura Version 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
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

  welcomeCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    marginBottom: 24,
  },

  bigIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 6,
  },

  welcomeText: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 19,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_MUTED,
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.4,
  },

  faqContainer: {
    gap: 10,
    marginBottom: 26,
  },

  faqCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },

  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
  },

  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
  },

  faqAnswer: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 19,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  supportRow: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
  },

  supportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },

  supportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
  },

  supportSubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 3,
  },

  version: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 28,
  },
});