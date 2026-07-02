import { Injectable } from "@nestjs/common";

@Injectable()
export class CleanProcessor {
  clean(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/[^\S\n]+/g, " ")
      .replace(/\u0000/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
}
