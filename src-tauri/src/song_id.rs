#[cfg(windows)]
use std::collections::VecDeque;

use serde::Serialize;

#[derive(Serialize)]
pub struct SongResult {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub artwork: String,
    pub link: String,
}

#[tauri::command]
pub async fn recognize_now_playing(
    api_token: String,
    seconds: Option<u32>,
) -> Result<Option<SongResult>, String> {
    #[cfg(windows)]
    {
        let secs = seconds.unwrap_or(7).clamp(3, 15);
        let (pcm, sample_rate, channels, bits) =
            tauri::async_runtime::spawn_blocking(move || capture_loopback(secs))
                .await
                .map_err(|e| e.to_string())??;
        let wav = pcm_to_wav(&pcm, sample_rate, channels, bits)?;
        audd_recognize(wav, api_token).await
    }
    #[cfg(not(windows))]
    {
        let _ = (api_token, seconds);
        Err("Song identification is only supported on Windows for now".into())
    }
}

#[tauri::command]
pub async fn recognize_now_playing_ai(
    api_key: String,
    model: Option<String>,
    seconds: Option<u32>,
) -> Result<Option<SongResult>, String> {
    #[cfg(windows)]
    {
        let secs = seconds.unwrap_or(7).clamp(3, 15);
        let (pcm, sample_rate, channels, bits) =
            tauri::async_runtime::spawn_blocking(move || capture_loopback(secs))
                .await
                .map_err(|e| e.to_string())??;
        let wav = pcm_to_wav(&pcm, sample_rate, channels, bits)?;
        let model = model
            .filter(|m| !m.trim().is_empty())
            .unwrap_or_else(|| "gemini-2.0-flash".to_string());
        gemini_recognize(wav, api_key, model).await
    }
    #[cfg(not(windows))]
    {
        let _ = (api_key, model, seconds);
        Err("Song identification is only supported on Windows for now".into())
    }
}

#[cfg(windows)]
fn capture_loopback(seconds: u32) -> Result<(Vec<u8>, u32, u16, u16), String> {
    use wasapi::*;
    initialize_mta().ok().map_err(|e| format!("COM init failed: {e}"))?;

    let sample_rate = 44100u32;
    let channels = 2u16;
    let bits = 16u16;

    let device = get_default_device(&Direction::Render).map_err(|e| e.to_string())?;
    let mut audio_client = device.get_iaudioclient().map_err(|e| e.to_string())?;

    let format = WaveFormat::new(
        bits as usize,
        bits as usize,
        &SampleType::Int,
        sample_rate as usize,
        channels as usize,
        None,
    );

    let (_default_period, min_period) = audio_client.get_periods().map_err(|e| e.to_string())?;
    audio_client
        .initialize_client(&format, min_period, &Direction::Capture, &ShareMode::Shared, true)
        .map_err(|e| e.to_string())?;

    let h_event = audio_client.set_get_eventhandle().map_err(|e| e.to_string())?;
    let capture_client = audio_client.get_audiocaptureclient().map_err(|e| e.to_string())?;
    let blockalign = format.get_blockalign() as usize;

    audio_client.start_stream().map_err(|e| e.to_string())?;

    let target_bytes = sample_rate as usize * seconds as usize * blockalign;
    let mut queue: VecDeque<u8> = VecDeque::new();
    while queue.len() < target_bytes {
        capture_client
            .read_from_device_to_deque(&mut queue)
            .map_err(|e| e.to_string())?;
        if h_event.wait_for_event(2000).is_err() {
            break;
        }
    }
    audio_client.stop_stream().map_err(|e| e.to_string())?;

    let pcm: Vec<u8> = queue.into_iter().take(target_bytes).collect();
    Ok((pcm, sample_rate, channels, bits))
}

