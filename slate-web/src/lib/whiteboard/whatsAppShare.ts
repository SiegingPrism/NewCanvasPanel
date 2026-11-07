export interface WhatsAppShareOptions {
  boardTitle?: string;
  className?: string;
  subject?: string;
  date?: string;
  shareUrl?: string;
  summary?: string;
  language?: "en" | "hi" | "mr";
}

/**
 * Builds and opens a WhatsApp message link to easily share daily classroom notes
 * with parent and student WhatsApp groups.
 */
export function shareNotesToWhatsApp(options: WhatsAppShareOptions = {}): string {
  const lang = options.language || "en";
  const title = options.boardTitle || "Classroom Whiteboard Notes";
  const dateStr = options.date || new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const url = options.shareUrl || (typeof window !== "undefined" ? window.location.href : "");

  let text = "";
  if (lang === "hi") {
    text = `📚 *दैनिक कक्षा नोट्स और सारांश (Daily Class Notes)*\n` +
      `🏫 *विषय (Subject):* ${options.subject || title}\n` +
      `🗓️ *दिनांक (Date):* ${dateStr}\n` +
      (options.summary ? `📝 *मुख्य बिंदु:* ${options.summary}\n` : "") +
      `🔗 *नोट्स देखें और डाउनलोड करें:* ${url}\n\n` +
      `_Slate Smart Board द्वारा साझा किया गया_`;
  } else if (lang === "mr") {
    text = `📚 *दैनंदिन वर्ग नोट्स आणि सारांश (Daily Class Notes)*\n` +
      `🏫 *विषय (Subject):* ${options.subject || title}\n` +
      `🗓️ *दिनांक (Date):* ${dateStr}\n` +
      (options.summary ? `📝 *महत्त्वाचे मुद्दे:* ${options.summary}\n` : "") +
      `🔗 *नोट्स पहा आणि सेव्ह करा:* ${url}\n\n` +
      `_Slate Smart Board द्वारे पाठवले_`;
  } else {
    text = `📚 *Daily Classroom Notes & Lesson Summary*\n` +
      `🏫 *Class / Subject:* ${options.subject || title}\n` +
      `🗓️ *Date:* ${dateStr}\n` +
      (options.summary ? `📝 *Key Topics Covered:* ${options.summary}\n` : "") +
      `🔗 *View Interactive Notes & PDF:* ${url}\n\n` +
      `_Shared directly from Slate Interactive Smart Board_`;
  }

  const encoded = encodeURIComponent(text);
  const waUrl = `https://wa.me/?text=${encoded}`;

  if (typeof window !== "undefined") {
    // Attempt opening in new window / WhatsApp app
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  return waUrl;
}
