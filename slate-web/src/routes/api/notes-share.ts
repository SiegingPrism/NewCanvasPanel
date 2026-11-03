import { createFileRoute } from "@tanstack/react-router";

interface SharedNotesData {
  id: string;
  title: string;
  pdfBase64: string; // "data:application/pdf;base64,..." or raw base64
  createdAt: number;
}

// In-memory shared notes store persisting across devices during server session
const activeSharedNotes = new Map<string, SharedNotesData>();

export const Route = createFileRoute("/api/notes-share")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        const isDownload = url.searchParams.get("download") === "true";

        if (!id) {
          return new Response(JSON.stringify({ error: "Missing note id parameter" }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        const note = activeSharedNotes.get(id);
        if (!note) {
          return new Response(JSON.stringify({ error: "Shared note not found or expired" }), {
            status: 404,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        // Return binary PDF stream for direct file download
        if (isDownload) {
          const rawBase64 = note.pdfBase64.includes(",")
            ? note.pdfBase64.split(",")[1]
            : note.pdfBase64;
          const binaryString = atob(rawBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const safeFilename = `${(note.title || "Lesson_Notes").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

          return new Response(bytes, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${safeFilename}"`,
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        return new Response(
          JSON.stringify({
            id: note.id,
            title: note.title,
            pdfBase64: note.pdfBase64,
            downloadUrl: `/api/notes-share?id=${note.id}&download=true`,
            createdAt: note.createdAt,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      },

      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            id?: string;
            title?: string;
            pdfBase64?: string;
          };

          const id = body.id || `share-${Date.now().toString(36)}`;
          if (!body.pdfBase64) {
            return new Response(JSON.stringify({ error: "pdfBase64 content is required" }), {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }

          const record: SharedNotesData = {
            id,
            title: body.title || "Lesson Notes",
            pdfBase64: body.pdfBase64,
            createdAt: Date.now(),
          };

          activeSharedNotes.set(id, record);

          return new Response(
            JSON.stringify({
              success: true,
              id,
              downloadUrl: `/api/notes-share?id=${id}&download=true`,
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to store shared notes";
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
      },
    },
  },
});

