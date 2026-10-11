import { describe, it, expect } from "vitest";
import { emptyMetaShape, emptyFullPersist, loadInitialSync } from "./slateStorage";

describe("slateStorage", () => {
  it("initializes empty meta shape with required fields", () => {
    const meta = emptyMetaShape();
    expect(meta.boards).toEqual({});
    expect(meta.boardOrder).toEqual([]);
    expect(meta.folders).toEqual([]);
    expect(meta.recentAI).toEqual([]);
  });

  it("initializes full persist shape including boardData", () => {
    const full = emptyFullPersist();
    expect(full.boardData).toEqual({});
    expect(full.boards).toEqual({});
  });

  it("loads gracefully even when localStorage is empty", () => {
    const initial = loadInitialSync();
    expect(initial).toBeDefined();
    expect(typeof initial.boards).toBe("object");
  });

  it("restores emergency backup boards from slate_b_<id>", () => {
    const mockBoardData = {
      pages: [{ id: "p1", objects: [], background: "white" as const }],
      activePageId: "p1",
    };
    const store: Record<string, string> = {
      slate_b_emerg123: JSON.stringify(mockBoardData),
    };
    const mockLocalStorage = {
      get length() {
        return Object.keys(store).length;
      },
      key: (i: number) => Object.keys(store)[i] || null,
      getItem: (k: string) => store[k] || null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    };

    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = mockLocalStorage;

    const initial = loadInitialSync();
    expect(initial.boardData["emerg123"]).toEqual(mockBoardData);

    delete (globalThis as any).window;
  });

  it("saveBoardChat sanitizes imageDataUrl and sets hasSnapshot", async () => {
    const { saveBoardChat } = await import("./slateStorage");
    let putKey = "";
    let putVal: any = null;

    const mockDB = {
      transaction: () => ({
        objectStore: () => ({
          put: (val: any, key: string) => {
            putKey = key;
            putVal = val;
          },
          openCursor: () => {
            const creq: any = {};
            setTimeout(() => {
              creq.result = null;
              if (creq.onsuccess) creq.onsuccess({ target: creq });
            }, 0);
            return creq;
          },
        }),
      }),
    };

    (globalThis as any).window = globalThis;
    (globalThis as any).indexedDB = {
      open: () => {
        const req: any = {};
        setTimeout(() => {
          req.result = mockDB;
          if (req.onsuccess) req.onsuccess({ target: req });
        }, 0);
        return req;
      },
    };

    const messages = [
      { id: "m1", role: "user", content: "Solve this", imageDataUrl: "data:image/jpeg;base64,12345" },
      { id: "m2", role: "assistant", content: "Here is the solution" },
    ];

    await saveBoardChat("board123", messages);

    expect(putKey).toBe("chat_board123");
    expect(putVal[0].imageDataUrl).toBeUndefined();
    expect(putVal[0].hasSnapshot).toBe(true);
    expect(putVal[1].content).toBe("Here is the solution");

    delete (globalThis as any).window;
    delete (globalThis as any).indexedDB;
  });

  it("clearAllBoardChats removes all chat keys from localStorage", async () => {
    const { clearAllBoardChats } = await import("./slateStorage");
    const store: Record<string, string> = {
      slate_chat_b1: "[]",
      slate_chat_b2: "[]",
      board_data: "keep_this",
    };
    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = {
      get length() {
        return Object.keys(store).length;
      },
      key: (i: number) => Object.keys(store)[i] || null,
      removeItem: (k: string) => {
        delete store[k];
      },
    };
    (globalThis as any).indexedDB = {
      open: () => {
        const req: any = {};
        setTimeout(() => {
          req.result = {
            transaction: () => ({
              objectStore: () => ({
                openCursor: () => {
                  const creq: any = {};
                  setTimeout(() => {
                    creq.result = null;
                    if (creq.onsuccess) creq.onsuccess({ target: creq });
                  }, 0);
                  return creq;
                },
              }),
            }),
          };
          if (req.onsuccess) req.onsuccess({ target: req });
        }, 0);
        return req;
      },
    };

    await clearAllBoardChats();
    expect(store["slate_chat_b1"]).toBeUndefined();
    expect(store["slate_chat_b2"]).toBeUndefined();
    expect(store["board_data"]).toBe("keep_this");

    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
    delete (globalThis as any).indexedDB;
  });
});
