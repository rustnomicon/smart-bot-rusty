package services

import (
	"bytes"
	"fmt"
	tele "gopkg.in/telebot.v4"
	"log"
	"os"
	"os/exec"
	"strings"
)

type videoParams struct {
	InputSize       string // 16mb
	InputVideoSize  string // HxW
	OutputSize      string
	OutputVideoSize string
	PathToInput     string
	PathToOutput    string
}
type AnswerVideoMessage struct {
	Video       tele.Video
	VideoParams videoParams
}

func HandleVideoEdit(c tele.Context, bot *tele.Bot) (answ AnswerVideoMessage, e error) {
	inputPath := fmt.Sprintf("input-%s.mp4", c.Sender().Username)
	outputPath := fmt.Sprintf("output-%s.mp4", c.Sender().Username)
	log.Printf("Загружаем видео от %s", c.Sender().Username)
	video := c.Message().Video
	err := bot.Download(video.MediaFile(), inputPath)
	if err != nil {
		log.Println("Видео не установлено по причине: ", err)
		return AnswerVideoMessage{}, fmt.Errorf("Oшибка загрузки видео: %w", err)
	}
	tags := strings.Split(c.Message().Caption, " ")
	for i, tag := range tags {
		if tag == "/ffmpeg" {
			tags = append(tags[:i], tags[i+1:]...)
			break
		}
	}
	log.Printf("Флаги: %v", tags)

	// Создаем команду ffmpeg с правильными аргументами
	cmd := exec.Command("ffmpeg")
	cmd.Args = append(cmd.Args, "-i", inputPath)
	cmd.Args = append(cmd.Args, tags...)
	cmd.Args = append(cmd.Args, outputPath)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	log.Printf("Выполняем команду: %v", cmd.Args)

	if err := cmd.Run(); err != nil {
		log.Printf("Ошибка обработки видео: %v, stderr: %s", err, stderr.String())
		return AnswerVideoMessage{}, fmt.Errorf("ошибка обработки видео: %w", err)
	}

	log.Printf("Результат выполнения: %s", stdout.String())

	// Проверяем существование выходного файла
	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		return AnswerVideoMessage{}, fmt.Errorf("выходной файл не создан")
	}

	// Получаем размер выходного файла
	fileInfo, err := os.Stat(outputPath)
	var outputSize int64
	if err == nil {
		outputSize = fileInfo.Size()
	}

	// Получаем размеры выходного видео
	metaCmd := exec.Command("ffprobe",
		"-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=width,height",
		"-of", "csv=s=x:p=0",
		outputPath)
	var metaOut bytes.Buffer
	metaCmd.Stdout = &metaOut
	outputVideoSize := "неизвестно"
	if err := metaCmd.Run(); err == nil {
		outputVideoSize = strings.TrimSpace(metaOut.String())
	}

	// Отправляем обработанное видео
	videoFile := &tele.Video{File: tele.FromDisk(outputPath)}
	return AnswerVideoMessage{
		Video: *videoFile,
		VideoParams: videoParams{
			InputSize:       BytesToMb(uint64(video.FileSize)),
			InputVideoSize:  fmt.Sprintf("%dx%d", video.Width, video.Height),
			OutputSize:      BytesToMb(uint64(outputSize)),
			OutputVideoSize: outputVideoSize,
			PathToInput:     inputPath,
			PathToOutput:    outputPath,
		},
	}, nil
}
