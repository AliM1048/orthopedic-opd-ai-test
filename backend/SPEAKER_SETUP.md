# Speaker Diarization Setup Instructions

To enable speaker identification, you need to set up authentication with Hugging Face:

1. Install the Hugging Face CLI:
   ```bash
   pip install huggingface_hub
   ```

2. Login to Hugging Face:
   ```bash
   huggingface-cli login
   ```
   Follow the prompts to authenticate.

3. Accept the model license:
   - Go to: https://huggingface.co/pyannote/speaker-diarization
   - Click "Accept license" if required

4. The app will automatically use speaker diarization once authenticated.

Note: If authentication fails, the app will still work but without speaker identification (will show "unknown" as speaker ID).