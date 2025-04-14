import type { InputFile } from "grammy";

export interface VideoParams {
  inputSize: string;
  inputVideoSize: string;
  outputSize: string;
  outputVideoSize: string;
  pathToInput: string;
  pathToOutput: string;
}

export interface AnswerVideoMessage {
  video: InputFile;
  videoParams: VideoParams;
}

export interface OnlyVideoMessage {
    video: InputFile
    pathToInput: string;
    pathToOutput: string;
}