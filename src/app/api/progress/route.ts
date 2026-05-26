import {
  handleProgressGet,
  handleProgressPost,
} from "@/server/progress/progress.service";

export async function GET(request: Request) {
  return handleProgressGet(request);
}

export async function POST(request: Request) {
  return handleProgressPost(request);
}
