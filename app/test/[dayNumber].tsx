import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '@/src/theme';
import { FontFamilies, TypeScale } from '@/src/theme/typography';
import { Spacing, Radius, TouchTarget } from '@/src/theme/spacing';
import { ChargeButton } from '@/src/ui/ChargeButton';
import { Toast } from '@/src/ui/Toast';
import { useUIStore } from '@/src/store/ui.store';
import { useProfileStore } from '@/src/store/profile.store';
import { getDatabase } from '@/src/db/database';
import { BEGINNER_TARGETS, INTERMEDIATE_TARGETS } from '@/src/engine/checkpoint';
import type { TestResult } from '@/src/types';

export default function TestBatteryScreen() {
  const { dayNumber: rawDay } = useLocalSearchParams<{ dayNumber: string }>();
  const dayNumber = (parseInt(rawDay || '1', 10) || 1) as 1 | 15 | 30 | 60;
  const router = useRouter();
  const colors = useThemeColors();
  const profile = useProfileStore((s) => s.profile);
  const showToast = useUIStore((s) => s.showToast);

  // Form states for all 9 battery items
  const [twoKmMinutes, setTwoKmMinutes] = useState('');
  const [twoKmSeconds, setTwoKmSeconds] = useState('');
  const [maxPushUps, setMaxPushUps] = useState('');
  const [pushUpVariation, setPushUpVariation] = useState('Standard');
  const [squats60s, setSquats60s] = useState('');
  const [plankSeconds, setPlankSeconds] = useState('');
  const [wallSitSeconds, setWallSitSeconds] = useState('');
  const [deadHangSeconds, setDeadHangSeconds] = useState('');
  const [pullUps, setPullUps] = useState('');
  const [restingHeartRate, setRestingHeartRate] = useState('');
  const [weightKg, setWeightKg] = useState(profile?.weightKg ? String(profile.weightKg) : '');
  const [waistCm, setWaistCm] = useState(profile?.waistCm ? String(profile.waistCm) : '');
  const [photoFront, setPhotoFront] = useState<string | null>(null);
  const [photoSide, setPhotoSide] = useState<string | null>(null);
  const [photoBack, setPhotoBack] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Active stopwatch for test items
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  const toggleStopwatch = () => {
    if (timerRunning) {
      setTimerRunning(false);
    } else {
      setTimerElapsed(0);
      setTimerRunning(true);
    }
  };

  // Pick photo
  const pickPhoto = async (angle: 'front' | 'side' | 'back') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Photo permission needed to attach progress photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const uri = result.assets[0].uri;
      if (angle === 'front') setPhotoFront(uri);
      if (angle === 'side') setPhotoSide(uri);
      if (angle === 'back') setPhotoBack(uri);
      showToast(`${angle.toUpperCase()} photo added!`);
    }
  };

  // Target reference
  const targets = profile?.level === 'intermediate' ? INTERMEDIATE_TARGETS : BEGINNER_TARGETS;

  const handleSave = async () => {
    try {
      const db = await getDatabase();
      const testId = `test-${dayNumber}-${Date.now()}`;
      const nowIso = new Date().toISOString();

      const totalTwoKmSecs =
        twoKmMinutes || twoKmSeconds
          ? (parseInt(twoKmMinutes || '0', 10) * 60) + parseInt(twoKmSeconds || '0', 10)
          : null;

      await db.runAsync(
        `INSERT OR REPLACE INTO test_results (
          id, day_number, date, two_km_time_seconds, max_push_ups, push_up_variation,
          squats_in_60s, plank_seconds, wall_sit_seconds, dead_hang_seconds,
          inverted_rows, pull_ups, resting_heart_rate, weight_kg, waist_cm,
          photo_front, photo_side, photo_back, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          testId,
          dayNumber,
          nowIso.slice(0, 10),
          totalTwoKmSecs,
          maxPushUps ? parseInt(maxPushUps, 10) : null,
          pushUpVariation,
          squats60s ? parseInt(squats60s, 10) : null,
          plankSeconds ? parseInt(plankSeconds, 10) : null,
          wallSitSeconds ? parseInt(wallSitSeconds, 10) : null,
          deadHangSeconds ? parseInt(deadHangSeconds, 10) : null,
          null, // inverted rows
          pullUps ? parseInt(pullUps, 10) : null,
          restingHeartRate ? parseInt(restingHeartRate, 10) : null,
          weightKg ? parseFloat(weightKg) : null,
          waistCm ? parseFloat(waistCm) : null,
          photoFront,
          photoSide,
          photoBack,
          notes,
          nowIso,
        ],
      );

      // Also record weight/waist into body_metrics table
      if (weightKg || waistCm || restingHeartRate) {
        await db.runAsync(
          'INSERT INTO body_metrics (id, date, weight_kg, waist_cm, resting_heart_rate, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [
            `metric-${Date.now()}`,
            nowIso.slice(0, 10),
            weightKg ? parseFloat(weightKg) : null,
            waistCm ? parseFloat(waistCm) : null,
            restingHeartRate ? parseInt(restingHeartRate, 10) : null,
            nowIso,
          ],
        );
      }

      showToast(`Day ${dayNumber} test results saved!`);
      router.back();
    } catch (err) {
      console.warn('Failed to save test results', err);
      showToast('Error saving test results');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Toast />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: colors.text, fontSize: 18 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.yellow, fontFamily: FontFamilies.displayBold }]}>
          Day {dayNumber} Test Battery
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Stopwatch widget */}
        <View style={[styles.stopwatchCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: FontFamilies.bodyBold }}>
            BUILT-IN TEST STOPWATCH
          </Text>
          <Text style={[styles.stopwatchText, { color: colors.text, fontFamily: FontFamilies.mono }]}>
            {Math.floor(timerElapsed / 60)}:
            {String(timerElapsed % 60).padStart(2, '0')}
          </Text>
          <TouchableOpacity
            onPress={toggleStopwatch}
            style={[
              styles.stopwatchBtn,
              { backgroundColor: timerRunning ? colors.surface2 : colors.green },
            ]}
          >
            <Text
              style={{
                color: timerRunning ? colors.text : colors.inkOnGreen,
                fontFamily: FontFamilies.bodyBold,
                fontSize: 13,
              }}
            >
              {timerRunning ? 'Stop' : 'Start Stopwatch'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 1. 2 km run */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
            1. 2 km Time (Run / Walk)
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            Perform after a full warm-up. Target: ~
            {targets.twoKmTimeSecs?.[dayNumber as 15 | 30 | 60]
              ? `${Math.floor(targets.twoKmTimeSecs[dayNumber as 15 | 30 | 60] / 60)} min`
              : '15 min'}
          </Text>
          <View style={styles.twoInputsRow}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: colors.surface2, color: colors.text, borderColor: colors.line }]}
              placeholder="Minutes (e.g. 14)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={twoKmMinutes}
              onChangeText={setTwoKmMinutes}
            />
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: colors.surface2, color: colors.text, borderColor: colors.line }]}
              placeholder="Seconds (e.g. 30)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={twoKmSeconds}
              onChangeText={setTwoKmSeconds}
            />
          </View>
        </View>

        {/* 2. Push-ups */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
            2. Max Push-Ups
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.line }]}
            placeholder="Reps to failure"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={maxPushUps}
            onChangeText={setMaxPushUps}
          />
          <View style={styles.variationRow}>
            {(['Standard', 'Knee', 'Incline'] as const).map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => setPushUpVariation(v)}
                style={[
                  styles.varChip,
                  {
                    backgroundColor: pushUpVariation === v ? colors.green : colors.surface2,
                    borderColor: pushUpVariation === v ? colors.green : colors.line,
                  },
                ]}
              >
                <Text
                  style={{
                    color: pushUpVariation === v ? colors.inkOnGreen : colors.textMuted,
                    fontSize: 11,
                    fontFamily: FontFamilies.bodyBold,
                  }}
                >
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 3. Squats in 60s */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
            3. Bodyweight Squats in 60 Seconds
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.line }]}
            placeholder="Total reps in 60s"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={squats60s}
            onChangeText={setSquats60s}
          />
        </View>

        {/* 4. Plank hold */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
            4. Max Plank Hold (seconds)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.line }]}
            placeholder="Seconds held"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={plankSeconds}
            onChangeText={setPlankSeconds}
          />
        </View>

        {/* 5. Wall sit */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
            5. Max Wall Sit (seconds)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.line }]}
            placeholder="Seconds held"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={wallSitSeconds}
            onChangeText={setWallSitSeconds}
          />
        </View>

        {/* 6. Dead hang & Pull-ups */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
            6. Dead Hang & Pull-Ups
          </Text>
          <View style={styles.twoInputsRow}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: colors.surface2, color: colors.text, borderColor: colors.line }]}
              placeholder="Dead hang (sec)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={deadHangSeconds}
              onChangeText={setDeadHangSeconds}
            />
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: colors.surface2, color: colors.text, borderColor: colors.line }]}
              placeholder="Pull-ups / Rows"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={pullUps}
              onChangeText={setPullUps}
            />
          </View>
        </View>

        {/* 7. Morning Resting HR */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
            7. Morning Resting Heart Rate (BPM)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface2, color: colors.text, borderColor: colors.line }]}
            placeholder="BPM (taken right after waking)"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={restingHeartRate}
            onChangeText={setRestingHeartRate}
          />
        </View>

        {/* 8. Weight & Waist */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
            8. Weight & Waist Circumference
          </Text>
          <View style={styles.twoInputsRow}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: colors.surface2, color: colors.text, borderColor: colors.line }]}
              placeholder="Weight (kg)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={weightKg}
              onChangeText={setWeightKg}
            />
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: colors.surface2, color: colors.text, borderColor: colors.line }]}
              placeholder="Waist (cm at navel)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={waistCm}
              onChangeText={setWaistCm}
            />
          </View>
        </View>

        {/* 9. Photos */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: FontFamilies.bodyBold }]}>
            9. Progress Photos
          </Text>
          <View style={styles.photosRow}>
            <TouchableOpacity
              onPress={() => pickPhoto('front')}
              style={[
                styles.photoBox,
                { backgroundColor: colors.surface2, borderColor: photoFront ? colors.green : colors.line },
              ]}
            >
              <Text style={{ color: photoFront ? colors.green : colors.textMuted, fontSize: 12 }}>
                {photoFront ? '✓ Front' : '+ Front'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => pickPhoto('side')}
              style={[
                styles.photoBox,
                { backgroundColor: colors.surface2, borderColor: photoSide ? colors.green : colors.line },
              ]}
            >
              <Text style={{ color: photoSide ? colors.green : colors.textMuted, fontSize: 12 }}>
                {photoSide ? '✓ Side' : '+ Side'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => pickPhoto('back')}
              style={[
                styles.photoBox,
                { backgroundColor: colors.surface2, borderColor: photoBack ? colors.green : colors.line },
              ]}
            >
              <Text style={{ color: photoBack ? colors.green : colors.textMuted, fontSize: 12 }}>
                {photoBack ? '✓ Back' : '+ Back'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ChargeButton
          label="Save Test Results"
          onPress={handleSave}
          isPrimary={true}
          style={{ marginTop: Spacing.md }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  title: { fontSize: TypeScale.lg },
  scroll: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  stopwatchCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  stopwatchText: {
    fontSize: 48,
  },
  stopwatchBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    marginTop: 4,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardTitle: { fontSize: 14 },
  cardSubtitle: { fontSize: 11, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
  },
  twoInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  variationRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  varChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  photoBox: {
    flex: 1,
    height: 70,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
