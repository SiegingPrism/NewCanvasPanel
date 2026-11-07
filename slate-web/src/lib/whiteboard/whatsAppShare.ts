export interface WhatsAppShareOptions {
  boardTitle?: string;
  className?: string;
  subject?: string;
  date?: string;
  shareUrl?: string; // Must be a real public link (not localhost)
  summary?: string;
  language?: "en" | "hi" | "mr";
}

/**
 * Builds and opens a WhatsApp message link to easily share daily classroom notes
 * with parent and student WhatsApp groups. Never sends useless localhost links.
 */
export function shareNotesToWhatsApp(options: WhatsAppShareOptions = {}): string {
  const lang = options.language || "en";
  const title = options.boardTitle || options.subject || "Classroom Whiteboard Notes";
  const dateStr = options.date || new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Verify URL is a valid public web link (not localhost or local file)
  const isPublicUrl =
    options.shareUrl &&
    options.shareUrl.startsWith("http") &&
    !options.shareUrl.includes("localhost") &&
    !options.shareUrl.includes("127.0.0.1") &&
    !options.shareUrl.includes("::1");

  let text = "";
  if (lang === "hi") {
    text = `📚 *दैनिक कक्षा नोट्स और सारांश (Daily Class Notes)*\n` +
      `🏫 *विषय (Subject):* ${title}\n` +
      `🗓️ *दिनांक (Date):* ${dateStr}\n` +
      (options.summary ? `📝 *मुख्य बिंदु:* ${options.summary}\n` : "") +
      (isPublicUrl ? `🔗 *नोट्स PDF डाउनलोड करें:* ${options.shareUrl}\n\n` : `📋 *स्मार्ट बोर्ड नोट्स कक्षा में सुरक्षित हैं*\n\n`) +
      `_Slate Smart Board द्वारा साझा किया गया_`;
  } else if (lang === "mr") {
    text = `📚 *दैनंदिन वर्ग नोट्स आणि सारांश (Daily Class Notes)*\n` +
      `🏫 *विषय (Subject):* ${title}\n` +
      `🗓️ *दिनांक (Date):* ${dateStr}\n` +
      (options.summary ? `📝 *महत्त्वाचे मुद्दे:* ${options.summary}\n` : "") +
      (isPublicUrl ? `🔗 *नोट्स PDF डाउनलोड करा:* ${options.shareUrl}\n\n` : `📋 *स्मार्ट बोर्ड नोट्स वर्गात सुरक्षित आहेत*\n\n`) +
      `_Slate Smart Board द्वारे पाठवले_`;
  } else {
    text = `📚 *Daily Classroom Notes & Lesson Summary*\n` +
      `🏫 *Class / Subject:* ${title}\n` +
      `🗓️ *Date:* ${dateStr}\n` +
      (options.summary ? `📝 *Key Topics Covered:* ${options.summary}\n` : "") +
      (isPublicUrl ? `🔗 *Download Public Notes PDF:* ${options.shareUrl}\n\n` : `📋 *Notes saved on Classroom Smart Board*\n\n`) +
      `_Shared directly from Slate Interactive Smart Board_`;
  }

  const encoded = encodeURIComponent(text);
  const waUrl = `https://wa.me/?text=${encoded}`;

  if (typeof window !== "undefined") {
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  return waUrl;
}
