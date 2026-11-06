import { describe, it, expect } from "vitest";
import { findLanguage, languageTagFor } from "./recognizer";
import { matchItems, searchableItems } from "@/components/whiteboard/FindOnBoard";

describe("languageTagFor (phone language → ML Kit model)", () => {
  it.each([
    ["en-US", "en-US"],
    ["en-IN", "en-IN"],
    ["en_GB", "en-GB"],
    ["en-NZ", "en-US"],
    ["hi-IN", "hi-IN"],
    ["mr", "mr-IN"],
    ["ja", "ja"],
    ["ja-JP", "ja"],
    ["ru", "ru"],
    ["ru-RU", "ru"],
    ["zh-TW", "zh-Hani-TW"],
    ["zh-Hans-CN", "zh-Hani-CN"],
    ["xx-YY", "en-US"],
    ["", "en-US"],
  ])("%s → %s", (input, out) => expect(languageTagFor(input)).toBe(out));
});

describe("findLanguage resolution", () => {
  it("resolves Japanese and Russian properly", () => {
    const ja = findLanguage("ja");
    expect(ja.code).toBe("ja");
    expect(ja.mlkitTag).toBe("ja");

    const jaJp = findLanguage("ja-JP");
    expect(jaJp.code).toBe("ja");
    expect(jaJp.mlkitTag).toBe("ja");

    const ru = findLanguage("ru");
    expect(ru.code).toBe("ru");
    expect(ru.mlkitTag).toBe("ru");

    const ruRu = findLanguage("ru-RU");
    expect(ruRu.code).toBe("ru");
    expect(ruRu.mlkitTag).toBe("ru");
  });

  it("shows every Indian language in its usual script (online recognition reads them all)", () => {
    expect(findLanguage("ks-IN").nativeName).toBe("كٲشُر");
    expect(findLanguage("sd-IN").nativeName).toBe("سنڌي");
    expect(findLanguage("sat-IN").nativeName).toBe("ᱥᱟᱱᱛᱟᱲᱤ");
    expect(findLanguage("mni-IN").name).toBe("Manipuri");
  });
});

describe("find on board", () => {
  const stroke = (id: string, x: number, extra: object = {}) => ({
    id,
    kind: "pen",
    color: "#000",
    size: 3,
    points: [
      { x, y: 100 },
      { x: x + 10, y: 120 },
    ],
    ...extra,
  });
  const objects = [
    stroke("s1", 100, { inkGroup: "g1", inkText: "photosynthesis" }),
    stroke("s2", 115, { inkGroup: "g1" }),
    stroke("s3", 400),
    {
      id: "t1",
      kind: "text",
      x: 10,
      y: 300,
      w: 100,
      h: 30,
      text: "Light reaction",
      color: "#000",
      fontSize: 18,
    },
  ] as never[];
  const bounds = (o: { x?: number; y?: number; w?: number; h?: number }) => ({
    x: o.x ?? 0,
    y: o.y ?? 0,
    w: o.w ?? 0,
    h: o.h ?? 0,
  });

  it("finds recognised handwriting and spans the whole word", () => {
    const hits = matchItems(searchableItems(objects, bounds as never), "photo");
    expect(hits).toHaveLength(1);
    expect(hits[0].handwriting).toBe(true);
    expect(hits[0].rect).toEqual({ x: 100, y: 100, w: 25, h: 20 });
  });
  it("finds typed text, case-insensitive, all words", () => {
    expect(
      matchItems(searchableItems(objects, bounds as never), "LIGHT react").map((h) => h.key),
    ).toEqual(["t1"]);
    expect(matchItems(searchableItems(objects, bounds as never), "light dark")).toEqual([]);
  });
});

describe("Ink settings defaults", () => {
  it("defaults livePreview to true and autoType to false to protect drawings", async () => {
    const { useInk } = await import("./recognizer");
    const state = useInk.getState();
    expect(state.livePreview).toBe(true);
    expect(state.autoType).toBe(false);
  });
});

describe("Slate Translate selection decoupling", () => {
  it("does not overwrite live translateTo when translating a selection", async () => {
    const { useInk } = await import("./recognizer");
    useInk.getState().setTranslateTo("hi-IN");
    expect(useInk.getState().translateTo).toBe("hi-IN");

    let pickedCode = "";
    useInk.getState().openTranslatePicker((code) => {
      pickedCode = code;
    });

    expect(useInk.getState().translatePickerOpen).toBe(true);
    expect(useInk.getState().translatePickerForSelection).toBe(true);

    // User picks French for selection translation
    const changedLive = useInk.getState().chooseTranslateLanguage("fr-FR");
    expect(changedLive).toBe(false);
    expect(pickedCode).toBe("fr-FR");
    // Crucial: live translation setting must remain untouched!
    expect(useInk.getState().translateTo).toBe("hi-IN");
    expect(useInk.getState().translatePickerOpen).toBe(false);
    expect(useInk.getState().translatePickerForSelection).toBe(false);
  });

  it("updates live translateTo when chosen from pen menu or settings", async () => {
    const { useInk } = await import("./recognizer");
    useInk.getState().setTranslateTo("hi-IN");

    // Opened from pen menu / toolbar (no callback provided)
    useInk.getState().openTranslatePicker();
    expect(useInk.getState().translatePickerOpen).toBe(true);
    expect(useInk.getState().translatePickerForSelection).toBe(false);

    const changedLive = useInk.getState().chooseTranslateLanguage("es-ES");
    expect(changedLive).toBe(true);
    expect(useInk.getState().translateTo).toBe("es-ES");
    expect(useInk.getState().translatePickerOpen).toBe(false);
  });
});
