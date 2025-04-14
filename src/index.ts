import { Api, Bot, Context, InputFile, type RawApi } from "grammy";
import * as fs from "fs";
import { handleVideoEdit } from "./logic/video/video";



// Основная функция
async function main() {
    // Настраиваем логирование
    const logFile = fs.createWriteStream("bot.log", { flags: "a" });
    console.log = function (...args) {
        const message = args.join(" ");
        logFile.write(`${new Date().toISOString()} - ${message}\n`);
        process.stdout.write(`${message}\n`);
    };

    // Получаем токен из переменных окружения
    const token = Bun.env.TELEGRAM_TOKEN;

    if (!token) {
        console.error("TELEGRAM_TOKEN не найден в переменных окружения");
        process.exit(1);
    }

    // Создаем экземпляр бота
    const bot = new Bot(token);

    // Обработчик команды /ffmpeg без видео
    bot.command("ffmpeg", async (ctx) => {
        if (!ctx.message?.video) {
            await ctx.reply("Отправьте видео вместе с командой /ffmpeg");
        }
    });

    // Обработчик для видео
    bot.on("message:video", async (ctx) => {
        const caption = ctx.message.caption || "";
        const text = ctx.message.text || "";

        // Проверяем наличие команды /ffmpeg в подписи или тексте
        const hasFFmpegCommand = caption.startsWith("/ffmpeg") || text.startsWith("/ffmpeg");

        if (hasFFmpegCommand) {
            console.log(`Получена команда /ffmpeg от ${ctx.from.username}`);

            // Отправляем сообщение о начале обработки
            const statusMsg = await ctx.reply("Начинаю обработку видео...");

            try {
                const messageStruct = await handleVideoEdit(ctx, bot);

                // Обновляем статусное сообщение
                await bot.api.editMessageText(
                    ctx.chat.id,
                    statusMsg.message_id,
                    "Видео обработано успешно!"
                );

                // Формируем информационное сообщение
                const infoText = `Исходное видео: ${messageStruct.videoParams.inputSize} (${messageStruct.videoParams.inputVideoSize})
  Обработанное видео: ${messageStruct.videoParams.outputSize} (${messageStruct.videoParams.outputVideoSize})`;

                // Отправляем видео с информацией
                await ctx.replyWithVideo(messageStruct.video, { caption: infoText });

                // Удаляем временные файлы
                fs.unlinkSync(messageStruct.videoParams.pathToInput);
                fs.unlinkSync(messageStruct.videoParams.pathToOutput);
            } catch (error) {
                console.error(`Ошибка обработки видео: ${error}`);

                // Обновляем статусное сообщение с ошибкой
                await bot.api.editMessageText(
                    ctx.chat.id,
                    statusMsg.message_id,
                    `Ошибка обработки видео: ${error}`
                );
            }
        }
    });

    // Запускаем бота
    bot.start();
    console.log("Бот запущен");
}

// Запускаем основную функцию
main().catch(console.error);

