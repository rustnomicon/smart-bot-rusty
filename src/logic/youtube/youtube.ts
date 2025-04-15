import { YtDlp } from '@yemreak/yt-dlp';
import fs from 'fs';
import path from 'path';

const config = {
    downloadDir: 'temp/',
    youtubeRegex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
}
if (!fs.existsSync(config.downloadDir)) {
  fs.mkdirSync(config.downloadDir, { recursive: true });
}

// Инициализация yt-dlp
const ytDlp = new YtDlp({ workdir: config.downloadDir });

export function isYoutubeUrl(url: string): boolean {
  return config.youtubeRegex.test(url);
}

/**
 * Извлекает ID видео из YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const match = url.match(config.youtubeRegex);
  return match ? match[1] : null;
}

/**
 * Скачивает видео с YouTube
 */
export async function downloadVideo(url: string): Promise<string[] | null> {
    try {
        const result = await ytDlp.download({
            url,
        });

        return result;
    } catch (error) {
        console.error('Ошибка при скачивании видео:', error);
        return null;
    }
}

/**
 * Получает информацию о видео
 */
export async function getVideoInfo(url: string): Promise<any> {
  try {
    const info = await ytDlp.retrieveMediaInfoList(url);
    return info;
  } catch (error) {
    console.error('Ошибка при получении информации о видео:', error);
    return null;
  }
}

/**
 * Удаляет файл после отправки
 */
export function cleanupFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Файл ${filePath} удален`);
    }
  } catch (error) {
    console.error('Ошибка при удалении файла:', error);
  }
}