#[cfg(windows)]
fn pcm_to_wav(pcm: &[u8], sample_rate: u32, channels: u16, bits: u16) -> Result<Vec<u8>, String> {
    use hound::{SampleFormat, WavSpec, WavWriter};
    use std::io::Cursor;

    let spec = WavSpec {
        channels,
        sample_rate,
        bits_per_sample: bits,
        sample_format: SampleFormat::Int,
    };
    let mut cursor = Cursor::new(Vec::<u8>::new());
    {
        let mut writer = WavWriter::new(&mut cursor, spec).map_err(|e| e.to_string())?;
        for chunk in pcm.chunks_exact(2) {
            let s = i16::from_le_bytes([chunk[0], chunk[1]]);
            writer.write_sample(s).map_err(|e| e.to_string())?;
        }
        writer.finalize().map_err(|e| e.to_string())?;
    }
    Ok(cursor.into_inner())
}

#[cfg(windows)]
async fn audd_recognize(wav: Vec<u8>, api_token: String) -> Result<Option<SongResult>, String> {
    use reqwest::multipart::{Form, Part};

    let part = Part::bytes(wav)
        .file_name("clip.wav")
        .mime_str("audio/wav")
        .map_err(|e| e.to_string())?;
    let form = Form::new()
        .text("api_token", api_token)
        .text("return", "apple_music,spotify")
        .part("file", part);

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.audd.io/")
        .multipart(form)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if json["status"] != "success" {
        let msg = json["error"]["error_message"]
            .as_str()
            .unwrap_or("unknown error");
        return Err(format!("AudD: {msg}"));
    }

    let r = &json["result"];
    if r.is_null() {
        return Ok(None);
    }

    let title = r["title"].as_str().unwrap_or("").to_string();
    let artist = r["artist"].as_str().unwrap_or("").to_string();
    let album = r["album"].as_str().unwrap_or("").to_string();
    let link = r["song_link"].as_str().unwrap_or("").to_string();

    let mut artwork = String::new();
    if let Some(u) = r["apple_music"]["artwork"]["url"].as_str() {
        artwork = u.replace("{w}", "300").replace("{h}", "300");
    } else if let Some(u) = r["spotify"]["album"]["images"][0]["url"].as_str() {
        artwork = u.to_string();
    }

    Ok(Some(SongResult { title, artist, album, artwork, link }))
}

#[cfg(windows)]
async fn gemini_recognize(
    wav: Vec<u8>,
    api_key: String,
    model: String,
) -> Result<Option<SongResult>, String> {
    use base64::{engine::general_purpose::STANDARD as B64, Engine as _};

    let audio_b64 = B64.encode(&wav);
    let prompt = "You are a music identification engine. Identify the song playing in this audio clip. \
Respond with ONLY a JSON object of the form {\"artist\":\"...\",\"title\":\"...\",\"album\":\"...\"}. \
Use empty strings for fields you are unsure of. If you cannot identify any song, respond {\"artist\":\"\",\"title\":\"\"}.";

    let body = serde_json::json!({
        "contents": [{
            "parts": [
                { "text": prompt },
                { "inlineData": { "mimeType": "audio/wav", "data": audio_b64 } }
            ]
        }],
        "generationConfig": { "temperature": 0.0 }
    });

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );
    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = resp.status();
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        let msg = json["error"]["message"].as_str().unwrap_or("request failed");
        return Err(format!("Gemini: {msg}"));
    }

    let text = json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("")
        .trim()
        .to_string();
    if text.is_empty() {
        return Ok(None);
    }

    let mut cleaned = text.trim();
    if let Some(rest) = cleaned.strip_prefix("```json") {
        cleaned = rest.trim();
    } else if let Some(rest) = cleaned.strip_prefix("```") {
        cleaned = rest.trim();
    }
    if let Some(rest) = cleaned.strip_suffix("```") {
        cleaned = rest.trim();
    }

    let parsed: serde_json::Value =
        serde_json::from_str(cleaned).map_err(|e| format!("Gemini parse: {e}"))?;
    let title = parsed["title"].as_str().unwrap_or("").trim().to_string();
    let artist = parsed["artist"].as_str().unwrap_or("").trim().to_string();
    let album = parsed["album"].as_str().unwrap_or("").trim().to_string();
    if title.is_empty() && artist.is_empty() {
        return Ok(None);
    }

    Ok(Some(SongResult {
        title,
        artist,
        album,
        artwork: String::new(),
        link: String::new(),
    }))
}
