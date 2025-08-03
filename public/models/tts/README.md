# TTS Models Directory

This directory contains Text-to-Speech models for the Piper TTS system.

## Required Models

To use the TTS functionality, you need to download Piper TTS models and place them here:

### Recommended Model (Lightweight English Voice):
- **en_US-lessac-medium.onnx** - Main model file
- **en_US-lessac-medium.onnx.json** - Configuration file

### Download Instructions:

1. Visit: https://github.com/rhasspy/piper/releases
2. Download a voice model (e.g., `en_US-lessac-medium.tar.gz`)
3. Extract the files:
   - `en_US-lessac-medium.onnx`
   - `en_US-lessac-medium.onnx.json`
4. Place both files in this directory

### Alternative Models:

You can also use other Piper models by changing the `modelUrl` and `configUrl` in the TTS configuration.

Popular options:
- `en_US-amy-medium` - Female voice
- `en_US-ryan-medium` - Male voice
- `en_US-libritts-high` - High quality (larger file)

### File Structure:
```
public/models/tts/
├── en_US-lessac-medium.onnx
├── en_US-lessac-medium.onnx.json
└── README.md (this file)
```

## Usage

Once the models are in place, the TTS system will automatically load them when initialized.
