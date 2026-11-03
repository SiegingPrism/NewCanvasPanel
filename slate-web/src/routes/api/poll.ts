import { createFileRoute } from "@tanstack/react-router";

interface PollData {
  id: string;
  question: string;
  options: string[];
  votes: number[];
  correctIndex?: number;
  createdAt: number;
}

// In-memory poll store persisting during server session across devices
const activePolls = new Map<string, PollData>();

export const Route = createFileRoute("/api/poll")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const pollId = url.searchParams.get("id");

        if (!pollId) {
          return new Response(JSON.stringify({ error: "Missing poll id parameter" }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        const poll = activePolls.get(pollId);
        if (!poll) {
          return new Response(
            JSON.stringify({
              id: pollId,
              question: "Classroom Live Question",
              options: ["Option A", "Option B", "Option C", "Option D"],
              votes: [0, 0, 0, 0],
              total: 0,
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }

        const total = poll.votes.reduce((a, b) => a + b, 0);
        return new Response(
          JSON.stringify({
            ...poll,
            total,
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
            action?: "create" | "vote" | "reset";
            pollId?: string;
            question?: string;
            options?: string[];
            correctIndex?: number;
            optionIndex?: number;
          };

          const pollId = body.pollId;
          if (!pollId) {
            return new Response(JSON.stringify({ error: "pollId required" }), {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }

          if (body.action === "create") {
            const options =
              Array.isArray(body.options) && body.options.length > 0
                ? body.options
                : ["Option A", "Option B", "Option C", "Option D"];

            const existing = activePolls.get(pollId);
            const votes =
              existing && existing.votes.length === options.length
                ? existing.votes
                : new Array(options.length).fill(0);

            const newPoll: PollData = {
              id: pollId,
              question: body.question || "Classroom Live Question",
              options,
              votes,
              correctIndex: body.correctIndex,
              createdAt: Date.now(),
            };
            activePolls.set(pollId, newPoll);

            return new Response(JSON.stringify({ success: true, poll: newPoll }), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }

          if (body.action === "vote") {
            let poll = activePolls.get(pollId);
            if (!poll) {
              poll = {
                id: pollId,
                question: body.question || "Classroom Live Question",
                options: body.options || ["Option A", "Option B", "Option C", "Option D"],
                votes: [0, 0, 0, 0],
                correctIndex: body.correctIndex,
                createdAt: Date.now(),
              };
              activePolls.set(pollId, poll);
            }

            const optIdx = body.optionIndex;
            if (typeof optIdx === "number" && optIdx >= 0 && optIdx < poll.options.length) {
              if (poll.votes.length !== poll.options.length) {
                poll.votes = new Array(poll.options.length).fill(0);
              }
              poll.votes[optIdx] = (poll.votes[optIdx] || 0) + 1;
            }

            const total = poll.votes.reduce((a, b) => a + b, 0);
            return new Response(JSON.stringify({ success: true, votes: poll.votes, total }), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }

          if (body.action === "reset") {
            const poll = activePolls.get(pollId);
            if (poll) {
              poll.votes = new Array(poll.options.length).fill(0);
            }
            return new Response(JSON.stringify({ success: true, votes: poll ? poll.votes : [] }), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }

          return new Response(JSON.stringify({ error: "Unknown action" }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Poll server error";
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

