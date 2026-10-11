// Camera specification schema for the equipment catalog.
//
// One flat `specifications` object per camera body. Every key defaults to
// null, which the UI renders as "Unresearched" — never invent values.
// Research with an official manufacturer source, record it in
// `web/cameras/camera-specs.json`, and the detail page picks it up on the
// next `npm run catalog`.
//
// Sections below drive `EquipmentDetail.svelte` grouping and order.

export const CAMERA_SPEC_DEFAULTS = {
  // Sensor & processor
  sensorType: null,
  effectiveMegapixels: null,
  maxResolutionPx: null,
  imageProcessor: null,
  imageStabilization: null,
  sensorCleaning: null,
  // Stills & shutter
  shutterTypes: null,
  maxMechanicalShutter: null,
  maxElectronicShutter: null,
  maxBurstFps: null,
  isoRange: null,
  exposureModes: null,
  meteringSystem: null,
  ratedShutterLife: null,
  continuousBuffer: null,
  // Video
  maxVideoResolution: null,
  maxVideoFrameRates: null,
  videoCodecs: null,
  videoCrop: null,
  logProfiles: null,
  recordingLimit: null,
  slowMotion: null,
  // Audio
  internalMicrophone: null,
  microphoneInput: null,
  headphoneOutput: null,
  audioRecording: null,
  // Autofocus
  afSystem: null,
  afPoints: null,
  afSensitivity: null,
  subjectDetection: null,
  manualFocusAids: null,
  // Viewfinder & screen
  viewfinderType: null,
  evfResolution: null,
  evfMagnification: null,
  lcdSizeIn: null,
  lcdResolution: null,
  lcdType: null,
  touchscreen: null,
  // Body & build
  weightG: null,
  dimensionsMm: null,
  weatherSealed: null,
  bodyMaterial: null,
  // Connectivity
  wifi: null,
  bluetooth: null,
  usbPort: null,
  hdmiPort: null,
  hotshoe: null,
  flashSync: null,
  remoteControl: null,
  gps: null,
  // Power & storage
  batteryModel: null,
  batteryLifeShots: null,
  usbCharging: null,
  cardSlots: null,
  supportedCards: null,
};

export const CAMERA_SPEC_SECTIONS = [
  {
    title: 'Sensor & processor.',
    fields: [
      { key: 'sensorType', label: 'Sensor type' },
      { key: 'effectiveMegapixels', label: 'Effective megapixels', unit: 'MP' },
      { key: 'maxResolutionPx', label: 'Maximum resolution' },
      { key: 'imageProcessor', label: 'Image processor' },
      { key: 'imageStabilization', label: 'Image stabilization' },
      { key: 'sensorCleaning', label: 'Sensor cleaning' },
    ],
  },
  {
    title: 'Stills & shutter.',
    fields: [
      { key: 'shutterTypes', label: 'Shutter types' },
      { key: 'maxMechanicalShutter', label: 'Fastest mechanical' },
      { key: 'maxElectronicShutter', label: 'Fastest electronic' },
      { key: 'maxBurstFps', label: 'Continuous burst' },
      { key: 'isoRange', label: 'ISO range' },
      { key: 'exposureModes', label: 'Exposure modes' },
      { key: 'meteringSystem', label: 'Metering' },
      { key: 'ratedShutterLife', label: 'Rated shutter life', unit: 'shots' },
      { key: 'continuousBuffer', label: 'Buffer depth' },
    ],
  },
  {
    title: 'Video.',
    fields: [
      { key: 'maxVideoResolution', label: 'Maximum resolution' },
      { key: 'maxVideoFrameRates', label: 'Frame rates' },
      { key: 'videoCodecs', label: 'Codecs & containers' },
      { key: 'videoCrop', label: 'Crop modes' },
      { key: 'logProfiles', label: 'Log & HDR profiles' },
      { key: 'recordingLimit', label: 'Recording limit' },
      { key: 'slowMotion', label: 'Slow motion' },
    ],
  },
  {
    title: 'Audio.',
    fields: [
      { key: 'internalMicrophone', label: 'Internal microphone' },
      { key: 'microphoneInput', label: 'Microphone input' },
      { key: 'headphoneOutput', label: 'Headphone output' },
      { key: 'audioRecording', label: 'Audio recording' },
    ],
  },
  {
    title: 'Autofocus.',
    fields: [
      { key: 'afSystem', label: 'AF system' },
      { key: 'afPoints', label: 'AF points / zones' },
      { key: 'afSensitivity', label: 'Low-light sensitivity' },
      { key: 'subjectDetection', label: 'Subject detection' },
      { key: 'manualFocusAids', label: 'Manual focus aids' },
    ],
  },
  {
    title: 'Viewfinder & screen.',
    fields: [
      { key: 'viewfinderType', label: 'Viewfinder' },
      { key: 'evfResolution', label: 'EVF resolution' },
      { key: 'evfMagnification', label: 'EVF magnification' },
      { key: 'lcdSizeIn', label: 'LCD size', unit: 'in' },
      { key: 'lcdResolution', label: 'LCD resolution' },
      { key: 'lcdType', label: 'LCD type' },
      { key: 'touchscreen', label: 'Touch control' },
    ],
  },
  {
    title: 'Body & build.',
    fields: [
      { key: 'weightG', label: 'Weight', unit: 'g' },
      { key: 'dimensionsMm', label: 'Dimensions' },
      { key: 'weatherSealed', label: 'Weather sealed' },
      { key: 'bodyMaterial', label: 'Body material' },
    ],
  },
  {
    title: 'Connectivity.',
    fields: [
      { key: 'wifi', label: 'Wi-Fi' },
      { key: 'bluetooth', label: 'Bluetooth' },
      { key: 'usbPort', label: 'USB' },
      { key: 'hdmiPort', label: 'HDMI' },
      { key: 'hotshoe', label: 'Hot shoe' },
      { key: 'flashSync', label: 'Flash sync' },
      { key: 'remoteControl', label: 'Remote control' },
      { key: 'gps', label: 'GPS / geotagging' },
    ],
  },
  {
    title: 'Power & storage.',
    fields: [
      { key: 'batteryModel', label: 'Battery' },
      { key: 'batteryLifeShots', label: 'Battery life', unit: 'shots' },
      { key: 'usbCharging', label: 'USB charging / power' },
      { key: 'cardSlots', label: 'Card slots' },
      { key: 'supportedCards', label: 'Supported cards' },
    ],
  },
];

export function formatSpec(key, raw) {
  const field = CAMERA_SPEC_SECTIONS.flatMap(section => section.fields).find(item => item.key === key);
  if (raw == null) return 'Unresearched';
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
  if (Array.isArray(raw)) return raw.join(' · ') || 'None recorded';
  if (typeof raw === 'number' && field?.unit) return `${raw.toLocaleString('en-US')} ${field.unit}`;
  return String(raw);
}
