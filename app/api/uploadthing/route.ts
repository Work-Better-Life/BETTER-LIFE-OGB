import { createRouteHandler } from "uploadthing/next";
import { uploadRouter } from "@/lib/uploadthing";

// UploadThing's endpoint: the browser asks it to start an upload, and
// UploadThing's servers call it back when a file has arrived. Authentication
// happens inside the router (see lib/uploadthing.ts), and proxy.ts lets this
// path through because the callback carries no login cookie.
export const { GET, POST } = createRouteHandler({ router: uploadRouter });
