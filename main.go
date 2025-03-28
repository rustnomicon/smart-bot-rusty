package main

import (
	"fmt"
	"github.com/joho/godotenv"
	tele "gopkg.in/telebot.v4"
	"log"
	"os"
	"smart-bot/services"
	"strings"
	"time"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	logFile, err := os.OpenFile("bot.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0666)
	log.SetOutput(logFile)
	pref := tele.Settings{
		Token:  os.Getenv("TELEGRAM_TOKEN"),
		Poller: &tele.LongPoller{Timeout: 10 * time.Second},
	}
	bot, err := tele.NewBot(pref)

	if err != nil {
		log.Fatal(err)
		return
	}

	bot.Handle("/ffmpeg", func(c tele.Context) error {
		if c.Message().Video == nil {
			err := c.Reply("Отправьте видео вместе с командой /ffmpeg")
			if err != nil {
				log.Println(err)
				return err
			}
		}
		return nil
	})

	bot.Handle(tele.OnVideo, func(c tele.Context) error {
		// Проверяем наличие команды /ffmpeg в подписи к видео или в тексте сообщения
		hasFFmpegCommand := false
		if c.Message().Caption != "" && strings.HasPrefix(c.Message().Caption, "/ffmpeg") {
			log.Println(c.Message().Caption)
			hasFFmpegCommand = true
		} else if c.Message().Text != "" && strings.HasPrefix(c.Message().Text, "/ffmpeg") {
			hasFFmpegCommand = true
		}

		if hasFFmpegCommand {
			log.Printf("Получена команда /ffmpeg от %s", c.Sender().Username)

			// Отправляем сообщение о начале обработки
			statusMsg, err := c.Bot().Send(c.Recipient(), "Начинаю обработку видео...")
			if err != nil {
				log.Println("Ошибка отправки статусного сообщения:", err)
			}

			messageStruct, err := services.HandleVideoEdit(c, bot)
			if err != nil {
				log.Println("Ошибка обработки видео:", err)
				if statusMsg != nil {
					_, _ = c.Bot().Edit(statusMsg, "Ошибка обработки видео: "+err.Error())
				}
				return err
			}

			// Обновляем статусное сообщение
			if statusMsg != nil {
				_, _ = c.Bot().Edit(statusMsg, "Видео обработано успешно!")
			}

			// Формируем информационное сообщение
			infoText := fmt.Sprintf(
				"Исходное видео: %s (%s)\nОбработанное видео: %s (%s)",
				messageStruct.VideoParams.InputSize,
				messageStruct.VideoParams.InputVideoSize,
				messageStruct.VideoParams.OutputSize,
				messageStruct.VideoParams.OutputVideoSize,
			)

			// Отправляем видео с информацией
			_, err = c.Bot().Send(c.Recipient(), &messageStruct.Video, infoText)
			if err != nil {
				log.Println("Ошибка отправки обработанного видео:", err)
				return err
			}
			_, err = c.Bot().Send(c.Recipient(), infoText)
			if err != nil {
				log.Println("Ошибка отправки текста к видео:", err)
				return err
			}
			err = os.Remove(messageStruct.VideoParams.PathToInput)
			if err != nil {
				log.Println(err)
			}
			err = os.Remove(messageStruct.VideoParams.PathToOutput)
			if err != nil {
				log.Println(err)
			}

			return nil
		}

		return nil
	})

	bot.Start()
}
