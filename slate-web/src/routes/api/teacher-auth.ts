import { createFileRoute } from "@tanstack/react-router";

interface TeacherAuthSession {
  token: string;
  approved: boolean;
  teacherName?: string;
  email?: string;
  createdAt: number;
}

const activeAuthSessions = new Map<string, TeacherAuthSession>();

export const Route = createFileRoute("/api/teacher-auth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");

        if (!token) {
          return new Response(JSON.stringify({ error: "Token required" }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        const session = activeAuthSessions.get(token);
        if (!session) {
          return new Response(JSON.stringify({ approved: false, pending: true }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        return new Response(
          JSON.stringify({
            token: session.token,
            approved: session.approved,
            teacherName: session.teacherName || "Teacher",
            email: session.email || "teacher@school.edu",
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
            action?: "create" | "approve";
            token?: string;
            teacherName?: string;
            email?: string;
          };

          const token = body.token;
          if (!token) {
            return new Response(JSON.stringify({ error: "Token is required" }), {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }

          if (body.action === "create") {
            const session: TeacherAuthSession = {
              token,
              approved: false,
              createdAt: Date.now(),
            };
            activeAuthSessions.set(token, session);
            return new Response(JSON.stringify({ success: true, token }), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }

          if (body.action === "approve") {
            const session: TeacherAuthSession = {
              token,
              approved: true,
              teacherName: body.teacherName || "Classroom Teacher",
              email: body.email || "teacher@school.edu",
              createdAt: Date.now(),
            };
            activeAuthSessions.set(token, session);
            return new Response(JSON.stringify({ success: true, approved: true }), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }

          return new Response(JSON.stringify({ error: "Invalid action" }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Auth server error";
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

