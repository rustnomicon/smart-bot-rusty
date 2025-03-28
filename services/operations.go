package services

import "fmt"

// 12121 -> 10.0mb
func BytesToMb(b uint64) string {
	outputSizeMb := float64(b) / (1024 * 1024)
	return fmt.Sprintf("%.2f MB (%d bytes)", outputSizeMb, b)
}
