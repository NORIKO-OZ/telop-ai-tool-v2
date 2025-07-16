class VideoConverter {
  // 最適化された音声抽出（短時間でサンプリング）
  async extractAudioFromVideo(videoFile: File): Promise<File> {
    try {
      return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const url = URL.createObjectURL(videoFile);
        
        video.src = url;
        video.muted = true;
        video.preload = 'metadata'; // メタデータのみ先読み
        
        video.onloadedmetadata = async () => {
          try {
            console.log(`Video duration: ${video.duration} seconds`);
            
            // 長い動画の場合は最初の30秒のみ処理
            const maxDuration = Math.min(video.duration, 30);
            
            const stream = (video as any).captureStream();
            const audioTracks = stream.getAudioTracks();
            
            if (audioTracks.length === 0) {
              throw new Error('No audio tracks found in video');
            }
            
            const audioStream = new MediaStream(audioTracks);
            const chunks: Blob[] = [];
            
            // 音質を下げて処理速度を向上
            const mediaRecorder = new MediaRecorder(audioStream, {
              mimeType: 'audio/webm;codecs=opus',
              audioBitsPerSecond: 64000 // 低ビットレート
            });
            
            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                chunks.push(event.data);
              }
            };
            
            mediaRecorder.onstop = () => {
              const audioBlob = new Blob(chunks, { type: 'audio/webm' });
              const audioFile = new File([audioBlob], `${videoFile.name.replace(/\.[^/.]+$/, '')}.webm`, {
                type: 'audio/webm',
              });
              
              URL.revokeObjectURL(url);
              resolve(audioFile);
            };
            
            mediaRecorder.onerror = (error) => {
              URL.revokeObjectURL(url);
              reject(error);
            };
            
            // 処理時間制限を設定
            const timeout = setTimeout(() => {
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
              }
            }, maxDuration * 1000);
            
            video.currentTime = 0;
            video.play();
            mediaRecorder.start();
            
            video.onended = () => {
              clearTimeout(timeout);
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
              }
            };
            
          } catch (error) {
            URL.revokeObjectURL(url);
            reject(error);
          }
        };
        
        video.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Video loading failed'));
        };
      });
    } catch (error) {
      console.error('Video audio extraction failed:', error);
      throw error;
    }
  }

  // 代替手段：Web Audio APIを使用したシンプルな音声抽出
  async extractAudioSimple(videoFile: File): Promise<File> {
    try {
      // 動画ファイルを直接Web Audio APIで処理するのは困難なため、
      // 実際にはブラウザで動画を再生して音声を録音する方法を使用
      return await this.extractAudioFromVideo(videoFile);
    } catch (error) {
      console.error('Simple audio extraction failed:', error);
      throw error;
    }
  }

  // メインの変換メソッド
  async convertMP4ToMP3(videoFile: File): Promise<File> {
    try {
      return await this.extractAudioFromVideo(videoFile);
    } catch (error) {
      console.error('MP4 to MP3 conversion failed:', error);
      throw error;
    }
  }

}

export const videoConverter = new VideoConverter();