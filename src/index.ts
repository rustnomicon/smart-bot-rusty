import { Bot, Context, type CommandContext } from "grammy";
import * as fs from "fs";
import { handleVideoConvert, handleVideoEdit } from "./logic/video/video";



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
    bot.command("start", async (ctx) => {
        if (!ctx.message?.video) {
            await ctx.reply(
            `👋 *Привет!* Я *self-hosted* бот, созданный для поддержки сообществ.\n🔗 Подробнее: [Читать документацию](https://example.com/docs)`,
                { parse_mode: "Markdown" }
            );
            
        }
    });
    // Обработчик команды /ffmpeg без видео
    bot.command("ffmpeg", async (ctx) => {
        if (!ctx.message?.video) {
            await ctx.reply("Отправьте видео вместе с командой и флагами в формате:\n/ffmpeg [-vf scale=640:480 -c:v libx265 -crf 35 -b:v 100k -b:a 32k]");
        }
    });

    bot.command("convert", async (ctx) => {
        if (!ctx.message?.video) {
            await ctx.reply("Отправьте видео вместе с командой и форматом в который хотите сконвертировать видео в формате:\n/convert mp4");
        }
    })
    
    // Обработчик для видео
    bot.on("message:video", async (ctx) => {
        const caption = ctx.message?.caption || "";
        const text = ctx.message?.text || "";
    
        const hasFFmpegCommand = caption.startsWith("/ffmpeg") || text.startsWith("/ffmpeg");
        const hasConvertCommand = caption.startsWith("/convert") || text.startsWith("/convert");
        
        try {
            if (hasConvertCommand) {
                await handleConvertCommand(ctx, bot);
            } else if (hasFFmpegCommand) {
                await handleFFmpegCommand(ctx, bot);
            }
        } catch (error: unknown) {
            console.error(`Ошибка при обработке видео: ${error instanceof Error ? error.message : error}`);
        }
    });
    
    async function handleConvertCommand(ctx: Context, bot: Bot): Promise<void> {
        console.log(`Получено видео от ${ctx.from?.username} для конвертации`);
        
        const statusMsg = await ctx.reply("Начинаю обработку видео...");
        
        try {
            const messageStruct = await handleVideoConvert(ctx, bot);
            
            if (ctx.chat?.id && statusMsg.message_id) {
                await bot.api.editMessageText(
                    ctx.chat.id,
                    statusMsg.message_id,
                    "Видео обработано успешно!"
                );
            }
            
            await ctx.replyWithVideo(messageStruct.video);
            
            fs.unlinkSync(messageStruct.pathToInput);
            fs.unlinkSync(messageStruct.pathToOutput);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Ошибка обработки видео: ${errorMessage}`);
            
            if (ctx.chat?.id && statusMsg.message_id) {
                await bot.api.editMessageText(
                    ctx.chat.id,
                    statusMsg.message_id,
                    `Ошибка обработки видео: ${errorMessage}`
                );
            }
        }
    }
    
    async function handleFFmpegCommand(ctx: Context, bot: Bot): Promise<void> {
        console.log(`Получена команда /ffmpeg от ${ctx.from?.username}`);
        
        const statusMsg = await ctx.reply("Начинаю обработку видео...");
        
        try {
            const messageStruct = await handleVideoEdit(ctx, bot);
            
            if (ctx.chat?.id && statusMsg.message_id) {
                await bot.api.editMessageText(
                    ctx.chat.id,
                    statusMsg.message_id,
                    "Видео обработано успешно!"
                );
            }
            
            const infoText = `Исходное видео: ${messageStruct.videoParams.inputSize} (${messageStruct.videoParams.inputVideoSize})
    Обработанное видео: ${messageStruct.videoParams.outputSize} (${messageStruct.videoParams.outputVideoSize})`;
            
            await ctx.replyWithVideo(messageStruct.video, { caption: infoText });
            
            fs.unlinkSync(messageStruct.videoParams.pathToInput);
            fs.unlinkSync(messageStruct.videoParams.pathToOutput);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Ошибка обработки видео: ${errorMessage}`);
            
            if (ctx.chat?.id && statusMsg.message_id) {
                await bot.api.editMessageText(
                    ctx.chat.id,
                    statusMsg.message_id,
                    `Ошибка обработки видео: ${errorMessage}`
                );
            }
        }
    };

    // Запускаем бота
    bot.start();
    console.log("Бот запущен");
}

// Запускаем основную функцию
main().catch(console.error);

