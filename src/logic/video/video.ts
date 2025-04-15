import { Bot, Context, InputFile } from "grammy";
import { bytesToMb } from "../../utils/conv";
import * as fs from "fs";
import { exec } from "child_process";
import type { AnswerVideoMessage, OnlyVideoMessage } from "./video.types";
import { promisify as utilPromisify } from "util";

const execAsync = utilPromisify(exec);

// Функция для конвертации видео handleVideoConvert
export async function handleVideoConvert(
    ctx: Context,
    bot: Bot
  ): Promise<OnlyVideoMessage> {
    const username = ctx.from?.username || "user";
    

    console.log(`Загружаем видео от ${username}`);

    // Проверяем наличие видео в сообщении
    if (!ctx.message?.video) {
        throw new Error("Видео не найдено в сообщении");
    }

    const video = ctx.message.video;
    const fileId = video.file_id;

    // Получаем информацию о файле
    const fileInfo = await bot.api.getFile(fileId);
    if (!fileInfo.file_path) {
        throw new Error("Не удалось получить путь к файлу");
    }

    const ext = fileInfo.file_path.split('.').pop(); // "mp4", "webm" и т.д.

    if (!ext) {
    throw new Error("Не удалось определить формат видео");
    }
    const inputPath = `temp/input-${username}.${ext}`;
    // Формируем URL для скачивания файла
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${fileInfo.file_path}`;

    // Скачиваем файл
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(inputPath, Buffer.from(buffer));

    // Получаем аргументы из подписи к видео
    const caption = ctx.message.caption || "";
    const convertFormat = caption.split(" ").filter((tag: string) => tag !== "/convert")[0] || "mp4";
    console.log("Формат для конвератции:", convertFormat)
    const outputPath = `temp/output-${username}.${convertFormat}`;
    const proc = Bun.spawn(["ffmpeg", "-y", "-i", inputPath, outputPath], {
      stdout: "pipe",
      stderr: "pipe",
    });
  
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
  
    if (exitCode !== 0) {
      console.error("Ошибка ffmpeg:\n", stderr);
      throw new Error(`ffmpeg завершился с кодом ${exitCode}`);
    }
  
    // Возвращаем файл для отправки
    return {
      video: new InputFile(outputPath),
      pathToInput: inputPath,
      pathToOutput: outputPath
    };
  }
  
// Функция для обработки видео
export async function handleVideoEdit(ctx: Context, bot: Bot): Promise<AnswerVideoMessage> {
    const username = ctx.from?.username || "user";
    const inputPath = `temp/input-${username}.mp4`;
    const outputPath = `temp/output-${username}.mp4`;

    console.log(`Загружаем видео от ${username}`);

    // Проверяем наличие видео в сообщении
    if (!ctx.message?.video) {
        throw new Error("Видео не найдено в сообщении");
    }

    const video = ctx.message.video;
    const fileId = video.file_id;

    // Получаем информацию о файле
    const fileInfo = await bot.api.getFile(fileId);
    if (!fileInfo.file_path) {
        throw new Error("Не удалось получить путь к файлу");
    }

    // Формируем URL для скачивания файла
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${fileInfo.file_path}`;

    // Скачиваем файл
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(inputPath, Buffer.from(buffer));

    // Получаем аргументы из подписи к видео
    const caption = ctx.message.caption || "";
    const tags = caption.split(" ").filter((tag: string) => tag !== "/ffmpeg");

    console.log(`Флаги: ${tags.join(" ")}`);

    // Создаем команду ffmpeg с правильными аргументами
    const ffmpegArgs = ["-i", inputPath, ...tags, outputPath].join(" ");

    try {
        console.log(`Выполняем команду: ffmpeg ${ffmpegArgs}`);
        await execAsync(`ffmpeg ${ffmpegArgs}`);

        // Проверяем существование выходного файла
        if (!fs.existsSync(outputPath)) {
            throw new Error("Выходной файл не создан");
        }

        // Получаем размер выходного файла
        const outputStats = fs.statSync(outputPath);
        const outputSize = outputStats.size;

        // Получаем размеры выходного видео
        const { stdout: metaOut } = await execAsync(
            `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 ${outputPath}`
        );
        const outputVideoSize = metaOut.trim() || "неизвестно";

        // Создаем объект с результатами
        return {
            video: new InputFile(outputPath),
            videoParams: {
                inputSize: bytesToMb(video.file_size || 0),
                inputVideoSize: `${video.width}x${video.height}`,
                outputSize: bytesToMb(outputSize),
                outputVideoSize,
                pathToInput: inputPath,
                pathToOutput: outputPath,
            },
        };
    } catch (error) {
        console.error(`Ошибка обработки видео: ${error}`);
        throw new Error(`Ошибка обработки видео: ${error}`);
    }
}
