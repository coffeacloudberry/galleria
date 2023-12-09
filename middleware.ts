import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const __dirname = ".";

export function middleware(req: NextRequest) {
    const urlComponents = req.url.split("?");
    return urlComponents.length > 1
        ? NextResponse.redirect(urlComponents[0])
        : NextResponse.next();
}
