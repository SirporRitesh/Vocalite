// Simple test to check the TTS API
import * as tts from '@diffusionstudio/vits-web';

console.log('TTS API:', Object.keys(tts));

try {
  const voices = await tts.voices();
  console.log('Voices:', voices);
} catch (error) {
  console.error('Error:', error);
}
