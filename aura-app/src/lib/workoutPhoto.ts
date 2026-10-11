import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';

export type WorkoutVerdict = { verified: boolean; reason: string; sport: string | null };

// A photo is checked either for a daily sport mission or for a sport-session challenge.
export type WorkoutTarget = { userMissionId: string } | { challengeId: string };

// Opens the camera for a live photo — the gallery is never offered, so a student can't submit
// an old or downloaded picture. Returns null if they cancel. The photo is downscaled before
// upload: a full-resolution iPhone shot is several MB, far more than the AI needs to judge it.
export async function captureWorkoutPhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera access is needed to verify your workout. You can allow it in Settings.');
  }

  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled || !result.assets?.[0]) return null;

  const rendered = await ImageManipulator.manipulate(result.assets[0].uri).resize({ width: 1024 }).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return saved.base64 ?? null;
}

// Sends the photo to the validate-workout Edge Function, which holds the Claude API key and
// records the attempt. Server-side errors (limit reached, already completed) come back with a
// readable message in the response body.
export async function verifyWorkoutPhoto(target: WorkoutTarget, imageBase64: string): Promise<WorkoutVerdict> {
  const { data, error } = await supabase.functions.invoke<WorkoutVerdict>('validate-workout', {
    body: { ...target, imageBase64 },
  });

  if (error) {
    let message = 'Could not verify your photo. Please try again.';
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const body = await context.json();
        if (typeof body?.error === 'string') message = body.error;
      } catch {
        // keep the generic message
      }
    }
    throw new Error(message);
  }

  if (!data || typeof data.verified !== 'boolean') {
    throw new Error('Could not verify your photo. Please try again.');
  }
  return { verified: data.verified, reason: data.reason, sport: data.sport ?? null };
}
