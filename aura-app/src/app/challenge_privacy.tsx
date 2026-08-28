import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function ChallengePrivacyScreen() {
  const router = useRouter();

  const [selected, setSelected] =
    useState('Everyone');

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}

      <View style={styles.header}>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Challenge Privacy
        </Text>

        <View style={{ width: 40 }} />

      </View>

      {/* Content */}

      <View style={styles.content}>

        <Text style={styles.heading}>
          Who Can Challenge Me?
        </Text>

        <Text style={styles.subtitle}>
          Choose who can send you challenge
          invitations.
        </Text>

        {/* Everyone */}

        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            setSelected('Everyone')
          }
          activeOpacity={0.7}
        >
          <View style={styles.textContainer}>
            <Text style={styles.rowText}>
              Everyone
            </Text>

            <Text style={styles.description}>
              Anyone can challenge you
            </Text>
          </View>

          <View
            style={[
              styles.radio,
              selected === 'Everyone' &&
                styles.radioSelected,
            ]}
          >
            {selected === 'Everyone' && (
              <View
                style={styles.radioDot}
              />
            )}
          </View>
        </TouchableOpacity>

        {/* Friends Only */}

        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            setSelected('Friends Only')
          }
          activeOpacity={0.7}
        >
          <View style={styles.textContainer}>
            <Text style={styles.rowText}>
              Friends Only
            </Text>

            <Text style={styles.description}>
              Only your friends can challenge you
            </Text>
          </View>

          <View
            style={[
              styles.radio,
              selected === 'Friends Only' &&
                styles.radioSelected,
            ]}
          >
            {selected === 'Friends Only' && (
              <View
                style={styles.radioDot}
              />
            )}
          </View>
        </TouchableOpacity>

        {/* Nobody */}

        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            setSelected('Nobody')
          }
          activeOpacity={0.7}
        >
          <View style={styles.textContainer}>
            <Text style={styles.rowText}>
              Nobody
            </Text>

            <Text style={styles.description}>
              Don't allow anyone to challenge you
            </Text>
          </View>

          <View
            style={[
              styles.radio,
              selected === 'Nobody' &&
                styles.radioSelected,
            ]}
          >
            {selected === 'Nobody' && (
              <View
                style={styles.radioDot}
              />
            )}
          </View>
        </TouchableOpacity>

      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#E7ECF5',
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

  backText: {
    fontSize: 34,
    color: '#1E2430',
    lineHeight: 36,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E2430',
  },

  content: {
    padding: 16,
  },

  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E2430',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#8A93A6',
    marginBottom: 18,
  },

  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  textContainer: {
    flex: 1,
    paddingRight: 12,
  },

  rowText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E2430',
  },

  description: {
    fontSize: 12,
    lineHeight: 17,
    color: '#8A93A6',
    marginTop: 4,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C7CEDA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelected: {
    borderColor: '#1B2A41',
  },

  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#1B2A41',
  },

});